@echo off
title ScholarAccess Demo
cd /d "%~dp0"
echo Starting ScholarAccess. First run may take a few minutes to install packages.
if not exist "node_modules" call npm.cmd install
if errorlevel 1 (
  echo.
  echo Install failed. Check your internet connection and make sure Node.js is installed.
  pause
  exit /b 1
)
echo.
echo When ready, open http://localhost:5173 in your browser.
echo Press Ctrl+C in this window to stop the demo.
echo.
call npm.cmd run dev
pause
