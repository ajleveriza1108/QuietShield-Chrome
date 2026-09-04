@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title QuietShield Chrome 1.0.9 R10 Publisher

set "QS_LOGROOT=D:\QuietShield-Chrome-Logs"
if not exist "D:\" set "QS_LOGROOT=%LOCALAPPDATA%\QuietShield\Chrome\Logs"
if not exist "%QS_LOGROOT%" mkdir "%QS_LOGROOT%" >nul 2>&1

for /f %%I in ('powershell.exe -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "QS_STAMP=%%I"
if not defined QS_STAMP set "QS_STAMP=unknown-time"

set "QS_LOG=%QS_LOGROOT%\QuietShield-Chrome-1.0.9-R10-%QS_STAMP%.log"
set "QS_LATEST=%QS_LOGROOT%\LATEST.log"
set "QS_PS1=%~dp0scripts\PUBLISH-QUIETSHIELD-CHROME-R10.ps1"
set "QS_PARSE_TMP=%TEMP%\QuietShield-Chrome-R10-parser-%RANDOM%-%RANDOM%.txt"

>"%QS_LOG%" echo ============================================================
>>"%QS_LOG%" echo QuietShield Chrome 1.0.9 R10 - DURABLE PUBLISHER LOG
>>"%QS_LOG%" echo Started: %DATE% %TIME%
>>"%QS_LOG%" echo Launcher: %~f0
>>"%QS_LOG%" echo ============================================================

cls
echo ============================================================
echo QuietShield Chrome 1.0.9 R10 - CLEAN BUILD + TWO-REPO PUBLISHER
echo ============================================================
echo Run normally - DO NOT Run as Administrator.
echo Requires PowerShell 7.
echo.
echo [LOG] %QS_LOG%
echo.

where pwsh.exe >nul 2>&1
if errorlevel 1 (
    echo [FAIL] PowerShell 7 ^(pwsh.exe^) was not found.
    echo [FAIL] PowerShell 7 ^(pwsh.exe^) was not found.>>"%QS_LOG%"
    echo Install PowerShell 7, then run this BAT again.
    echo Install PowerShell 7, then run this BAT again.>>"%QS_LOG%"
    copy /y "%QS_LOG%" "%QS_LATEST%" >nul 2>&1
    echo.
    echo [LOG] %QS_LOG%
    echo.
    pause
    exit /b 1
)

if not exist "%QS_PS1%" (
    echo [FAIL] Publisher PS1 is missing:
    echo %QS_PS1%
    echo [FAIL] Publisher PS1 is missing: %QS_PS1%>>"%QS_LOG%"
    copy /y "%QS_LOG%" "%QS_LATEST%" >nul 2>&1
    echo.
    echo [LOG] %QS_LOG%
    echo.
    pause
    exit /b 1
)

echo [PRE-FLIGHT] Parsing the complete PowerShell 7 publisher...
>>"%QS_LOG%" echo [PRE-FLIGHT] Parsing the complete PowerShell 7 publisher...

pwsh.exe -NoLogo -NoProfile -Command "$tokens=$null; $errors=$null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:QS_PS1,[ref]$tokens,[ref]$errors); if(@($errors).Count -gt 0){ foreach($err in $errors){ '[PARSER] ' + $err.Message + ' at line ' + $err.Extent.StartLineNumber }; exit 1 }; '[PASS] PowerShell 7 parser preflight passed.'" >"%QS_PARSE_TMP%" 2>&1
set "RC=%ERRORLEVEL%"
type "%QS_PARSE_TMP%"
type "%QS_PARSE_TMP%">>"%QS_LOG%"
del /q "%QS_PARSE_TMP%" >nul 2>&1

if not "%RC%"=="0" (
    echo [FAIL] Publisher parser preflight failed. No project files were changed.
    echo [FAIL] Publisher parser preflight failed. No project files were changed.>>"%QS_LOG%"
    copy /y "%QS_LOG%" "%QS_LATEST%" >nul 2>&1
    echo.
    echo ============================================================
    echo [FAIL] R10 DID NOT PUBLISH
    echo [LOG] %QS_LOG%
    echo ============================================================
    echo.
    pause
    exit /b %RC%
)

echo.
echo [RUN] Starting publisher. This window will remain open when it finishes.
echo [RUN] Starting publisher.>>"%QS_LOG%"
echo.

pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%QS_PS1%" -LogPath "%QS_LOG%"
set "RC=%ERRORLEVEL%"

>>"%QS_LOG%" echo.
>>"%QS_LOG%" echo [BAT] Publisher exit code: %RC%
>>"%QS_LOG%" echo [BAT] Finished: %DATE% %TIME%
copy /y "%QS_LOG%" "%QS_LATEST%" >nul 2>&1

echo.
echo ============================================================
if "%RC%"=="0" (
    echo [PASS] QuietShield Chrome 1.0.9 R10 completed successfully.
) else (
    echo [FAIL] QuietShield Chrome 1.0.9 R10 stopped with exit code %RC%.
)
echo [LOG] %QS_LOG%
echo [LATEST LOG] %QS_LATEST%
echo ============================================================
echo.
echo This window is intentionally kept open so errors cannot disappear.
pause
exit /b %RC%
