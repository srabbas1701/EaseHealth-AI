// Quick test to verify pdf-parse is working in n8n
// Run this with: docker exec n8n node /path/to/test-pdf-parse.js

const testPdfParse = async () => {
  console.log('=== Testing pdf-parse ===\n');
  
  try {
    // Test 1: Can we require it?
    const pdfParse = require('pdf-parse');
    console.log('✅ Step 1: pdf-parse module loaded');
    console.log('   Type:', typeof pdfParse);
    
    // Test 2: Can we create a simple PDF buffer and parse it?
    // This is a minimal valid PDF
    const minimalPDF = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000354 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
441
%%EOF`);
    
    console.log('✅ Step 2: Created test PDF buffer');
    console.log('   Size:', minimalPDF.length, 'bytes');
    
    const data = await pdfParse(minimalPDF);
    console.log('✅ Step 3: pdf-parse executed successfully');
    console.log('   Extracted text:', data.text);
    console.log('   Text length:', data.text.length);
    
    if (data.text.includes('Test PDF')) {
      console.log('\n🎉 SUCCESS! pdf-parse is working correctly!\n');
      return true;
    } else {
      console.log('\n⚠️  WARNING: pdf-parse ran but didn\'t extract expected text\n');
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('\nStack:', error.stack);
    return false;
  }
};

testPdfParse().then(success => {
  process.exit(success ? 0 : 1);
});

