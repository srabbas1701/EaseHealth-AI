# Quick Test Script - Verify pdf-parse is Working
# Run this BEFORE testing in your app

Write-Host "`n🔍 Testing pdf-parse installation...`n" -ForegroundColor Cyan

# Test 1: Check files exist
Write-Host "Test 1: Checking files..." -ForegroundColor Yellow
$global = docker exec n8n test -d /home/node/node_modules/pdf-parse 2>$null; $?
$local = docker exec n8n test -d /home/node/.n8n/node_modules/pdf-parse 2>$null; $?

if ($global) {
    Write-Host "  ✅ Global installation exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Global installation missing!" -ForegroundColor Red
}

if ($local) {
    Write-Host "  ✅ Local (.n8n) installation exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Local installation missing!" -ForegroundColor Red
}

# Test 2: Check if module can be loaded
Write-Host "`nTest 2: Checking module loading..." -ForegroundColor Yellow
$result = docker exec n8n node -e "process.chdir('/home/node/.n8n'); try { require('pdf-parse'); console.log('OK'); } catch(e) { console.log('FAIL'); }" 2>$null

if ($result -match "OK") {
    Write-Host "  ✅ pdf-parse can be loaded!" -ForegroundColor Green
} else {
    Write-Host "  ❌ pdf-parse cannot be loaded!" -ForegroundColor Red
}

# Test 3: Check n8n is running
Write-Host "`nTest 3: Checking n8n status..." -ForegroundColor Yellow
$n8nRunning = Test-NetConnection -ComputerName localhost -Port 5678 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($n8nRunning) {
    Write-Host "  ✅ n8n is running on port 5678" -ForegroundColor Green
} else {
    Write-Host "  ❌ n8n is not responding!" -ForegroundColor Red
}

# Summary
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($global -and $local -and ($result -match "OK") -and $n8nRunning) {
    Write-Host "✅ ALL TESTS PASSED! Ready to generate AI summaries!" -ForegroundColor Green
    Write-Host "`n🚀 Go to your app and test: http://localhost:5173" -ForegroundColor Cyan
} else {
    Write-Host "❌ SOME TESTS FAILED - Check errors above" -ForegroundColor Red
    Write-Host "`nTry running: docker restart n8n" -ForegroundColor Yellow
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan




