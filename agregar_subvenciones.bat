@echo off
echo 📊 Agregando tabla de Subvenciones al sistema...
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

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

REM Ejecutar el script para agregar tabla de subvenciones
echo 🔧 Agregando tabla de subvenciones con: %PHP_PATH%
echo.
"%PHP_PATH%" scripts/add_subvenciones_table.php

if %errorlevel% equ 0 (
    echo.
    echo ✅ ¡Tabla de subvenciones agregada con éxito!
    echo 📊 Ahora el sistema puede gestionar el historial de subvenciones
    echo.
    echo 🎯 Características agregadas:
    echo    • Registro de subvenciones por organización
    echo    • Seguimiento de postulaciones por año
    echo    • Control de estados (Postulada, Aprobada, Rechazada, En Evaluación)
    echo    • Registro de montos aprobados
    echo    • Historial completo con estadísticas
    echo.
    echo 📋 En el formulario de organizaciones aparecerá:
    echo    • Cuántas veces ha postulado
    echo    • Si obtuvo subvención
    echo    • En qué año postuló
    echo    • Montos aprobados
    echo.
    echo 🌐 Para probar:
    echo    1. Inicia sesión en el sistema
    echo    2. Edita una organización existente
    echo    3. Verás la nueva sección "📊 Historial de Subvenciones"
    echo    4. Agrega tu primera subvención
) else (
    echo.
    echo ❌ Error al agregar tabla de subvenciones
    echo 💡 Revisa el mensaje de error arriba
    echo.
    echo 💡 Asegúrate de que:
    echo    • La base de datos exista (ejecuta inicializar_base_datos_smart.bat)
    echo    • PHP esté funcionando correctamente
    echo    • El directorio database tenga permisos de escritura
)

echo.
echo 📋 Resumen:
echo    • PHP utilizado: %PHP_PATH%
echo    • Directorio: %CD%
echo    • Tabla agregada: subvenciones
echo.

pause
