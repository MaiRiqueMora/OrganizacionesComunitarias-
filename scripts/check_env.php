<?php
/**
 * Script de verificación de configuración .env
 * Verifica que las variables de entorno estén cargadas correctamente
 */

// Verificar que se ejecute desde CLI
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('Acceso denegado. Este script solo puede ejecutarse desde línea de comandos.');
}

echo "🔍 Verificando configuración de variables de entorno...\n\n";

require_once __DIR__ . '/../config/Env.php';

// Cargar variables de entorno
Env::load();

echo "📋 Variables de entorno cargadas:\n";
echo "   APP_ENV: " . Env::get('APP_ENV', 'no definido') . "\n";
echo "   DEBUG: " . (Env::isDebug() ? 'true' : 'false') . "\n";
echo "   TIMEZONE: " . Env::get('TIMEZONE', 'no definido') . "\n\n";

echo "🗄️ Configuración de Base de Datos:\n";
echo "   DB_HOST: " . Env::get('DB_HOST', 'no definido') . "\n";
echo "   DB_NAME: " . Env::get('DB_NAME', 'no definido') . "\n";
echo "   DB_USER: " . Env::get('DB_USER', 'no definido') . "\n";
echo "   DB_PASS: " . (Env::get('DB_PASS') ? '*** configurada ***' : 'no definida') . "\n";
echo "   DB_CHARSET: " . Env::get('DB_CHARSET', 'no definido') . "\n\n";

echo "📧 Configuración SMTP:\n";
echo "   SMTP_HOST: " . Env::get('SMTP_HOST', 'no definido') . "\n";
echo "   SMTP_PORT: " . Env::get('SMTP_PORT', 'no definido') . "\n";
echo "   SMTP_USER: " . Env::get('SMTP_USER', 'no definido') . "\n";
echo "   SMTP_PASS: " . (Env::get('SMTP_PASS') && Env::get('SMTP_PASS') !== 'xxxx xxxx xxxx xxxx' ? '*** configurada ***' : 'no definida') . "\n\n";

echo "🌐 Configuración de Aplicación:\n";
echo "   APP_NAME: " . Env::get('APP_NAME', 'no definido') . "\n";
echo "   APP_URL: " . Env::get('APP_URL', 'no definido') . "\n";
echo "   TOKEN_EXPIRY: " . Env::get('TOKEN_EXPIRY', 'no definido') . " segundos\n\n";

echo "📁 Configuración de Archivos:\n";
echo "   UPLOAD_DIR: " . Env::get('UPLOAD_DIR', 'no definido') . "\n";
echo "   UPLOAD_MAX_MB: " . Env::get('UPLOAD_MAX_MB', 'no definido') . " MB\n\n";

echo "⏰ Configuración del Sistema:\n";
echo "   ALERTA_DIAS_ANTES: " . Env::get('ALERTA_DIAS_ANTES', 'no definido') . " días\n\n";

// Verificar archivo .env
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    echo "✅ Archivo .env encontrado\n";
    echo "   Ruta: " . $envFile . "\n";
    echo "   Tamaño: " . filesize($envFile) . " bytes\n";
    echo "   Permisos: " . substr(sprintf('%o', fileperms($envFile)), -4) . "\n";
} else {
    echo "⚠️  Archivo .env no encontrado (usando valores por defecto)\n";
    echo "   Ruta esperada: " . $envFile . "\n";
}

// Verificar acceso web bloqueado
echo "\n🔒 Verificación de seguridad:\n";
$envWebAccessible = is_file($envFile) && is_readable($envFile);
if ($envWebAccessible) {
    echo "   ⚠️  .env es accesible (debería estar bloqueado por .htaccess)\n";
} else {
    echo "   ✅ .env no es accesible vía web\n";
}

// Verificar .htaccess
$htaccessFile = __DIR__ . '/../.htaccess';
if (file_exists($htaccessFile)) {
    echo "   ✅ .htaccess encontrado\n";
    $htaccessContent = file_get_contents($htaccessFile);
    if (strpos($htaccessContent, '.env') !== false) {
        echo "   ✅ .htaccess bloquea acceso a .env\n";
    } else {
        echo "   ⚠️  .htaccess no bloquea explícitamente .env\n";
    }
} else {
    echo "   ❌ .htaccess no encontrado\n";
}

echo "\n🎉 Verificación completada\n";

// Sugerencias
if (!file_exists($envFile)) {
    echo "\n💡 Sugerencia: Copia .env.example a .env y ajusta los valores\n";
    echo "   cp .env.example .env\n";
}

if (Env::get('DB_PASS') === '') {
    echo "\n💡 Sugerencia: Configura una contraseña para la base de datos\n";
}

if (Env::get('SMTP_PASS') === 'xxxx xxxx xxxx xxxx') {
    echo "\n💡 Sugerencia: Configura las credenciales SMTP para envío de correos\n";
}

if (Env::get('APP_ENV') === 'development' && Env::isDebug()) {
    echo "\n💡 Sugerencia: En producción, establece APP_ENV=production y DEBUG=false\n";
}
