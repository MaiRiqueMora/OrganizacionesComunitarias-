<?php
/* ============================================================
   api/backup.php — API para gestión de backups
   GET ?action=list → lista de backups
   POST ?action=create_db → backup de base de datos
   POST ?action=create_files → backup de archivos
   POST ?action=restore → restaurar backup
   ============================================================ */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/backup.php';

$user = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

// Solo administradores pueden gestionar backups
if ($user['rol'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acceso denegado. Solo administradores.']);
    exit;
}

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $type = $_GET['type'] ?? 'all';
            json_out(['ok' => true, 'data' => getBackupsList($type)]);
            break;
            
        case 'config':
            $configFile = __DIR__ . '/../config/backup_config.json';
            $config = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : [];
            json_out(['ok' => true, 'data' => $config]);
            break;
            
        case 'download':
            $filename = $_GET['file'] ?? '';
            $filepath = __DIR__ . '/../backups/' . basename($filename);
            
            if (!file_exists($filepath)) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Archivo no encontrado.']);
                exit;
            }
            
            // Descargar archivo
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($filepath) . '"');
            header('Content-Length: ' . filesize($filepath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            readfile($filepath);
            exit;
            
        default:
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Acción no válida.']);
    }
    exit;
}

// ── POST ─────────────────────────────────────────────────────
if ($method === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'create_db':
            $result = createDatabaseBackup();
            json_out($result);
            break;
            
        case 'create_files':
            $result = createFilesBackup();
            json_out($result);
            break;
            
        case 'restore':
            $filename = $_POST['file'] ?? '';
            $filepath = __DIR__ . '/../backups/' . basename($filename);
            
            if (!file_exists($filepath)) {
                echo json_encode(['ok' => false, 'error' => 'Archivo de backup no encontrado.']);
                exit;
            }
            
            // Confirmación de restauración
            if (!isset($_POST['confirmed']) || $_POST['confirmed'] !== 'true') {
                echo json_encode([
                    'ok' => false,
                    'requires_confirmation' => true,
                    'message' => 'Esta acción sobreescribirá toda la base de datos actual. ¿Está seguro?',
                    'file' => $filename
                ]);
                exit;
            }
            
            $result = restoreDatabaseBackup($filepath);
            json_out($result);
            break;
            
        case 'update_config':
            $config = json_decode($_POST['config'] ?? '{}', true);
            
            // Validar configuración
            $allowedFrequencies = ['daily', 'weekly', 'monthly'];
            if (!in_array($config['database_frequency'] ?? 'daily', $allowedFrequencies)) {
                echo json_encode(['ok' => false, 'error' => 'Frecuencia de base de datos no válida.']);
                exit;
            }
            
            if (!in_array($config['files_frequency'] ?? 'weekly', $allowedFrequencies)) {
                echo json_encode(['ok' => false, 'error' => 'Frecuencia de archivos no válida.']);
                exit;
            }
            
            $configFile = __DIR__ . '/../config/backup_config.json';
            file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT));
            
            echo json_encode(['ok' => true, 'message' => 'Configuración actualizada.']);
            break;
            
        case 'delete':
            $filename = $_POST['file'] ?? '';
            $filepath = __DIR__ . '/../backups/' . basename($filename);
            
            if (!file_exists($filepath)) {
                echo json_encode(['ok' => false, 'error' => 'Archivo no encontrado.']);
                exit;
            }
            
            if (unlink($filepath)) {
                echo json_encode(['ok' => true, 'message' => 'Backup eliminado.']);
            } else {
                echo json_encode(['ok' => false, 'error' => 'Error al eliminar backup.']);
            }
            break;
            
        case 'run_auto':
            scheduleAutoBackup();
            echo json_encode(['ok' => true, 'message' => 'Backup automático ejecutado.']);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Acción no válida.']);
    }
    exit;
}

// Función helper para salida JSON
function json_out($data) {
    echo json_encode($data);
}
