@echo off
setlocal
cd /d "%~dp0"
title Velocity Arena
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
call npm.cmd ls --omit=dev --depth=0 >nul 2>nul
if errorlevel 1 (
  call npm.cmd ci --omit=dev --ignore-scripts
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection.
    pause
    exit /b 1
  )
)
echo Open http://localhost:3000 in Chrome or Edge.
node server.js
pause
