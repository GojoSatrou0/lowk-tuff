@echo off
setlocal
cd /d "%~dp0"
title Open World Physics Lab - LAN Multiplayer

echo.
echo Starting the game with the built-in LAN multiplayer relay...
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    py -3 lan_server.py
    goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
    python lan_server.py
    goto :end
)
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" lan_server.py
    goto :end
)
echo.
echo Python could not be found.
echo.
pause
:end
endlocal
