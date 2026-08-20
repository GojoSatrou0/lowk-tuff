@echo off
setlocal
cd /d "%~dp0"
set /p RELAY=Paste your public HTTPS relay URL: 
if "%RELAY%"=="" goto :end
powershell -NoProfile -Command "$p='multiplayer-config.js';$s=Get-Content -Raw $p;$s=[regex]::Replace($s,'window\.OWPL_RELAY_URL\s*=\s*\".*?\";','window.OWPL_RELAY_URL = \"%RELAY%\";');Set-Content -NoNewline -Encoding UTF8 $p $s"
echo Relay URL saved.
pause
:end
endlocal
