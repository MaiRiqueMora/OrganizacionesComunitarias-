@echo off
echo 🗄️ Inicializando Base de Datos del Sistema Municipal...
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar si el directorio database existe
if not exist "database" (
    echo 📁 Creando directorio database...
    mkdir database
)

REM Buscar PHP en ubicaciones comunes
set PHP_FOUND=0
set PHP_PATH=

REM Buscar en XAMPP
if exist "C:\xampp\php\php.exe" (
    set PHP_FOUND=1
    set PHP_PATH=C:\xampp\php\php.exe
    echo ✅ PHP encontrado en XAMPP
)

REM Buscar en WAMP
if exist "C:\wamp64\bin\php\php8.2.18\php.exe" (
    set PHP_FOUND=1
    set PHP_PATH=C:\wamp64\bin\php\php8.2.18\php.exe
    echo ✅ PHP encontrado en WAMP
)

REM Buscar en PATH del sistema
where php.exe >nul 2>&1
if %errorlevel% equ 0 (
    set PHP_FOUND=1
    set PHP_PATH=php.exe
    echo ✅ PHP encontrado en PATH del sistema
)

REM Buscar en Program Files
if exist "C:\Program Files\PHP\php.exe" (
    set PHP_FOUND=1
    set PHP_PATH="C:\Program Files\PHP\php.exe"
    echo ✅ PHP encontrado en Program Files
)

if %PHP_FOUND% equ 0 (
    echo ❌ PHP no encontrado en ubicaciones comunes
    echo.
    echo 💡 Por favor, especifica la ruta de PHP:
    echo    Ejemplo: C:\xampp\php\php.exe
    echo.
    set /p PHP_PATH="Ingresa la ruta completa a php.exe: "
    if not exist "%PHP_PATH%" (
        echo ❌ El archivo especificado no existe
        pause
        exit /b 1
    )
)

REM Ejecutar el script de inicialización
echo 🔧 Ejecutando script de inicialización con: %PHP_PATH%
echo.
"%PHP_PATH%" scripts/init_database.php

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Base de datos inicializada con éxito!
    echo 📊 Se han creado las tablas y datos iniciales
    echo 👤 Usuario administrador: admin / admin123
    echo.
    echo 📁 Archivo de base de datos: database/munidb_v2.sqlite
    echo.
    echo 🌐 Ahora puedes acceder al sistema:
    echo    1. Inicia el servidor web (Apache/XAMPP)
    echo    2. Visita http://localhost/sistema-municipal
    echo    3. Inicia sesión con: admin / admin123
    echo.
    echo 🔍 Para verificar, ejecuta: "%PHP_PATH%" scripts/diagnose_database.php
) else (
    echo.
    echo ❌ Error durante la inicialización de la base de datos
    echo 💡 Revisa el mensaje de error arriba
    echo.
    echo 💡 Asegúrate de que:
    echo    - PHP esté funcionando correctamente
    echo    - El directorio database tenga permisos de escritura
    echo    - Las extensiones necesarias estén habilitadas
)

echo.
echo 📋 Resumen:
echo    • PHP utilizado: %PHP_PATH%
echo    • Directorio: %CD%
echo    • Base de datos: database/munidb_v2.sqlite
echo.

pause
