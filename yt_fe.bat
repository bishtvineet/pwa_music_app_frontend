@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        Building and Deploying to Cloudflare Pages       
echo ========================================================
echo.

:: Ensure we are running from the script's directory
cd /d "%~dp0"

:: Step 1: Build the production bundle
echo [*] Running production build (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed! Aborting deployment.
    pause
    exit /b %errorlevel%
)

echo.
echo [*] Build successful.

:: Step 2: Deploy to Cloudflare Pages
echo [*] Deploying dist/ to Cloudflare Pages (yt-audio-pwa)...
call npx wrangler pages deploy dist --project-name yt-audio-pwa --commit-dirty=true
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo  Deployment complete!
echo  Live URL: https://yt-audio-pwa.pages.dev
echo ========================================================
echo.

pause