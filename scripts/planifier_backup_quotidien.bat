@echo off
setlocal

if "%~2"=="" (
  echo Usage:
  echo   planifier_backup_quotidien.bat EMAIL_SUPABASE MOTDEPASSE_SUPABASE
  exit /b 1
)

set "EMAIL=%~1"
set "PASS=%~2"
set "TASK_NAME=DOTATIONS_BACKUP_QUOTIDIEN"
set "SCRIPT_PS=C:\Users\sebastien.duc\CLOUD\02_ARCHIVAGE PERSONNEL\DASHBOARDS\DOTATIONS\scripts\backup_dotations_edge.ps1"

schtasks /Create /F /SC DAILY /ST 03:30 /TN "%TASK_NAME%" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"%SCRIPT_PS%\" -Email \"%EMAIL%\" -Password \"%PASS%\""
if errorlevel 1 (
  echo ECHEC creation tache planifiee.
  exit /b 1
)

echo TACHE_OK:%TASK_NAME%
endlocal
