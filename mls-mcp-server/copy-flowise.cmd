@echo off
:: Create local Flowise directory if needed
if not exist "%~dp0Flowise" mkdir "%~dp0Flowise"

:: Copy essential files from user's Flowise directory
xcopy /Y "%USERPROFILE%\.flowise\*" "%~dp0Flowise\"

:: Verify files were copied
echo Copied:
dir "%~dp0Flowise\"
