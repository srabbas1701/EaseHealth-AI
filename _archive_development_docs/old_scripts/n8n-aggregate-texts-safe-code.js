// SAFE Aggregate Texts Code - Use this in your "Aggregate Texts" node
// This prevents token overflow and detects PDF extraction failures

const items = $input.all();
let full = '';
let counted = 0;

// SAFETY LIMIT: Max 400k chars (~100k tokens with safety margin)
const MAX_CHARS = 400000;
const MAX_SINGLE_REPORT = 200000;

items.forEach((it, idx) => {
  let text = (it.json.extracted_text || '').trim();
  if (!text) return;
  
  // DETECT if text is PDF garbage (binary-sniff fallback output)
  const isPDFGarbage = text.startsWith('%PDF') || 
                       text.includes('/Type /Page') || 
                       text.includes('endobj') ||
                       text.includes('/Filter /FlateDecode');
  
  if (isPDFGarbage) {
    console.log(`⚠️ WARNING: Report ${idx + 1} (${it.json.report_name}) has corrupted extraction - PDF structure detected instead of text`);
    text = `[ERROR: PDF text extraction failed for ${it.json.report_name || 'this report'}. The PDF may be image-based or corrupted. OCR or manual review required.]`;
  }
  
  const name = it.json.report_name || `Report ${idx + 1}`;
  const type = it.json.report_type || 'Unknown';
  const date = it.json.upload_date || 'Unknown';
  
  let section = `\n\n--- ${name} ---\nType: ${type}\nDate: ${date}\n\n`;
  
  // Truncate individual report if too long
  if (text.length > MAX_SINGLE_REPORT) {
    const originalLength = text.length;
    text = text.substring(0, MAX_SINGLE_REPORT) + '\n\n[... Report content truncated from ' + originalLength + ' to ' + MAX_SINGLE_REPORT + ' characters to prevent token overflow ...]';
    console.log(`⚠️ Truncated ${name} from ${originalLength} to ${MAX_SINGLE_REPORT} chars`);
  }
  
  section += text + '\n';
  
  // Check if adding this section would exceed total limit
  if ((full + section).length > MAX_CHARS) {
    console.log(`⚠️ Stopping aggregation at report ${idx + 1} - would exceed ${MAX_CHARS} char limit`);
    full += '\n\n[... Additional reports omitted to prevent token overflow. Total reports processed: ' + counted + ' ...]';
    return;
  }
  
  full += section;
  counted++;
});

const finalText = full.trim();
const wasTruncated = finalText.includes('truncated') || finalText.includes('omitted');

console.log(`✅ Aggregated ${counted} reports`);
console.log(`📊 Total characters: ${finalText.length}`);
console.log(`⚠️ Was truncated: ${wasTruncated}`);

return [{
  json: {
    ...$json,
    aggregated_text: finalText,
    reports_included: counted,
    was_truncated: wasTruncated,
    final_char_count: finalText.length,
    estimated_tokens: Math.ceil(finalText.length / 4)
  }
}];






