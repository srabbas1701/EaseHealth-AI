# ============================================
# ROLLBACK SCRIPT: Switch Back to Local n8n
# ============================================
# Run this script if you want to go back to using local n8n (localhost:5678)

Write-Host "🔄 Rolling back to LOCAL n8n setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Restore the backup of index.tsx (if it exists)
if (Test-Path "src\components\PatientTab\index.tsx.backup") {
    Write-Host "📁 Restoring index.tsx from backup..." -ForegroundColor Yellow
    Copy-Item "src\components\PatientTab\index.tsx.backup" "src\components\PatientTab\index.tsx" -Force
    Write-Host "✅ index.tsx restored!" -ForegroundColor Green
} else {
    Write-Host "⚠️  No backup found for index.tsx (file was probably not modified)" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Restore ALL .env files to local settings
Write-Host "📁 Restoring all .env files to local n8n settings..." -ForegroundColor Yellow

if (Test-Path ".envold") {
    Copy-Item ".envold" ".env" -Force
    Write-Host "  ✅ .env restored!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .envold not found!" -ForegroundColor Red
}

if (Test-Path ".env.development.local.backup") {
    Copy-Item ".env.development.local.backup" ".env.development.local" -Force
    Write-Host "  ✅ .env.development.local restored!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .env.development.local.backup not found!" -ForegroundColor Red
}

if (Test-Path ".env.production.backup") {
    Copy-Item ".env.production.backup" ".env.production" -Force
    Write-Host "  ✅ .env.production restored!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .env.production.backup not found!" -ForegroundColor Red
}

Write-Host ""

# Step 3: Instructions for vite.config.ts
Write-Host "📝 MANUAL STEP REQUIRED:" -ForegroundColor Magenta
Write-Host "   1. Open vite.config.ts" -ForegroundColor White
Write-Host "   2. UNCOMMENT the proxy configuration (lines 15-56)" -ForegroundColor White
Write-Host "   3. Save the file" -ForegroundColor White

Write-Host ""

# Step 4: Clear cache
Write-Host "🧹 Clearing Vite cache..." -ForegroundColor Yellow
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Cache cleared!" -ForegroundColor Green

Write-Host ""

# Step 5: Restart instructions
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Make sure local n8n is running: .\setup-n8n-with-pdf-parse.ps1" -ForegroundColor White
Write-Host "   2. Restart dev server: npm run dev" -ForegroundColor White
Write-Host "   3. Update Supabase webhook to ngrok or localhost URL" -ForegroundColor White

Write-Host ""
Write-Host "✅ Rollback preparation complete!" -ForegroundColor Green
Write-Host ""

