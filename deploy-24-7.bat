@echo off
REM VibeShop — 24/7 backend (Render) + frontend (Netlify)
echo.
echo === 1. GitHub (brauzerda) ===
echo   https://github.com/new  - repo: VibeShop (Public)
echo   Upload all files OR: gh auth login ^&^& gh repo create VibeShop --public --push
echo.
echo === 2. Render (brauzerda, BEPUL, karta shart emas) ===
echo   https://dashboard.render.com/select-repo?type=blueprint
echo   Repo tanlang - render.yaml avtomatik
echo   Environment Variables qo'shing (.env dan):
echo     BOT_TOKEN, ADMIN_IDS, CARD_NUMBER, CARD_HOLDER
echo     WEBAPP_URL=https://vibe-shop-uz.netlify.app
echo     SERVE_WEBAPP=false
echo.
echo === 3. Deploy tugagach ===
echo   Render URL: https://vibeshop-api.onrender.com
echo   Netlify env: API_URL=shu URL
echo   npx netlify-cli deploy --prod --build
echo.
start https://github.com/new
start https://dashboard.render.com/select-repo?type=blueprint
pause
