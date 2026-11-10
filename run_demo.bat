@echo off
title PayBridge AI - Cross-Border Trade Workflow Prototype
color 0A

echo ==============================================================================
echo       PayBridge AI: Cross-Border Trade Prototype & PayPal Sandbox Demo
echo ==============================================================================
echo.

echo [*] Checking Node.js environment...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is required but was not found in PATH.
    pause
    exit /b 1
)

echo [*] Starting PayBridge AI Backend & Frontend Development Servers...
start "PayBridge Backend (Port 3001)" /min cmd /c "cd /d %~dp0\server && npm run dev"
timeout /t 2 /nobreak >nul

start "PayBridge Frontend (Port 5173)" /min cmd /c "cd /d %~dp0\client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ==============================================================================
echo [STARTED] PayBridge AI local prototype servers launched.
echo.
echo   - Frontend URL:            http://localhost:5173
echo   - Backend REST API:        http://localhost:3001
echo   - Ledger Mode:             In-memory demo ledger (Fabric UI uses fixtures)
echo   - PayPal / AI / Elastic:   Uses .env / client/.env when configured; otherwise simulation
echo.
echo Press any key in this window to stop all PayBridge services...
echo ==============================================================================
pause >nul

echo [*] Terminating PayBridge services...
taskkill /fi "WINDOWTITLE eq PayBridge Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq PayBridge Frontend*" /f >nul 2>&1
echo [OK] All PayBridge services stopped cleanly.
timeout /t 2 /nobreak >nul
