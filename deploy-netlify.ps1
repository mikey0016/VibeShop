# Netlify: vibe-shop.netlify.app
# Render:  vibeshop-api.onrender.com

param(
    [string]$SiteName = "vibe-shop"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== 1/3 Netlify login ===" -ForegroundColor Cyan
npx --yes netlify-cli login
if ($LASTEXITCODE -ne 0) { throw "Netlify login failed" }

Write-Host "=== 2/3 Site yaratish: $SiteName.netlify.app ===" -ForegroundColor Cyan
npx --yes netlify-cli sites:create --name $SiteName 2>&1 | Write-Host

if (-not (Test-Path ".netlify")) {
    npx --yes netlify-cli init --manual --name $SiteName 2>&1 | Write-Host
}

Write-Host "=== 3/3 Production deploy ===" -ForegroundColor Cyan
npx --yes netlify-cli deploy --prod --build
if ($LASTEXITCODE -ne 0) { throw "Netlify deploy failed" }

Write-Host ""
Write-Host "Frontend tayyor: https://$SiteName.netlify.app" -ForegroundColor Green
Write-Host ""
Write-Host "Keyingi qadam - Render backend:" -ForegroundColor Yellow
Write-Host "  1. https://dashboard.render.com - New - Blueprint"
Write-Host "  2. GitHub repo ulang"
Write-Host "  3. BOT_TOKEN va ADMIN_IDS ni Environment ga qoshng"
Write-Host "  4. WEBAPP_URL = https://$SiteName.netlify.app"
Write-Host "  5. BotFather: /setmenubutton - shu URL"
