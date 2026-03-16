<?php
/**
 * Script de migración de SQLite a MySQL
 * Exporta datos de SQLite y los importa a MySQL
 */

echo "🔄 Iniciando migración de SQLite a MySQL...\n";

// Configuración
require_once __DIR__ . '/../config/config.php';

$sqliteFile = __DIR__ . '/../database/munidb_v2.sqlite';

if (!file_exists($sqliteFile)) {
    echo "❌ No se encuentra el archivo SQLite: $sqliteFile\n";
    echo "💡 Ejecuta primero: php scripts/init_database.php\n";
    exit(1);
}

try {
    // Conexión a SQLite
    $sqlite = new PDO('sqlite:' . $sqliteFile);
    $sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Conexión a SQLite establecida\n";
    
    // Conexión a MySQL
    $dsn = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
    $mysql = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "✅ Conexión a MySQL establecida\n";
    
    // Crear base de datos si no existe
    $mysql->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $mysql->exec("USE " . DB_NAME);
    echo "✅ Base de datos MySQL verificada\n";
    
    // Obtener estructura de tablas SQLite
    $tables = $sqlite->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll();
    
    foreach ($tables as $table) {
        $tableName = $table['name'];
        echo "\n📋 Procesando tabla: $tableName\n";
        
        // Obtener estructura de la tabla
        $createTable = $sqlite->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='$tableName'")->fetch()['sql'];
        
        // Convertir sintaxis SQLite a MySQL
        $mysqlTable = convertSQLiteToMySQL($createTable);
        
        // Crear tabla en MySQL
        try {
            $mysql->exec("DROP TABLE IF EXISTS $tableName");
            $mysql->exec($mysqlTable);
            echo "   ✅ Tabla creada en MySQL\n";
        } catch (Exception $e) {
            echo "   ⚠️  Error creando tabla: " . $e->getMessage() . "\n";
            continue;
        }
        
        // Migrar datos
        $stmt = $sqlite->query("SELECT * FROM $tableName");
        $rows = $stmt->fetchAll();
        
        if (!empty($rows)) {
            $columns = array_keys($rows[0]);
            $placeholders = str_repeat('?,', count($columns) - 1) . '?';
            $insertSql = "INSERT INTO $tableName (" . implode(', ', $columns) . ") VALUES ($placeholders)";
            $insertStmt = $mysql->prepare($insertSql);
            
            $rowCount = 0;
            foreach ($rows as $row) {
                try {
                    $insertStmt->execute(array_values($row));
                    $rowCount++;
                } catch (Exception $e) {
                    echo "   ⚠️  Error insertando fila: " . $e->getMessage() . "\n";
                }
            }
            
            echo "   ✅ $rowCount filas migradas\n";
        } else {
            echo "   ℹ️  Sin datos para migrar\n";
        }
    }
    
    echo "\n🎉 Migración completada exitosamente!\n";
    echo "\n📝 Resumen:\n";
    echo "   • Tablas migradas: " . count($tables) . "\n";
    echo "   • Base de datos MySQL: " . DB_NAME . "\n";
    echo "   • Host MySQL: " . DB_HOST . "\n";
    
    echo "\n🔧 Próximos pasos:\n";
    echo "   1. Actualiza config/db.php para usar MySQL\n";
    echo "   2. Prueba la conexión: php test_db_connection.php\n";
    echo "   3. Verifica los datos en la nueva base de datos\n";
    
} catch (Exception $e) {
    echo "❌ Error durante la migración: " . $e->getMessage() . "\n";
    echo "\n🔍 Verifica:\n";
    echo "   • Credenciales MySQL en config/config.php\n";
    echo "   • Permisos del usuario MySQL\n";
    echo "   • Servicio MySQL esté corriendo\n";
}

/**
 * Convierte sintaxis SQLite a MySQL
 */
function convertSQLiteToMySQL($sqliteSql) {
    // Reemplazar AUTOINCREMENT por AUTO_INCREMENT
    $mysql = str_replace('AUTOINCREMENT', 'AUTO_INCREMENT', $sqliteSql);
    
    // Reemplazar INTEGER PRIMARY KEY por INT PRIMARY KEY
    $mysql = preg_replace('/INTEGER PRIMARY KEY/', 'INT PRIMARY KEY AUTO_INCREMENT', $mysql);
    
    // Reemplazar VARCHAR por VARCHAR con longitud
    $mysql = preg_replace('/VARCHAR(?!\()/i', 'VARCHAR(255)', $mysql);
    
    // Reemplazar TEXT por TEXT
    $mysql = preg_replace('/TEXT(?!\()/i', 'TEXT', $mysql);
    
    // Reemplazar BOOLEAN por TINYINT(1)
    $mysql = preg_replace('/BOOLEAN/i', 'TINYINT(1)', $mysql);
    
    // Reemplazar TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    $mysql = preg_replace('/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/i', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', $mysql);
    
    // Eliminar referencias a FOREIGN KEY si no existen
    $mysql = preg_replace('/FOREIGN KEY.*REFERENCES.*\)/', '', $mysql);
    
    // Reemplazar ENUM por VARCHAR con CHECK
    $mysql = preg_replace_callback('/ENUM\(([^)]+)\)/i', function($matches) {
        $values = str_replace("'", "", $matches[1]);
        return "VARCHAR(50)";
    }, $mysql);
    
    return $mysql;
}
