@echo off
setlocal
cd /d "%~dp0"
echo Velocity Arena - Netlify frontend builder
echo First deploy the Node backend using docs\NETLIFY.md.
set /p ARENA_SERVER_URL=Paste the backend HTTPS URL: 
call npm.cmd ci --omit=dev --ignore-scripts
if errorlevel 1 (
  pause
  exit /b 1
)
call npm.cmd run build:netlify
if errorlevel 1 (
  pause
  exit /b 1
)
echo Upload the generated dist folder to your existing Netlify site.
pause
