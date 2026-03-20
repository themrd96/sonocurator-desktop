@echo off
echo ============================================
echo   SonoCurator Desktop App Builder
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Download it from https://nodejs.org ^(pick the LTS version^)
    echo.
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Rebuilding native modules for Electron...
call npx electron-builder install-app-deps
if %errorlevel% neq 0 (
    echo ERROR: Failed to rebuild native modules.
    pause
    exit /b 1
)

echo.
echo [3/3] Building SonoCurator.exe...
call npx electron-builder --win portable
if %errorlevel% neq 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo Your .exe file is in the "release" folder.
echo Look for: SonoCurator-2.0.0-Portable.exe
echo.
echo Just double-click it to run — no installation needed.
echo.
pause
