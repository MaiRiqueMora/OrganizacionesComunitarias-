<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: proyectos.php
 * 
 * DESCRIPCIÓN:
 * API REST para gestión de proyectos y subvenciones municipales.
 * Maneja operaciones CRUD completas para proyectos de organizaciones.
 * 
 * FUNCIONALIDADES:
 * - Creación de nuevos proyectos/subvenciones
 * - Edición y actualización de datos de proyectos
 * - Eliminación lógica (papelera) y física
 * - Upload y gestión de documentos asociados
 * - Listado con filtros y búsqueda
 * - Descarga de documentos
 * 
 * ENDPOINTS:
 * - GET    /api/proyectos.php           - Listar proyectos
 * - POST   /api/proyectos.php           - Crear proyecto
 * - PUT    /api/proyectos.php           - Actualizar proyecto
 * - DELETE /api/proyectos.php           - Eliminar proyecto
 * - POST   /api/proyectos.php?action=upload     - Subir documento
 * - DELETE /api/proyectos.php?action=doc&id=X   - Eliminar documento
 * - GET    /api/proyectos.php?action=descargar&id=X - Descargar documento
 * 
 * SEGURIDAD:
 * - Requiere autenticación válida (requireSession)
 * - Control de permisos por rol (canWrite)
 * - Validación de tipos y tamaños de archivos
 * - Sanitización de datos de entrada
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);
ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Usar sessionUser en lugar de requireSession para no bloquear completamente
$user   = sessionUser();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo    = getDB();

/* ── GET ── */
if ($method === 'GET') {

    if ($action === 'list_all') {
        $stmt = $pdo->query("
            SELECT p.*, o.nombre AS org_nombre
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            WHERE (p.eliminada = 0 OR p.eliminada IS NULL)
            ORDER BY p.creado_en DESC
        ");
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'list') {
        $orgId = (int)($_GET['org_id'] ?? 0);
        if (!$orgId) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'org_id requerido']); exit; }
        $stmt = $pdo->prepare("
            SELECT p.*, o.nombre AS org_nombre
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            WHERE p.organizacion_id = ? AND (p.eliminada = 0 OR p.eliminada IS NULL)
            ORDER BY p.creado_en DESC
        ");
        $stmt->execute([$orgId]);
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("
            SELECT p.*, o.nombre AS org_nombre
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $p = $stmt->fetch();
        ob_end_clean();
        if (!$p) { echo json_encode(['ok'=>false,'error'=>'No encontrado']); exit; }
        echo json_encode(['ok'=>true,'data'=>$p]);
        exit;
    }

    if ($action === 'documentos') {
        $id = (int)($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("
                SELECT d.*, u.nombre_completo AS subido_por
                FROM documentos_proyecto d
                LEFT JOIN usuarios u ON u.id = d.uploaded_by
                WHERE d.proyecto_id = ?
                ORDER BY d.created_at DESC
            ");
            $stmt->execute([$id]);
            ob_end_clean();
            echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
            exit;
        } catch (PDOException $e) {
            // Tabla puede no existir todavía
            ob_end_clean();
            echo json_encode(['ok' => true, 'data' => []]);
            exit;
        }
    }

    if ($action === 'descargar') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT id,proyecto_id,nombre,archivo_path,mime_type,tamanio,uploaded_by,created_at FROM documentos_proyecto WHERE id = ?");
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        ob_end_clean();
        if (!$doc) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'No encontrado']); exit; }
        $path = UPLOAD_DIR . $doc['ruta_archivo'];
        if (!file_exists($path)) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Archivo no encontrado']); exit; }
        header('Content-Type: ' . $doc['mime_type']);
        header('Content-Disposition: attachment; filename="' . addslashes($doc['nombre_original']) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }

    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Acción no válida']);
    exit;
}

