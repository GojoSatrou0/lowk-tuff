@echo off
setlocal
cd /d "%~dp0"
title Open World Physics Lab - Local Only
where py >nul 2>nul
if %errorlevel%==0 (py -3 start_game.py & goto :end)
where python >nul 2>nul
if %errorlevel%==0 (python start_game.py & goto :end)
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" ("%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" start_game.py & goto :end)
echo Python could not be found.
pause
:end
endlocal
