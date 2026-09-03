@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo QuietShield Chrome 1.0.2 R3 - CLEAN BUILD + TWO-REPO PUBLISHER
echo Run normally - DO NOT Run as Administrator.
echo Requires PowerShell 7.
echo ============================================================
echo.

where pwsh.exe >nul 2>&1
if errorlevel 1 (
  echo [FAIL] PowerShell 7 ^(pwsh.exe^) was not found.
  echo Install PowerShell 7, then run this BAT again.
  pause
  exit /b 1
)

set "QS_PS1=%~dp0scripts\PUBLISH-QUIETSHIELD-CHROME-R3.ps1"

echo [PRE-FLIGHT] Parsing the complete PowerShell 7 publisher...
pwsh.exe -NoLogo -NoProfile -Command "$tokens=$null; $errors=$null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:QS_PS1,[ref]$tokens,[ref]$errors); if($errors.Count -gt 0){ foreach($err in $errors){ Write-Host ('[PARSER] ' + $err.Message + ' at line ' + $err.Extent.StartLineNumber) -ForegroundColor Red }; exit 1 }; Write-Host '[PASS] PowerShell 7 parser preflight passed.' -ForegroundColor Green"
if errorlevel 1 (
  echo [FAIL] Publisher parser preflight failed. No project files were changed.
  pause
  exit /b 1
)

echo.
pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%QS_PS1%"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" pause
exit /b %RC%