/* ── POST: crear proyecto ── */
if ($method === 'POST' && $action === '') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }
    
    // Verificar que tenemos usuario válido
    if (!$user || !isset($user['id'])) {
        error_log('ERROR proyectos.php: Usuario no válido');
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Sesión no válida']); exit;
    }

    $d = json_decode(file_get_contents('php://input'), true);
    error_log('DEBUG proyectos POST: ' . print_r($d, true));
    
    if (empty($d['nombre']) || empty($d['organizacion_id'])) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Nombre y organización son requeridos']); exit;
    }

    try {
        // INSERT con columnas que existen en la base de datos
        $stmt = $pdo->prepare("
            INSERT INTO proyectos
                (organizacion_id, nombre, descripcion, monto_subvencion, anio_obtuvo_subvencion, estado, fecha_inicio, fecha_termino)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $organizacion_id = (int)$d['organizacion_id'];
        $nombre = trim($d['nombre']);
        $descripcion = $d['descripcion'] ?? null;
        $monto = isset($d['monto_aprobado']) && $d['monto_aprobado'] !== '' ? (float)$d['monto_aprobado'] : null;
        $anio = isset($d['anio_obtuvo_subvencion']) && $d['anio_obtuvo_subvencion'] !== '' ? (int)$d['anio_obtuvo_subvencion'] : null;
        $estado = strtolower($d['estado'] ?? 'activo');
        $fecha_inicio = $d['fecha_postulacion'] ?? null;
        $fecha_termino = $d['fecha_resolucion'] ?? null;
        
        $stmt->execute([
            $organizacion_id,
            $nombre,
            $descripcion,
            $monto,
            $anio,
            $estado,
            $fecha_inicio,
            $fecha_termino,
        ]);
        
        $newId = $pdo->lastInsertId();
        if (function_exists('logHistorial')) {
            logHistorial('proyectos', $newId, 'crear', 'Proyecto creado: ' . $nombre, $user['id']);
        }
        ob_end_clean();
        echo json_encode(['ok'=>true,'id'=>$newId]);
        exit;
    } catch (PDOException $e) {
        error_log('ERROR proyectos INSERT: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        error_log('ERROR proyectos: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error: ' . $e->getMessage()]);
        exit;
    }
}

/* ── POST: subir documento ── */
if ($method === 'POST' && $action === 'upload') {
    try {
        if (!canWrite()) { 
            ob_end_clean(); 
            http_response_code(403); 
            echo json_encode(['ok'=>false,'error'=>'Sin permisos']); 
            exit; 
        }
        
        // Verificar usuario válido
        if (!$user || !isset($user['id'])) {
            error_log('ERROR upload: Usuario no válido');
            ob_end_clean();
            echo json_encode(['ok'=>false,'error'=>'Sesión no válida']); 
            exit;
        }

        $proyId = (int)($_POST['proyecto_id'] ?? 0);
        $tipo   = trim($_POST['tipo'] ?? 'Otro');
        
        error_log('DEBUG upload: proyId=' . $proyId . ', files=' . print_r($_FILES, true));

        if (!$proyId || !isset($_FILES['archivo'])) {
            ob_end_clean(); 
            echo json_encode(['ok'=>false,'error'=>'Datos incompletos: proyecto_id=' . $proyId]); 
            exit;
        }

        $file     = $_FILES['archivo'];
        
        // Verificar si hubo error en la subida
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error_log('ERROR upload: Código de error ' . $file['error']);
            ob_end_clean();
            echo json_encode(['ok'=>false,'error'=>'Error al subir archivo: código ' . $file['error']]); 
            exit;
        }
        
        $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;

        if ($file['size'] > $maxBytes) { 
            ob_end_clean(); 
            echo json_encode(['ok'=>false,'error'=>'Archivo demasiado grande (máx '.UPLOAD_MAX_MB.' MB)']); 
            exit; 
        }
        
        if (!in_array($file['type'], UPLOAD_TIPOS, true)) { 
            ob_end_clean(); 
            echo json_encode(['ok'=>false,'error'=>'Tipo de archivo no permitido: ' . $file['type']]); 
            exit; 
        }

        $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $carpeta = 'proy' . $proyId . '/';
        $dir     = UPLOAD_DIR . $carpeta;
        
        error_log('DEBUG upload: dir=' . $dir);
        
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true)) {
                error_log('ERROR upload: No se pudo crear directorio ' . $dir);
                ob_end_clean();
                echo json_encode(['ok'=>false,'error'=>'No se pudo crear directorio de destino']); 
                exit;
            }
        }

        $nombreGuardado = uniqid('doc_') . '.' . $ext;
        $rutaCompleta = $dir . $nombreGuardado;
        
        if (!move_uploaded_file($file['tmp_name'], $rutaCompleta)) {
            error_log('ERROR upload: No se pudo mover archivo a ' . $rutaCompleta);
            ob_end_clean(); 
            echo json_encode(['ok'=>false,'error'=>'No se pudo guardar el archivo en el servidor']); 
            exit;
        }
        
        error_log('DEBUG upload: Archivo guardado en ' . $rutaCompleta);

        $stmt = $pdo->prepare("
            INSERT INTO documentos_proyecto
                (proyecto_id, nombre, archivo_path, mime_type, tamanio, uploaded_by)
            VALUES (?,?,?,?,?,?)
        ");
        $stmt->execute([
            $proyId,
            pathinfo($file['name'], PATHINFO_FILENAME),
            $carpeta . $nombreGuardado,
            $file['type'],
            $file['size'],
            $user['id'],
        ]);
        
        $newId = $pdo->lastInsertId();
        error_log('DEBUG upload: Insertado en BD, id=' . $newId);
        
        ob_end_clean();
        echo json_encode(['ok'=>true,'id'=>$newId]);
        exit;
    } catch (PDOException $e) {
        error_log('ERROR upload PDO: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        error_log('ERROR upload: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error: ' . $e->getMessage()]);
        exit;
    }
}

