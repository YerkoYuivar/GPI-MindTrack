@echo off
REM Script para iniciar todos los servicios en Windows
REM Emotional Journal App - Modo Desarrollo Completo

echo ================================
echo Emotional Journal - Desarrollo
echo ================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ERROR: Debes ejecutar este script desde el directorio raiz del proyecto
    pause
    exit /b 1
)

REM Compilar Cloud Functions
echo Compilando Cloud Functions...
cd functions
call npm run build
cd ..

echo.
echo ================================
echo Iniciando servicios...
echo ================================
echo.

REM Crear directorio para logs
if not exist ".logs" mkdir .logs

REM Iniciar Firebase Emulators en una nueva ventana (persistencia de datos)
echo Iniciando Firebase Emulators (persistencia habilitada)...
start "Firebase Emulators" cmd /k "firebase emulators:start --import .\\.firebase-data --export-on-exit"

REM Esperar un poco para que los emuladores inicien
timeout /t 10 /nobreak

REM Iniciar Expo en esta ventana
echo.
echo Iniciando Expo Dev Server...
echo.
call npx expo start --clear

pause
