@echo off
echo 🗄️ Inicializando Base de Datos del Sistema Municipal...
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar si PHP está disponible
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP no está instalado o no está en el PATH
    echo 💡 Por favor instala PHP o agrégalo al PATH del sistema
    echo.
    echo 📋 Instrucciones manuales:
    echo    1. Instala PHP desde https://www.php.net/downloads.php
    echo    2. Agrega PHP al PATH del sistema
    echo    3. Ejecuta: php scripts/init_database.php
    pause
    exit /b 1
)

REM Verificar si el directorio database existe
if not exist "database" (
    echo 📁 Creando directorio database...
    mkdir database
)

REM Ejecutar el script de inicialización
echo 🔧 Ejecutando script de inicialización...
php scripts/init_database.php

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Base de datos inicializada con éxito!
    echo 📊 Se han creado las tablas y datos iniciales
    echo 👤 Usuario administrador: admin / admin123
    echo.
    echo 📁 Archivo de base de datos: database/munidb_v2.sqlite
    echo 🔍 Para verificar, ejecuta: php scripts/diagnose_database.php
    echo.
    echo 🌐 Ahora puedes acceder al sistema:
    echo    1. Inicia el servidor web
    echo    2. Visita http://localhost/sistema-municipal
    echo    3. Inicia sesión con: admin / admin123
) else (
    echo.
    echo ❌ Error durante la inicialización de la base de datos
    echo 💡 Revisa el mensaje de error arriba
)

echo.
pause
