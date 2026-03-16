<?php
/**
 * Script de diagnóstico de base de datos - SOLO PARA DESARROLLO
 * Este archivo no debe estar en producción
 * 
 * Uso: php scripts/diagnose_database.php
 */

// Verificar que se ejecute desde CLI (línea de comandos)
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('Acceso denegado. Este script solo puede ejecutarse desde línea de comandos.');
}

echo "🔍 Verificando conexión a base de datos...\n\n";

require_once __DIR__ . '/../config/db.php';

try {
    // Probar conexión
    $db = getDB();
    echo "✅ Conexión exitosa a la base de datos\n";
    
    // Verificar tipo de base de datos
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "📊 Tipo de base de datos: " . strtoupper($driver) . "\n";
    
    // Listar tablas
    if ($driver === 'sqlite') {
        $tables = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll();
        $tableNames = array_column($tables, 'name');
    } else {
        $tables = $db->query("SHOW TABLES")->fetchAll();
        $tableNames = array_map('reset', $tables);
    }
    
    echo "📋 Tablas encontradas: " . count($tableNames) . "\n";
    
    if (!empty($tableNames)) {
        echo "   • " . implode("\n   • ", $tableNames) . "\n";
    }
    
    // Verificar tabla de usuarios
    if (in_array('usuarios', $tableNames)) {
        $userCount = $db->query("SELECT COUNT(*) as count FROM usuarios")->fetch()['count'];
        echo "👥 Usuarios registrados: $userCount\n";
        
        if ($userCount > 0) {
            $adminCount = $db->query("SELECT COUNT(*) as count FROM usuarios WHERE rol = 'administrador'")->fetch()['count'];
            echo "👑 Administradores: $adminCount\n";
        }
    }
    
    // Verificar tabla de organizaciones
    if (in_array('organizaciones', $tableNames)) {
        $orgCount = $db->query("SELECT COUNT(*) as count FROM organizaciones")->fetch()['count'];
        echo "🏢 Organizaciones: $orgCount\n";
    }
    
    // Verificar directorios
    echo "\n📁 Verificando directorios...\n";
    
    $directories = [
        'uploads' => __DIR__ . '/../uploads',
        'backups' => __DIR__ . '/../backups',
        'logs' => __DIR__ . '/../logs',
        'database' => __DIR__ . '/../database'
    ];
    
    foreach ($directories as $name => $path) {
        if (is_dir($path)) {
            $writable = is_writable($path);
            echo "   ✅ $name/ (writable: " . ($writable ? 'yes' : 'no') . ")\n";
        } else {
            echo "   ❌ $name/ (no existe)\n";
        }
    }
    
    // Verificar archivo de base de datos SQLite
    if ($driver === 'sqlite') {
        $dbFile = __DIR__ . '/../database/munidb_v2.sqlite';
        if (file_exists($dbFile)) {
            $size = filesize($dbFile);
            echo "📄 Archivo SQLite: " . formatBytes($size) . "\n";
        } else {
            echo "⚠️  Archivo SQLite no encontrado (se creará al usar el sistema)\n";
        }
    }
    
    echo "\n🎉 Verificación completada\n";
    
    if (empty($tableNames)) {
        echo "\n💡 Sugerencia: Ejecuta 'php scripts/init_database.php' para crear las tablas\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error de conexión: " . $e->getMessage() . "\n";
    
    echo "\n🔍 Solución de problemas:\n";
    
    if (strpos($e->getMessage(), 'unable to open database file') !== false) {
        echo "   1. Crea el directorio database/: mkdir -p database\n";
        echo "   2. Asigna permisos: chmod 755 database/\n";
        echo "   3. Ejecuta: php scripts/init_database.php\n";
    }
    
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        echo "   1. Verifica credenciales en config/config.php\n";
        echo "   2. Asegura que MySQL esté corriendo\n";
        echo "   3. Verifica permisos del usuario de base de datos\n";
    }
    
    if (strpos($e->getMessage(), 'No such file or directory') !== false) {
        echo "   1. Instala extensión PDO para SQLite/MySQL\n";
        echo "   2. Reinicia el servidor web\n";
    }
}

function formatBytes($bytes) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    
    $bytes /= pow(1024, $pow);
    
    return round($bytes, 2) . ' ' . $units[$pow];
}