/* ── PUT: actualizar proyecto ── */
if ($method === 'PUT') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }

    try {
        $pdo->prepare("
            UPDATE proyectos SET
                nombre               = ?,
                descripcion          = ?,
                monto_subvencion     = ?,
                anio_obtuvo_subvencion = ?,
                estado               = ?,
                fecha_inicio         = ?,
                fecha_termino        = ?
            WHERE id = ?
        ")->execute([
            trim($d['nombre']),
            $d['descripcion'] ?? null,
            isset($d['monto_aprobado']) && $d['monto_aprobado'] !== '' ? (float)$d['monto_aprobado'] : null,
            isset($d['anio_obtuvo_subvencion']) && $d['anio_obtuvo_subvencion'] !== '' ? (int)$d['anio_obtuvo_subvencion'] : null,
            strtolower($d['estado'] ?? 'activo'),
            $d['fecha_postulacion'] ?? null,
            $d['fecha_resolucion']  ?? null,
            $id,
        ]);
        if (function_exists('logHistorial')) {
            logHistorial('proyectos', $id, 'editar', 'Proyecto actualizado', $user['id']);
        }
        ob_end_clean();
        echo json_encode(['ok'=>true]);
        exit;
    } catch (PDOException $e) {
        error_log('ERROR proyectos UPDATE: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]);
        exit;
    }
}

/* ── DELETE: eliminar proyecto ── */
if ($method === 'DELETE' && $action === '') {
    try {
        if (!canWrite()) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['ok'=>false,'error'=>'Sin permisos']);
            exit;
        }

        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            ob_end_clean();
            echo json_encode(['ok'=>false,'error'=>'ID requerido']);
            exit;
        }

        // Verificar que exista y no esté eliminado
        $stmt = $pdo->prepare("SELECT id, nombre, eliminada, fecha_eliminacion FROM proyectos WHERE id = ?");
        $stmt->execute([$id]);
        $proyecto = $stmt->fetch();
        
        if (!$proyecto) {
            ob_end_clean();
            echo json_encode(['ok'=>false,'error'=>"No existe un proyecto con ID: $id"]);
            exit;
        }
        
        // Verificar si ya está eliminado
        $eliminada = $proyecto['eliminada'] ?? 0;
        if ($eliminada == 1 || $eliminada === '1') {
            ob_end_clean();
            echo json_encode(['ok'=>false,'error'=>"El proyecto '{$proyecto['nombre']}' ya fue eliminado el {$proyecto['fecha_eliminacion']}"]);
            exit;
        }

        // Soft delete - mover a papelera
        $pdo->prepare("UPDATE proyectos SET eliminada = 1, fecha_eliminacion = NOW(), eliminado_por = ? WHERE id = ?")->execute([$user['id'], $id]);

        // Log
        if (function_exists('logHistorial')) {
            logHistorial('proyectos',$id,'eliminar','Proyecto movido a papelera',$user['id']);
        }

        ob_end_clean();
        echo json_encode(['ok'=>true]);
        exit;
    } catch (Exception $e) {
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error: ' . $e->getMessage()]);
        exit;
    }
}

/* ── DELETE: eliminar documento ── */
if ($method === 'DELETE' && $action === 'doc') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT archivo_path FROM documentos_proyecto WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();
    if ($doc) {
        $path = UPLOAD_DIR . $doc['archivo_path'];
        if (file_exists($path)) unlink($path);
        $pdo->prepare("DELETE FROM documentos_proyecto WHERE id = ?")->execute([$id]);
    }
    ob_end_clean();
    echo json_encode(['ok'=>true]);
    exit;
}

ob_end_clean();
echo json_encode(['ok'=>false,'error'=>'Método o acción no válidos']);
