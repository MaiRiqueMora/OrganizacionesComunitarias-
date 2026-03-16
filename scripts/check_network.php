<?php
/**
 * Script de prueba de seguridad de red
 * Verifica si la configuración de acceso interno funciona correctamente
 */

// Verificar que se ejecute desde CLI
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('Acceso denegado. Este script solo puede ejecutarse desde línea de comandos.');
}

echo "🔐 Verificando configuración de seguridad de red interna...\n\n";

// Cargar configuración
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/NetworkSecurity.php';

echo "📋 Configuración Actual:\n";
echo "   FORCE_INTERNAL_ACCESS: " . (FORCE_INTERNAL_ACCESS ? 'true' : 'false') . "\n";
echo "   ALLOWED_NETWORKS: " . ALLOWED_NETWORKS . "\n";
echo "   ALLOWED_IPS: " . ALLOWED_IPS . "\n\n";

// Configurar redes desde entorno
NetworkSecurity::configureFromEnv();

// Obtener información de red
$networkInfo = NetworkSecurity::getNetworkInfo();

echo "🌐 Información de Red Actual:\n";
echo "   IP del Cliente: " . $networkInfo['client_ip'] . "\n";
echo "   Es Localhost: " . ($networkInfo['is_local'] ? 'Sí' : 'No') . "\n";
echo "   Es IP Privada: " . ($networkInfo['is_private'] ? 'Sí' : 'No') . "\n";
echo "   Tiene Acceso Permitido: " . ($networkInfo['is_allowed'] ? 'Sí ✅' : 'No ❌') . "\n\n";

echo "🔍 Redes Permitidas Configuradas:\n";
foreach ($networkInfo['allowed_networks'] as $network) {
    echo "   • " . $network . "\n";
}

if (!empty($networkInfo['allowed_ips'])) {
    echo "\n📍 IPs Específicas Permitidas:\n";
    foreach ($networkInfo['allowed_ips'] as $ip) {
        echo "   • " . $ip . "\n";
    }
}

echo "\n🧪 Pruebas de Acceso:\n";

// Probar algunas IPs comunes
$testIPs = [
    '127.0.0.1' => 'Localhost',
    '192.168.1.100' => 'Red Interna Típica',
    '10.0.0.50' => 'Red Clase A Privada',
    '172.16.0.10' => 'Red Clase B Privada',
    '8.8.8.8' => 'Google DNS (Externo)',
    '1.1.1.1' => 'Cloudflare DNS (Externo)'
];

foreach ($testIPs as $ip => $description) {
    // Simular la IP para prueba
    $_SERVER['REMOTE_ADDR'] = $ip;
    $_SERVER['HTTP_X_FORWARDED_FOR'] = null;
    
    $isAllowed = NetworkSecurity::isAllowedAccess();
    echo "   " . ($isAllowed ? '✅' : '❌') . " {$ip} - {$description}\n";
}

// Restaurar IP original
unset($_SERVER['REMOTE_ADDR']);
unset($_SERVER['HTTP_X_FORWARDED_FOR']);

echo "\n📝 Recomendaciones:\n";

if (!FORCE_INTERNAL_ACCESS) {
    echo "   ⚠️  La verificación de red interna está DESACTIVADA\n";
    echo "   💡 Para activarla, establece FORCE_INTERNAL_ACCESS=true en .env\n";
} else {
    echo "   ✅ La verificación de red interna está ACTIVADA\n";
    
    if ($networkInfo['is_allowed']) {
        echo "   ✅ Tu IP actual tiene acceso permitido\n";
    } else {
        echo "   ❌ Tu IP actual NO tiene acceso permitido\n";
        echo "   💡 Contacta con el administrador de red para agregar tu IP\n";
    }
}

echo "\n🔒 Estado de Seguridad:\n";
if (FORCE_INTERNAL_ACCESS) {
    echo "   ✅ Sistema protegido por restricción de red interna\n";
    echo "   ✅ Solo accesible desde redes autorizadas\n";
    echo "   ✅ Intentos externos son bloqueados y registrados\n";
} else {
    echo "   ⚠️  Sistema accesible desde cualquier red\n";
    echo "   ⚠️  Sin protección de acceso por red\n";
    echo "   💡 Se recomienda activar en producción\n";
}

echo "\n🎉 Verificación completada\n";

if (FORCE_INTERNAL_ACCESS && !$networkInfo['is_allowed']) {
    echo "\n🚨 ACCIÓN REQUERIDA:\n";
    echo "   Tu IP actual no tiene acceso. Contacta con TI.\n";
}
