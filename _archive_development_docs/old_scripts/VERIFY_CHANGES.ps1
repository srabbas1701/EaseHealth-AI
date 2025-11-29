# ============================================
# VERIFICATION SCRIPT: Check Cloud n8n Setup
# ============================================

Write-Host "🔍 Verifying Cloud n8n Migration..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Verify backup files exist
Write-Host "✓ Check 1: Backup files" -ForegroundColor Yellow
if (Test-Path "src\components\PatientTab\index.tsx.backup") {
    Write-Host "  ✅ index.tsx.backup exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  index.tsx.backup NOT found" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path ".envold") {
    Write-Host "  ✅ .envold exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .envold NOT found" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 2: Verify .env has cloud URLs
Write-Host "✓ Check 2: .env configuration" -ForegroundColor Yellow
$envContent = Get-Content .env -Raw
if ($envContent -match "n8n\.srv945278\.hstgr\.cloud") {
    Write-Host "  ✅ Cloud n8n URL found in .env" -ForegroundColor Green
    $cloudUrls = Get-Content .env | Select-String "n8n.srv945278.hstgr.cloud"
    foreach ($url in $cloudUrls) {
        Write-Host "     $url" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ Cloud n8n URL NOT found in .env" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 3: Verify index.tsx changes
Write-Host "✓ Check 3: index.tsx modifications" -ForegroundColor Yellow
$indexContent = Get-Content "src\components\PatientTab\index.tsx" -Raw
if ($indexContent -match "import\.meta\.env\.VITE_N8N_AI_SUMMARY_WEBHOOK" -and 
    $indexContent -notmatch "\(import\.meta as any\)") {
    Write-Host "  ✅ index.tsx correctly updated (removed 'as any' cast)" -ForegroundColor Green
} else {
    Write-Host "  ❌ index.tsx might not be correctly updated" -ForegroundColor Red
    $allGood = $false
}

if ($indexContent -match "DEBUG: Webhook URL") {
    Write-Host "  ✅ Debug logging added" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Debug logging NOT found" -ForegroundColor Yellow
}

Write-Host ""

# Check 4: Verify vite-env.d.ts
Write-Host "✓ Check 4: TypeScript definitions" -ForegroundColor Yellow
$viteEnvContent = Get-Content "src\vite-env.d.ts" -Raw
if ($viteEnvContent -match "VITE_N8N_AI_SUMMARY_WEBHOOK") {
    Write-Host "  ✅ TypeScript env definitions present" -ForegroundColor Green
} else {
    Write-Host "  ❌ TypeScript env definitions missing" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Check 5: Verify rollback script exists
Write-Host "✓ Check 5: Rollback preparation" -ForegroundColor Yellow
if (Test-Path "ROLLBACK_TO_LOCAL_N8N.ps1") {
    Write-Host "  ✅ Rollback script ready" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Rollback script NOT found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Restart dev server: npm run dev" -ForegroundColor White
    Write-Host "   2. Open browser in incognito mode" -ForegroundColor White
    Write-Host "   3. Test AI Summary feature" -ForegroundColor White
    Write-Host "   4. Check browser console for debug logs" -ForegroundColor White
    Write-Host "   5. Verify Network tab shows cloud n8n URL" -ForegroundColor White
} else {
    Write-Host "⚠️  SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host "   Please review the issues above" -ForegroundColor Yellow
    Write-Host "   Run .\ROLLBACK_TO_LOCAL_N8N.ps1 if needed" -ForegroundColor Yellow
}

Write-Host ""


