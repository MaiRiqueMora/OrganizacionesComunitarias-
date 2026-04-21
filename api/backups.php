<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: backups.php
 * 
 * DESCRIPCIÓN:
 * API REST para gestión de backups de la base de datos MySQL/MariaDB.
 * Administra la creación, descarga y eliminación de copias de seguridad.
 * 
 * FUNCIONALIDADES:
 * - Creación de backups automáticos de la base de datos
 * - Listado de backups disponibles
 * - Descarga de archivos de backup
 * - Eliminación de backups antiguos
 * - Compresión de archivos en formato ZIP
 * - Gestión de directorio de backups
 * 
 * ENDPOINTS:
 * - GET    /api/backups.php?action=list    - Listar backups disponibles
 * - POST   /api/backups.php?action=create   - Crear nuevo backup
 * - GET    /api/backups.php?action=download&file=X - Descargar backup
 * - DELETE /api/backups.php?action=delete&file=X - Eliminar backup
 * 
 * DIRECTORIO DE BACKUPS:
 * - Ubicación: config/backups/ (junto a munidb.db)
 * - Formato: archivos .zip comprimidos
 * - Permisos: 0755 para directorio
 * - Creación automática si no existe
 * 
 * SEGURIDAD:
 * - Requiere rol administrador (requireRol)
 * - Validación de nombres de archivos
 * - Control de acceso por permisos
 * - Sanitización de rutas de archivo
 * 
 * NOMBRES DE ARCHIVOS:
 * - Formato: backup_YYYY-MM-DD_HH-mm-ss.zip
 * - Contenido: archivo munidb.db comprimido
 * - Timestamp: fecha y hora de creación
 * 
 * DEPENDENCIAS:
 * - Extensión ZIP de PHP
 * - Funciones de sistema de archivos
 * - Base de datos MySQL/MariaDB 
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Usar sessionUser para no bloquear completamente
$user = sessionUser();

// Verificar permisos de administrador
if (!$user || !isAdmin()) {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Se requiere rol administrador']);
    exit;
}

$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Directorio de backups (en la carpeta del proyecto, no depende de DB_PATH)
$backupDir = rtrim(str_replace('\\', '/', __DIR__ . '/../backups/'), '/') . '/';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

if ($method === 'GET' && $action === 'list') {
    $files = glob($backupDir . '*.zip') ?: [];
    rsort($files);
    $list = array_map(fn($f) => [
        'nombre'  => basename($f),
        'tamanio' => filesize($f),
        'fecha'   => date('Y-m-d H:i:s', filemtime($f)),
    ], $files);
    ob_end_clean();
    echo json_encode(['ok' => true, 'data' => $list]);
    exit;
}

if ($method === 'POST' && $action === 'crear') {
    $zipName = 'backup_' . date('Ymd_His') . '.zip';
    $zipPath = $backupDir . $zipName;

    if (!class_exists('ZipArchive')) {
        ob_end_clean();
        echo json_encode(['ok' => false, 'error' => 'La extensión ZipArchive no está disponible.']);
        exit;
    }

    // Crear backup de MySQL usando mysqldump
    $tmpSql = sys_get_temp_dir() . '/backup_' . time() . '.sql';
    
    // Obtener configuración de la base de datos
    require_once __DIR__ . '/../config/config.php';
    $dbConfig = getDatabaseConfig();
    
    // Construir comando mysqldump
    $cmd = sprintf(
        'mysqldump -h %s -u %s %s %s > %s 2>&1',
        escapeshellarg($dbConfig['host']),
        escapeshellarg($dbConfig['username']),
        $dbConfig['password'] ? '-p' . escapeshellarg($dbConfig['password']) : '',
        escapeshellarg($dbConfig['database']),
        escapeshellarg($tmpSql)
    );
    
    exec($cmd, $output, $returnCode);
    
    if ($returnCode !== 0 || !file_exists($tmpSql) || filesize($tmpSql) === 0) {
        // Fallback: crear backup usando PDO si mysqldump falla
        try {
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            $sql = "-- Backup MySQL generado el " . date('Y-m-d H:i:s') . "\n\n";
            $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
            
            foreach ($tables as $table) {
                $sql .= "-- Estructura de tabla `$table`\n";
                $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
                $sql .= $create['Create Table'] . ";\n\n";
                
                // Datos
                $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
                if ($rows) {
                    $sql .= "-- Datos de tabla `$table`\n";
                    foreach ($rows as $row) {
                        $values = array_map(function($v) use ($pdo) {
                            return $v === null ? 'NULL' : $pdo->quote($v);
                        }, $row);
                        $sql .= "INSERT INTO `$table` VALUES (" . implode(',', $values) . ");\n";
                    }
                    $sql .= "\n";
                }
            }
            $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
            file_put_contents($tmpSql, $sql);
        } catch (Exception $e) {
            ob_end_clean();
            echo json_encode(['ok' => false, 'error' => 'No se pudo crear el backup: ' . $e->getMessage()]);
            exit;
        }
    }

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($tmpSql);
        ob_end_clean();
        echo json_encode(['ok' => false, 'error' => 'No se pudo crear el archivo ZIP en ' . $backupDir]);
        exit;
    }

    $zip->addFile($tmpSql, 'database_backup.sql');

    // Archivos subidos
    $uploadsDir = realpath(__DIR__ . '/../uploads/');
    if ($uploadsDir && is_dir($uploadsDir)) {
        $uploadsDir = rtrim(str_replace('\\', '/', $uploadsDir), '/') . '/';
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploadsDir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iter as $file) {
            if (!$file->isFile()) continue;
            $filePath = str_replace('\\', '/', $file->getPathname());
            $relative = 'uploads/' . ltrim(substr($filePath, strlen($uploadsDir)), '/');
            $zip->addFile($filePath, $relative);
        }
    }

    $zip->close();
    @unlink($tmpSql);

    // Conservar solo los últimos 10
    $todos = glob($backupDir . '*.zip') ?: [];
    rsort($todos);
    foreach (array_slice($todos, 10) as $viejo) @unlink($viejo);

    if (function_exists('logHistorial')) {
        logHistorial('backups', 0, 'crear', "Backup creado: $zipName", $user['id']);
    }

    ob_end_clean();
    echo json_encode(['ok' => true, 'nombre' => $zipName, 'tamanio' => filesize($zipPath)]);
    exit;
}

if ($method === 'GET' && $action === 'descargar') {
    $nombre = basename($_GET['nombre'] ?? '');
    $path   = $backupDir . $nombre;
    if (!$nombre || !file_exists($path) || !str_ends_with($nombre, '.zip')) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Archivo no encontrado.']);
        exit;
    }
    ob_end_clean();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $nombre . '"');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

if ($method === 'DELETE') {
    $nombre = basename($_GET['nombre'] ?? '');
    $path   = $backupDir . $nombre;
    if (!$nombre || !file_exists($path)) {
        ob_end_clean();
        echo json_encode(['ok' => false, 'error' => 'Archivo no encontrado.']);
        exit;
    }
    unlink($path);
    if (function_exists('logHistorial')) {
        logHistorial('backups', 0, 'eliminar', "Backup eliminado: $nombre", $user['id']);
    }
    ob_end_clean();
    echo json_encode(['ok' => true]);
    exit;
}

ob_end_clean();
echo json_encode(['ok' => false, 'error' => 'Acción no válida.']);
