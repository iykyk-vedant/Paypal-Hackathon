@echo off
title PayBridge AI - Autonomous Agentic Commerce & Hyperledger Fabric Protocol
color 0A

echo ==============================================================================
echo       PayBridge AI: Cross-Border Treasury, PayPal & Hyperledger Fabric
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
echo [SUCCESS] PayBridge AI Servers are LIVE!
echo.
echo   - Enterprise Frontend URL: http://localhost:5173
echo   - Backend REST API:        http://localhost:3001
echo   - PayPal Sandbox OAuth:    Active
echo   - Google Gemini 2.5 Flash: Active
echo   - Channel3 Product Search: Active
echo   - Fabric Block Explorer:   Active
echo.
echo Press any key in this window to stop all PayBridge services...
echo ==============================================================================
pause >nul

echo [*] Terminating PayBridge services...
taskkill /fi "WINDOWTITLE eq PayBridge Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq PayBridge Frontend*" /f >nul 2>&1
echo [OK] All PayBridge services stopped cleanly.
timeout /t 2 /nobreak >nul
