@echo off
echo 🔧 Configurando seguridad de red interna...
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar si PHP está disponible
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP no está instalado o no está en el PATH
    echo 💡 Por favor instala PHP o agrégalo al PATH del sistema
    pause
    exit /b 1
)

REM Ejecutar el script de configuración
php scripts/setup_network_security.php

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Configuración completada con éxito!
    echo 🔐 El sistema ahora solo es accesible desde la red interna.
    echo.
    echo 🧪 Para verificar, ejecuta: php scripts/check_network.php
) else (
    echo.
    echo ❌ Error durante la configuración
)

echo.
pause
