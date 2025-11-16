// SMART PDF TEXT EXTRACTION - Stops at "End Of Report" markers
// This version intelligently detects report end markers and stops reading there
// Prevents useless content (disclaimers, legal text, blank pages) from being sent to AI

const CONFIG = {
    simulateMissingBinary: false,
    testRequireOnly: false,
    testParseOnly: false,
    forcePdfParseFail: false,
    saveTempFile: false,
    saveTempFileViaEnv: false,
    saveTempKeepOriginalName: true,
    parseTextPreviewLimit: 1000,
    maxTextLength: 500000,

    // NEW: Smart truncation settings
    enableSmartTruncation: true,  // Set to false to disable
    endMarkers: [
        '*** End Of Report ***',
        '***End Of Report***',
        '*** END OF REPORT ***',
        '**End of Report**',
        '-- End of Report --',
        'END OF REPORT',
        '=== End of Report ===',
        '### End Of Report ###'
    ]
};

const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = { ...item.json, extracted_text: '', extraction_method: 'unknown', extraction_success: false, debug_logs: [], smart_truncation_applied: false };

    function pushDebug(v) {
        try {
            result.debug_logs.push(typeof v === 'string' ? v : JSON.stringify(v));
            console.log('[ExtractPDF Debug]', v);
        } catch (e) { }
    }

    try {
        if (CONFIG.simulateMissingBinary) {
            throw new Error('CONFIG.simulateMissingBinary=true; skipping');
        }

        const binaryData = item.binary?.data;
        if (!binaryData) {
            throw new Error('No binary data found in item');
        }

        let buffer;
        if (Buffer.isBuffer(binaryData.data)) {
            buffer = binaryData.data;
        } else if (typeof binaryData.data === 'string') {
            buffer = Buffer.from(binaryData.data, 'base64');
        } else {
            throw new Error('Unexpected binaryData.data type: ' + typeof binaryData.data);
        }

        pushDebug({ buffer_length: buffer.length, buffer_type: typeof buffer });

        if (CONFIG.testRequireOnly) {
            pushDebug('CONFIG.testRequireOnly=true -> just checking module availability');
            result.extracted_text = '[testRequireOnly mode]';
            result.extraction_method = 'test-only';
            result.extraction_success = true;
            results.push({ json: result });
            continue;
        }

        // Try to load pdf-parse
        let pdfParse = null;
        const requirePaths = [
            'pdf-parse',
            '/home/node/.n8n/node_modules/pdf-parse',
            '/usr/local/lib/node_modules/pdf-parse'
        ];

        for (const rPath of requirePaths) {
            try {
                pdfParse = require(rPath);
                pushDebug(`✅ Successfully loaded pdf-parse from: ${rPath}`);
                break;
            } catch (e) {
                pushDebug(`Failed to load from ${rPath}: ${e.message}`);
            }
        }

        if (!pdfParse) {
            pushDebug('⚠️ pdf-parse not available; PDF will be sent to OCR route');
            result.error = 'pdf-parse not available. PDF requires OCR processing.';
            result.extraction_method = 'failed-needs-ocr';
            result.extraction_success = false;
            result.requiresOCR = true;
            results.push({ json: result });
            continue;
        }

        // Parse with pdf-parse
        if (CONFIG.testParseOnly) pushDebug('CONFIG.testParseOnly=true -> running pdf-parse then returning');
        try {
            if (CONFIG.forcePdfParseFail) throw new Error('Forced parse failure');

            const t0 = Date.now();

            // Handle different pdf-parse export formats
            const parseFunction = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
            pushDebug({ pdfParseType: typeof pdfParse, parseFunctionType: typeof parseFunction });

            if (typeof parseFunction !== 'function') {
                throw new Error('pdf-parse loaded but not callable. Type: ' + typeof pdfParse);
            }

            const parsed = await parseFunction(buffer);
            const t1 = Date.now();
            let text = (parsed && parsed.text) ? String(parsed.text) : '';

            pushDebug(`📄 Original extracted text length: ${text.length} characters`);

            // ===== SMART TRUNCATION: Check for "End Of Report" markers =====
            if (CONFIG.enableSmartTruncation && text.length > 0) {
                let earliestEndPosition = -1;
                let foundMarker = null;

                // Check each end marker
                for (const marker of CONFIG.endMarkers) {
                    const pos = text.indexOf(marker);
                    if (pos !== -1) {
                        if (earliestEndPosition === -1 || pos < earliestEndPosition) {
                            earliestEndPosition = pos;
                            foundMarker = marker;
                        }
                    }
                }

                // If found, truncate at that position
                if (earliestEndPosition !== -1 && foundMarker) {
                    const originalLength = text.length;
                    // Keep text up to and including the marker + a bit more context
                    const cutoffPosition = earliestEndPosition + foundMarker.length + 50;
                    text = text.substring(0, cutoffPosition);

                    result.smart_truncation_applied = true;
                    result.end_marker_found = foundMarker;
                    result.end_marker_position = earliestEndPosition;
                    result.original_text_length = originalLength;
                    result.truncated_text_length = text.length;
                    result.characters_removed = originalLength - text.length;

                    pushDebug(`✂️ SMART TRUNCATION: Found "${foundMarker}" at position ${earliestEndPosition}`);
                    pushDebug(`✂️ Truncated from ${originalLength} to ${text.length} chars (removed ${originalLength - text.length} chars)`);
                    pushDebug(`✂️ Token savings: ~${Math.ceil((originalLength - text.length) / 4)} tokens`);
                }
            }
            // ===== END SMART TRUNCATION =====

            // Apply hard limit after smart truncation
            if (text.length > CONFIG.maxTextLength) {
                pushDebug(`⚠️ Text still exceeds max length. Truncating from ${text.length} to ${CONFIG.maxTextLength} chars`);
                text = text.substring(0, CONFIG.maxTextLength) + '\n\n[Content truncated to prevent token overflow]';
            }

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
                result.extraction_method = result.smart_truncation_applied ? 'pdf-parse-smart-truncated' : 'pdf-parse';
                result.extraction_success = true;
                results.push({ json: result });
                continue;
            } else {
                result.pdf_parse_error = 'pdf-parse returned empty text (likely scanned PDF or no text objects).';
                pushDebug('pdf-parse returned empty text - will try OCR route');
                if (CONFIG.testParseOnly) {
                    results.push({ json: result });
                    continue;
                }
            }
        } catch (e) {
            result.pdf_parse_error = e && e.message ? e.message : String(e);
            result.pdf_parse_stack = e && e.stack ? e.stack : null;
            pushDebug({ pdf_parse_error: result.pdf_parse_error });
            if (CONFIG.testParseOnly) {
                results.push({ json: result });
                continue;
            }
        }

        // If we reach here, extraction failed - mark for OCR
        result.error = 'pdf-parse not available or failed. PDF requires OCR processing.';
        result.extraction_method = 'failed-needs-ocr';
        result.extraction_success = false;
        result.requiresOCR = true;
        pushDebug('❌ PDF text extraction failed - flagging for OCR');
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

