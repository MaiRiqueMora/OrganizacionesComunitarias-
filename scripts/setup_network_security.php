<?php
/**
 * Configuración Automática de Seguridad de Red Interna
 * Este script configura el .env para acceso solo desde red interna
 */

echo "🔧 Configurando seguridad de red interna...\n\n";

// Ruta del archivo .env
$envFile = __DIR__ . '/../.env';
$envExample = __DIR__ . '/../.env.example';

// Leer configuración actual
$config = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with($line, '#')) {
            list($key, $value) = explode('=', $line, 2);
            $config[trim($key)] = trim($value);
        }
    }
}

// Agregar configuración de seguridad
$config['FORCE_INTERNAL_ACCESS'] = 'true';
$config['ALLOWED_NETWORKS'] = '127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';
$config['ALLOWED_IPS'] = '';
$config['LOG_LEVEL'] = 'debug';
$config['LOGS_DIR'] = 'logs/';
$config['LOG_DAYS_RETENTION'] = '30';

// Escribir nuevo .env
$content = "# Sistema Municipal - Variables de Entorno (Desarrollo)\n";
$content .= "# No versionar este archivo en producción\n\n";

// Secciones ordenadas
$sections = [
    'Base de Datos' => ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_CHARSET'],
    'SMTP (Correo)' => ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_FROM_NAME'],
    'Aplicación' => ['APP_NAME', 'APP_URL', 'TOKEN_EXPIRY'],
    'Subida de Archivos' => ['UPLOAD_DIR', 'UPLOAD_MAX_MB'],
    'Configuración del Sistema' => ['ALERTA_DIAS_ANTES', 'TIMEZONE'],
    'Seguridad' => ['APP_ENV'],
    'Seguridad de Red (Acceso Interno)' => ['ALLOWED_NETWORKS', 'ALLOWED_IPS', 'FORCE_INTERNAL_ACCESS'],
    'Debug (solo para desarrollo)' => ['DEBUG', 'LOG_ERRORS'],
    'Sistema de Logs' => ['LOG_LEVEL', 'LOGS_DIR', 'LOG_DAYS_RETENTION']
];

foreach ($sections as $section => $keys) {
    $content .= "\n# ── $section ────────────────────────────────────────\n";
    foreach ($keys as $key) {
        if (isset($config[$key])) {
            $content .= "$key=" . $config[$key] . "\n";
        }
    }
}

// Guardar archivo
file_put_contents($envFile, $content);

echo "✅ Archivo .env configurado correctamente\n\n";
echo "📋 Configuración aplicada:\n";
echo "   • FORCE_INTERNAL_ACCESS=true (activado)\n";
echo "   • ALLOWED_NETWORKS=127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16\n";
echo "   • ALLOWED_IPS=vacío (sin IPs específicas)\n";
echo "   • LOG_LEVEL=debug\n\n";

echo "🔐 Estado de seguridad:\n";
echo "   ✅ Acceso solo desde red interna\n";
echo "   ✅ Redes privadas permitidas\n";
echo "   ✅ Logging de accesos activado\n\n";

echo "🧪 Para verificar la configuración, ejecuta:\n";
echo "   php scripts/check_network.php\n\n";

echo "🎉 ¡Configuración completada!\n";
echo "   El sistema ahora solo es accesible desde la red interna.\n";
echo "   Los accesos externos serán bloqueados y registrados.\n";
