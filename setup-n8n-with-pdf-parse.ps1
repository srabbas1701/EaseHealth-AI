# Setup n8n with pdf-parse - Run this whenever you recreate the n8n container
# This script ensures pdf-parse is properly installed

Write-Host "🔄 Setting up n8n with pdf-parse..." -ForegroundColor Cyan

# Stop existing container
Write-Host "⏹️  Stopping existing n8n container..." -ForegroundColor Yellow
docker stop n8n 2>$null

# Remove old container
Write-Host "🗑️  Removing old container..." -ForegroundColor Yellow
docker rm n8n 2>$null

# Start fresh n8n container with pdf-parse baked in (using original working image)
Write-Host "🚀 Starting n8n container with pdf-parse..." -ForegroundColor Green
docker run -d --name n8n --restart unless-stopped -p 5678:5678 -v n8n_data:/home/node/.n8n local/n8n:with-pdfparse

# Wait for n8n to start
Write-Host "⏳ Waiting for n8n to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verify pdf-parse is available (it's baked into the image)
Write-Host "✅ Verifying pdf-parse..." -ForegroundColor Green
$verification = docker exec n8n node -e "process.chdir('/home/node/.n8n'); try { require('pdf-parse'); console.log('SUCCESS'); } catch(e) { console.log('FAILED'); }"

if ($verification -match "SUCCESS") {
    Write-Host "✅ pdf-parse is ready!" -ForegroundColor Green
}
else {
    Write-Host "❌ pdf-parse not found!" -ForegroundColor Red
    exit 1
}

# Final check
$portCheck = Test-NetConnection -ComputerName localhost -Port 5678 -InformationLevel Quiet
if ($portCheck) {
    Write-Host ""
    Write-Host "✅ ✅ ✅ n8n is ready with pdf-parse installed! ✅ ✅ ✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access n8n at: http://localhost:5678" -ForegroundColor Cyan
    Write-Host ""
}
else {
    Write-Host "❌ n8n is not responding on port 5678" -ForegroundColor Red
    exit 1
}


