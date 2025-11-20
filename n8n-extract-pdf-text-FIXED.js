// Extract PDF Text - FIXED VERSION with Correct Module Loading
// Copy this entire code into your "Extract PDF Text" node in n8n

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

        // FIXED: Try to resolve pdf-parse with better module resolution
        const requireAttempts = [];
        function tryRequireLogged(nameOrPath) {
            try {
                // Save and change to .n8n directory for better module resolution
                const originalDir = process.cwd();
                try {
                    process.chdir('/home/node/.n8n');
                } catch (e) {
                    pushDebug('Could not chdir to /home/node/.n8n: ' + e.message);
                }

                const mod = require(nameOrPath);

                // Restore original directory
                try {
                    process.chdir(originalDir);
                } catch (e) { }

                requireAttempts.push({ path: nameOrPath, ok: true, type: typeof mod });
                return mod;
            } catch (e) {
                requireAttempts.push({ path: nameOrPath, ok: false, message: e && e.message ? e.message : String(e) });
                return null;
            }
        }

        let pdfParse = tryRequireLogged('pdf-parse');
        if (!pdfParse) {
            pdfParse = tryRequireLogged('/home/node/.n8n/node_modules/pdf-parse');
        }
        if (!pdfParse) {
            pdfParse = tryRequireLogged('/home/node/node_modules/pdf-parse');
        }

        result.require_attempts = requireAttempts;
        result.pdf_parse_resolved = !!pdfParse;
        pushDebug({ pdf_parse_resolved: result.pdf_parse_resolved, attempts: requireAttempts });

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
            pushDebug({ pdf_header_found: result.binary_preview.pdf_header_found });
        } catch (e) {
            pushDebug('Error sampling header: ' + String(e));
        }

        // Parse with pdf-parse
        if (pdfParse) {
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

                // Truncate if too long
                if (text.length > CONFIG.maxTextLength) {
                    pushDebug(`⚠️ Text truncated from ${text.length} to ${CONFIG.maxTextLength} chars`);
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
                    result.extraction_method = 'pdf-parse';
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
        } else {
            pushDebug('⚠️ pdf-parse not available; PDF will be sent to OCR route');
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




