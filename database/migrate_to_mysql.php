<?php
/**
 * Script de Migración de SQLite a MySQL
 * 
 * Este script migra todos los datos de la base de datos SQLite existente
 * a la nueva base de datos MySQL/MariaDB.
 */

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/config.php';

// Configuración de MySQL
define('MYSQL_HOST', 'localhost');
define('MYSQL_DB', 'sistema_municipal');
define('MYSQL_USER', 'root');
define('MYSQL_PASS', '');

echo "<h1>Migración de SQLite a MySQL</h1>";

try {
    // Conexión a SQLite (origen)
    $sqlite = new PDO('sqlite:' . DB_PATH, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Conexión a MySQL (destino)
    $mysql = new PDO(
        'mysql:host=' . MYSQL_HOST . ';dbname=' . MYSQL_DB . ';charset=utf8mb4',
        MYSQL_USER,
        MYSQL_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    echo "<h2>Conexiones establecidas</h2>";
    echo "<p>SQLite: " . DB_PATH . "</p>";
    echo "<p>MySQL: " . MYSQL_HOST . "/" . MYSQL_DB . "</p>";
    
    // Desactivar claves foráneas temporalmente
    $mysql->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Desactivar triggers para evitar duplicación en historial
    try {
        $mysql->exec("SET sql_log_bin = 0");
    } catch (Exception $e) {
        // Ignorar si no tiene permisos de SUPER
        error_log("sql_log_bin no disponible - permisos insuficientes");
    }
    
    // Función para verificar si tabla existe en MySQL
    function tableExists($tableName, $mysql) {
        try {
            $stmt = $mysql->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$tableName]);
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    
    // Función para obtener estructura de tabla MySQL
    function getTableStructure($tableName, $mysql) {
        try {
            $stmt = $mysql->query("DESCRIBE $tableName");
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            return [];
        }
    }
    
    // Función para migrar tabla
    function migrateTable($tableName, $sqlite, $mysql) {
        echo "<h3>Migrando tabla: $tableName</h3>";
        
        // 1. Verificar que la tabla existe en MySQL
        if (!tableExists($tableName, $mysql)) {
            echo "<p style='color: red;'>La tabla $tableName no existe en MySQL. Ejecute primero schema_mysql.sql</p>";
            return false;
        }
        
        try {
            // 2. Verificar que la tabla existe en SQLite (origen)
            $stmt = $sqlite->query("SELECT name FROM sqlite_master WHERE type='table' AND name='$tableName'");
            if ($stmt->rowCount() == 0) {
                echo "<p style='color: orange;'>La tabla $tableName no existe en SQLite</p>";
                return true;
            }
            
            // 3. Obtener datos de SQLite
            $stmt = $sqlite->query("SELECT * FROM $tableName");
            $data = $stmt->fetchAll();
            
            if (empty($data)) {
                echo "<p>No hay datos en la tabla $tableName</p>";
                return true;
            }
            
            // 4. Obtener estructura de ambas tablas
            $sqliteColumns = array_keys($data[0]);
            $mysqlColumns = getTableStructure($tableName, $mysql);
            
            // 5. Verificar compatibilidad de columnas
            $missingColumns = array_diff($sqliteColumns, $mysqlColumns);
            if (!empty($missingColumns)) {
                echo "<p style='color: red;'>Columnas faltantes en MySQL: " . implode(', ', $missingColumns) . "</p>";
                return false;
            }
            
            // 6. Preparar inserción en MySQL
            $columnList = implode(', ', $sqliteColumns);
            $placeholders = str_repeat('?,', count($sqliteColumns) - 1) . '?';
            $insertStmt = $mysql->prepare("INSERT INTO $tableName ($columnList) VALUES ($placeholders)");
            
            $inserted = 0;
            $errors = 0;
            
            foreach ($data as $row) {
                try {
                    // Convertir valores nulos y fechas
                    $values = array_map(function($value) {
                        if ($value === '') return null;
                        if ($value === '0000-00-00 00:00:00') return null;
                        if ($value === '0000-00-00') return null;
                        return $value;
                    }, array_values($row));
                    
                    $insertStmt->execute($values);
                    $inserted++;
                } catch (Exception $e) {
                    $errors++;
                    if ($errors <= 5) { // Mostrar solo primeros 5 errores
                        echo "<p style='color: orange;'>Error insertando registro: " . $e->getMessage() . "</p>";
                    }
                }
            }
            
            echo "<p style='color: green;'>$inserted registros insertados correctamente</p>";
            if ($errors > 0) {
                echo "<p style='color: orange;'>$errors registros con errores</p>";
            }
            
            return $errors == 0;
            
        } catch (Exception $e) {
            echo "<p style='color: red;'>Error migrando tabla $tableName: " . $e->getMessage() . "</p>";
            return false;
        }
    }
    
    // Migrar tablas en orden correcto (respetando claves foráneas)
    $tables = [
        'usuarios',
        'organizaciones',
        'directivos',
        'proyectos',
        'documentos',
        'directivas',
        'historial',
        'accesos',
        'login_intentos'
    ];
    
    foreach ($tables as $table) {
        migrateTable($table, $sqlite, $mysql);
    }
    
    // Reactivar claves foráneas y configuración normal
    $mysql->exec("SET FOREIGN_KEY_CHECKS = 1");
    $mysql->exec("SET sql_log_bin = 1");
    
    echo "<h2>Migración completada</h2>";
    echo "<p style='color: green; font-weight: bold;'>¡Migración finalizada con éxito!</p>";
    
    // Mostrar estadísticas
    echo "<h3>Estadísticas finales:</h3>";
    foreach ($tables as $table) {
        try {
            $count = $mysql->query("SELECT COUNT(*) as count FROM $table")->fetch()['count'];
            echo "<p><strong>$table:</strong> $count registros</p>";
        } catch (Exception $e) {
            echo "<p><strong>$table:</strong> Error al contar registros</p>";
        }
    }
    
} catch (Exception $e) {
    echo "<h2>Error crítico</h2>";
    echo "<p style='color: red;'>" . $e->getMessage() . "</p>";
    echo "<h3>Soluciones posibles:</h3>";
    echo "<ul>";
    echo "<li>Verificar que la base de datos MySQL exista</li>";
    echo "<li>Verificar credenciales de MySQL</li>";
    echo "<li>Ejecutar primero el script schema_mysql.sql</li>";
    echo "<li>Verificar permisos del usuario MySQL</li>";
    echo "</ul>";
}
?>
