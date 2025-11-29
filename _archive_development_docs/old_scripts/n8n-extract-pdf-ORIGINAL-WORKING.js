// Extract PDF Text - YOUR ORIGINAL WORKING CODE
// Use THIS code in your "Extract PDF Text" node

const CONFIG = {
    simulateMissingBinary: false,
    testRequireOnly: false,
    testParseOnly: false,
    forcePdfParseFail: false,
    saveTempFile: false,
    saveTempFileViaEnv: false,
    saveTempKeepOriginalName: true,
    parseTextPreviewLimit: 1000,
};

const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = { ...item.json, extracted_text: '', extraction_method: 'unknown', extraction_success: false, debug_logs: [] };

    function pushDebug(v) {
        try {
            result.debug_logs.push(typeof v === 'string' ? v : JSON.stringify(v));
            console.log('[ExtractPDF Debug]', v);
        } catch (e) { }
    }

    try {
        if (CONFIG.simulateMissingBinary) {
            pushDebug('CONFIG.simulateMissingBinary=true -> simulating missing $binary');
            result.error = 'Simulated missing $binary';
            results.push({ json: result });
            continue;
        }

        // Access binary from the item
        let binEntry = null;
        if (item.binary && typeof item.binary === 'object') {
            const keys = Object.keys(item.binary || {});
            if (keys.length === 0) {
                pushDebug('Found binary object but it contains no keys');
            } else {
                const keyToUse = keys.includes('data') ? 'data' : keys[0];
                binEntry = item.binary[keyToUse];
                pushDebug(`Using binary key: ${keyToUse}`);
                result.binary_key_used = keyToUse;
            }
        } else {
            pushDebug('item.binary missing or not an object');
        }

        if (!binEntry || !binEntry.data) {
            result.error = 'No binary data found on property "data" (or detected binary key).';
            pushDebug({ binEntryExists: !!binEntry, binEntryKeys: binEntry ? Object.keys(binEntry) : null });
            results.push({ json: result });
            continue;
        }

        // Binary preview
        try {
            result.binary_preview = {
                fileName: binEntry.fileName || null,
                fileExtension: binEntry.fileExtension || null,
                mimeType: binEntry.mimeType || null,
                base64_length: typeof binEntry.data === 'string' ? binEntry.data.length : null,
            };
            pushDebug({ binary_preview: result.binary_preview });
        } catch (e) {
            pushDebug('Error building binary_preview: ' + String(e));
        }

        // Try to resolve pdf-parse - SIMPLE VERSION
        let pdfParse = null;
        try {
            pdfParse = require('pdf-parse');
            pushDebug('✅ pdf-parse loaded via require("pdf-parse")');
        } catch (e) {
            pushDebug('❌ Cannot load pdf-parse: ' + e.message);
        }

        result.pdf_parse_resolved = !!pdfParse;
        pushDebug({ pdf_parse_resolved: result.pdf_parse_resolved });

        if (CONFIG.testRequireOnly) {
            pushDebug('CONFIG.testRequireOnly=true -> returning require results only');
            results.push({ json: result });
            continue;
        }

        // Decode base64 buffer
        let buffer;
        try {
            buffer = Buffer.from(binEntry.data, 'base64');
            result.binary_preview.byte_length = buffer.length;
            pushDebug('Buffer decoded; length=' + buffer.length);
        } catch (e) {
            result.error = 'Failed to decode base64 binary data.';
            result.decode_error = e && e.message ? e.message : String(e);
            pushDebug('Base64 decode error: ' + result.decode_error);
            results.push({ json: result });
            continue;
        }

        // Sample header bytes
        try {
            const sampleBytes = buffer.slice(0, 128);
            const sampleUtf8 = (() => { try { return sampleBytes.toString('utf8'); } catch (e) { return null; } })();
            const sampleHex = sampleBytes.toString('hex').slice(0, 256);
            const headerFound = buffer.indexOf(Buffer.from('%PDF')) !== -1;
            result.binary_preview.sample_utf8 = sampleUtf8 ? (sampleUtf8.length > 500 ? sampleUtf8.slice(0, 500) + '...' : sampleUtf8) : null;
            result.binary_preview.sample_hex = sampleHex;
            result.binary_preview.pdf_header_found = !!headerFound;
            pushDebug({ pdf_header_found: result.binary_preview.pdf_header_found, sample_utf8: result.binary_preview.sample_utf8 });
        } catch (e) {
            pushDebug('Error sampling header: ' + String(e));
        }

        // Optional temp file save
        try {
            const shouldSave = CONFIG.saveTempFile || (CONFIG.saveTempFileViaEnv && process && process.env && process.env.N8N_DEBUG_SAVE === '1');
            if (shouldSave) {
                const fs = require('fs');
                const os = require('os');
                const path = require('path');
                const namePart = CONFIG.saveTempKeepOriginalName && binEntry.fileName ? ('_' + binEntry.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')) : '';
                const dumpName = `${Date.now()}${namePart || '_debug.pdf'}`;
                const dumpPath = path.join(os.tmpdir(), dumpName);
                fs.writeFileSync(dumpPath, buffer);
                result.binary_preview.saved_to = dumpPath;
                pushDebug('Saved debug PDF to ' + dumpPath);
            }
        } catch (e) {
            pushDebug('Temp file save failed: ' + String(e));
            result.binary_preview && (result.binary_preview.save_error = String(e && e.message ? e.message : e));
        }

        // Parse with pdf-parse
        if (pdfParse) {
            if (CONFIG.testParseOnly) pushDebug('CONFIG.testParseOnly=true -> running pdf-parse then returning');
            try {
                if (CONFIG.forcePdfParseFail) throw new Error('Forced parse failure');

                const t0 = Date.now();
                const parsed = await pdfParse(buffer);
                const t1 = Date.now();
                const text = (parsed && parsed.text) ? String(parsed.text) : '';
                result.pdf_parse_info = {
                    parse_time_ms: t1 - t0,
                    text_length: text.length,
                    text_preview: text ? (text.length > CONFIG.parseTextPreviewLimit ? text.slice(0, CONFIG.parseTextPreviewLimit) + '...' : text) : '',
                    info: parsed.info || null,
                    metadata: parsed.metadata || null,
                };
                pushDebug({ pdf_parse_info: result.pdf_parse_info });

                if (text && text.length > 0) {
                    result.extracted_text = text;
                    result.extraction_method = 'pdf-parse';
                    result.extraction_success = true;
                    results.push({ json: result });
                    continue;
                } else {
                    result.pdf_parse_error = 'pdf-parse returned empty text (likely scanned PDF or no text objects).';
                    pushDebug('pdf-parse returned empty text');
                    if (CONFIG.testParseOnly) {
                        results.push({ json: result });
                        continue;
                    }
                }
            } catch (e) {
                result.pdf_parse_error = e && e.message ? e.message : String(e);
                result.pdf_parse_stack = e && e.stack ? e.stack : null;
                pushDebug({ pdf_parse_error: result.pdf_parse_error, stack: result.pdf_parse_stack });
                if (CONFIG.testParseOnly) {
                    results.push({ json: result });
                    continue;
                }
            }
        } else {
            pushDebug('pdf-parse not available; skipping parse step');
        }

        // Fallback: binary sniff
        try {
            const ascii = buffer.toString('binary').replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ').trim();
            result.sniff_preview = ascii ? (ascii.length > 500 ? ascii.slice(0, 500) + '...' : ascii) : '';
            pushDebug('Binary-sniff preview length: ' + (result.sniff_preview ? result.sniff_preview.length : 0));
            if (ascii && ascii.length > 100) {
                result.extracted_text = ascii;
                result.extraction_method = 'binary-sniff';
                result.extraction_success = true;
                results.push({ json: result });
                continue;
            }
        } catch (e) {
            result.sniff_error = e && e.message ? e.message : String(e);
            pushDebug('Binary sniff error: ' + result.sniff_error);
        }

        result.error = 'PDF appears to have no extractable text; OCR is required.';
        result.extraction_method = result.extraction_method || 'none';
        result.extraction_success = false;
        pushDebug('No extractable text found; recommend OCR');
        results.push({ json: result });

    } catch (err) {
        result.error = err && err.message ? err.message : String(err);
        result.extraction_success = false;
        result.unhandled_stack = err && err.stack ? err.stack : null;
        pushDebug('Unhandled exception: ' + result.error);
        results.push({ json: result });
    }
}

return results;





