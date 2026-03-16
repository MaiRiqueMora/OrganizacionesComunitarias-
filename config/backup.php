<?php

/* ============================================================
   backup.php — Sistema de backup automático y versionamiento
   ============================================================ */

/**
 * Realiza backup completo de la base de datos
 * @param string $backupPath Ruta donde guardar el backup
 * @return array Resultado de la operación
 */
function createDatabaseBackup($backupPath = null) {
    if (!$backupPath) {
        $backupPath = __DIR__ . '/../backups/database_' . date('Y-m-d_H-i-s') . '.sql';
    }
    
    // Crear directorio si no existe
    $backupDir = dirname($backupPath);
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    try {
        $pdo = getDB();
        
        // Obtener todas las tablas
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        
        $backup = "-- ============================================================\n";
        $backup .= "-- Backup de Base de Datos - Sistema Municipal\n";
        $backup .= "-- Fecha: " . date('Y-m-d H:i:s') . "\n";
        $backup .= "-- Generado automáticamente por el sistema\n";
        $backup .= "-- ============================================================\n\n";
        
        foreach ($tables as $table) {
            $backup .= "--\n-- Estructura de tabla: $table\n--\n";
            
            // Obtener estructura
            $createTable = $pdo->query("SHOW CREATE TABLE `$table`")->fetchColumn();
            $backup .= $createTable . ";\n\n";
            
            // Obtener datos
            $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($rows)) {
                $backup .= "-- Datos de tabla: $table\n--\n";
                $backup .= "INSERT INTO `$table` (";
                $backup .= implode(", ", array_map(function($field) {
                    return "`$field`";
                }, array_keys($rows[0])));
                $backup .= ") VALUES\n";
                
                foreach ($rows as $row) {
                    $values = array_map(function($value) {
                        if ($value === null) return 'NULL';
                        if (is_string($value)) return "'" . addslashes($value) . "'";
                        return $value;
                    }, $row);
                    
                    $backup .= "(" . implode(", ", $values) . "),\n";
                }
                $backup = rtrim($backup, ",\n") . ";\n\n";
            }
        }
        
        // Guardar backup
        file_put_contents($backupPath, $backup);
        
        // Comprimir backup
        $zipPath = $backupPath . '.zip';
        createZip([$backupPath], $zipPath);
        
        // Eliminar archivo SQL temporal
        unlink($backupPath);
        
        // Limpiar backups antiguos (mantener últimos 10)
        cleanupOldBackups(dirname($backupPath), 10);
        
        return [
            'success' => true,
            'file' => basename($zipPath),
            'size' => filesize($zipPath),
            'tables' => count($tables),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Realiza backup de archivos del sistema
 * @param string $backupPath Ruta donde guardar el backup
 * @return array Resultado de la operación
 */
function createFilesBackup($backupPath = null) {
    if (!$backupPath) {
        $backupPath = __DIR__ . '/../backups/files_' . date('Y-m-d_H-i-s') . '.zip';
    }
    
    try {
        $directoriesToBackup = [
            __DIR__ . '/../api',
            __DIR__ . '/../config',
            __DIR__ . '/../css',
            __DIR__ . '/../js',
            __DIR__ . '/../pages'
        ];
        
        $filesToBackup = [];
        
        foreach ($directoriesToBackup as $dir) {
            if (is_dir($dir)) {
                $files = array_diff(scandir($dir), ['.', '..']);
                foreach ($files as $file) {
                    $fullPath = $dir . '/' . $file;
                    if (is_file($fullPath)) {
                        $filesToBackup[] = $fullPath;
                    }
                }
            }
        }
        
        // Crear backup ZIP
        createZip($filesToBackup, $backupPath);
        
        // Limpiar backups antiguos (mantener últimos 5)
        cleanupOldBackups(dirname($backupPath), 5, 'files_');
        
        return [
            'success' => true,
            'file' => basename($backupPath),
            'size' => filesize($backupPath),
            'files_count' => count($filesToBackup),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Crea un archivo ZIP a partir de archivos
 * @param array $files Lista de archivos a comprimir
 * @param string $zipPath Ruta del ZIP a crear
 * @return bool
 */
function createZip($files, $zipPath) {
    $zip = new ZipArchive();
    
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
        foreach ($files as $file) {
            if (file_exists($file)) {
                $relativePath = str_replace(__DIR__ . '/../', '', $file);
                $zip->addFile($file, $relativePath);
            }
        }
        $zip->close();
        return true;
    }
    
    return false;
}

/**
 * Limpia backups antiguos manteniendo los últimos N
 * @param string $backupDir Directorio de backups
 * @param int $keepCount Cantidad a mantener
 * @param string $prefix Prefijo de archivos (opcional)
 */
function cleanupOldBackups($backupDir, $keepCount, $prefix = '') {
    if (!is_dir($backupDir)) return;
    
    $files = glob($backupDir . '/' . $prefix . '*');
    if (empty($files)) return;
    
    // Ordenar por fecha de modificación (más nuevo primero)
    usort($files, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });
    
    // Eliminar archivos excedentes
    $filesToDelete = array_slice($files, $keepCount);
    foreach ($filesToDelete as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

/**
 * Obtiene lista de backups disponibles
 * @param string $type Tipo de backup ('database', 'files', 'all')
 * @return array Lista de backups
 */
function getBackupsList($type = 'all') {
    $backupDir = __DIR__ . '/../backups';
    
    if (!is_dir($backupDir)) {
        return [];
    }
    
    $files = glob($backupDir . '/*');
    $backups = [];
    
    foreach ($files as $file) {
        if (is_file($file)) {
            $info = [
                'name' => basename($file),
                'path' => $file,
                'size' => filesize($file),
                'date' => date('Y-m-d H:i:s', filemtime($file)),
                'type' => strpos($file, 'database_') !== false ? 'database' : 'files'
            ];
            
            if ($type === 'all' || $info['type'] === $type) {
                $backups[] = $info;
            }
        }
    }
    
    // Ordenar por fecha (más nuevo primero)
    usort($backups, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });
    
    return $backups;
}

/**
 * Restaura un backup de base de datos
 * @param string $backupFile Ruta del archivo de backup
 * @return array Resultado de la operación
 */
function restoreDatabaseBackup($backupFile) {
    if (!file_exists($backupFile)) {
        return [
            'success' => false,
            'error' => 'Archivo de backup no encontrado'
        ];
    }
    
    try {
        $pdo = getDB();
        
        // Si es ZIP, extraer primero
        if (pathinfo($backupFile, PATHINFO_EXTENSION) === 'zip') {
            $zip = new ZipArchive();
            $tempDir = sys_get_temp_dir() . '/db_backup_' . time();
            
            if ($zip->open($backupFile) === TRUE) {
                $zip->extractTo($tempDir);
                $zip->close();
                
                // Buscar archivo SQL extraído
                $sqlFiles = glob($tempDir . '/*.sql');
                if (!empty($sqlFiles)) {
                    $backupFile = $sqlFiles[0];
                }
            }
        }
        
        // Ejecutar SQL del backup
        $sql = file_get_contents($backupFile);
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        $pdo->beginTransaction();
        
        foreach ($statements as $statement) {
            if (!empty($statement)) {
                $pdo->exec($statement);
            }
        }
        
        $pdo->commit();
        
        // Limpiar archivos temporales
        if (isset($tempDir) && is_dir($tempDir)) {
            array_map('unlink', glob($tempDir . '/*'));
            rmdir($tempDir);
        }
        
        return [
            'success' => true,
            'message' => 'Base de datos restaurada exitosamente'
        ];
        
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Programa backup automático según configuración
 * @return void
 */
function scheduleAutoBackup() {
    $configFile = __DIR__ . '/backup_config.json';
    
    if (!file_exists($configFile)) {
        // Configuración por defecto
        $config = [
            'auto_backup' => true,
            'database_frequency' => 'daily',      // daily, weekly, monthly
            'files_frequency' => 'weekly',       // daily, weekly, monthly
            'max_backups' => [
                'database' => 10,
                'files' => 5
            ],
            'last_backup' => [
                'database' => null,
                'files' => null
            ]
        ];
        file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT));
    } else {
        $config = json_decode(file_get_contents($configFile), true);
    }
    
    if (!$config['auto_backup']) {
        return;
    }
    
    $now = new DateTime();
    $lastDbBackup = $config['last_backup']['database'] ? new DateTime($config['last_backup']['database']) : null;
    $lastFilesBackup = $config['last_backup']['files'] ? new DateTime($config['last_backup']['files']) : null;
    
    $shouldBackupDb = shouldBackup($now, $lastDbBackup, $config['database_frequency']);
    $shouldBackupFiles = shouldBackup($now, $lastFilesBackup, $config['files_frequency']);
    
    $updated = false;
    
    if ($shouldBackupDb) {
        $result = createDatabaseBackup();
        if ($result['success']) {
            $config['last_backup']['database'] = $result['timestamp'];
            $updated = true;
            
            // Registrar en log
            logBackupEvent('database', $result);
        }
    }
    
    if ($shouldBackupFiles) {
        $result = createFilesBackup();
        if ($result['success']) {
            $config['last_backup']['files'] = $result['timestamp'];
            $updated = true;
            
            // Registrar en log
            logBackupEvent('files', $result);
        }
    }
    
    if ($updated) {
        file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT));
    }
}

/**
 * Determina si se debe hacer backup según frecuencia
 * @param DateTime $now Fecha actual
 * @param DateTime|null $last Último backup
 * @param string $frequency Frecuencia (daily, weekly, monthly)
 * @return bool
 */
function shouldBackup($now, $last, $frequency) {
    if (!$last) {
        return true;
    }
    
    switch ($frequency) {
        case 'daily':
            return $now->format('Y-m-d') !== $last->format('Y-m-d');
            
        case 'weekly':
            $weekNow = $now->format('Y-W');
            $weekLast = $last->format('Y-W');
            return $weekNow !== $weekLast;
            
        case 'monthly':
            return $now->format('Y-m') !== $last->format('Y-m');
            
        default:
            return false;
    }
}

/**
 * Registra eventos de backup en log
 * @param string $type Tipo de backup
 * @param array $result Resultado del backup
 * @return void
 */
function logBackupEvent($type, $result) {
    $logFile = __DIR__ . '/../logs/backup.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logEntry = sprintf(
        "[%s] %s backup: %s (%s bytes)\n",
        date('Y-m-d H:i:s'),
        $type,
        $result['success'] ? 'SUCCESS' : 'FAILED',
        $result['size'] ?? 0
    );
    
    if (!$result['success']) {
        $logEntry .= "Error: " . $result['error'] . "\n";
    }
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}
