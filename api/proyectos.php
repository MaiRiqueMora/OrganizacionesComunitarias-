<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

requireSession();
$user   = sessionUser();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo    = getDB();

/* G */
if ($method === 'GET') {

    if ($action === 'list_all') {
        $stmt = $pdo->query("
            SELECT p.*, o.nombre AS org_nombre, u.nombre_completo AS creado_por
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            LEFT JOIN usuarios u ON u.id = p.created_by
            ORDER BY p.created_at DESC
        ");
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'list') {
        $orgId = (int)($_GET['org_id'] ?? 0);
        if (!$orgId) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'org_id requerido']); exit; }
        $stmt = $pdo->prepare("
            SELECT p.*, o.nombre AS org_nombre, u.nombre_completo AS creado_por
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            LEFT JOIN usuarios u ON u.id = p.created_by
            WHERE p.organizacion_id = ?
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$orgId]);
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("
            SELECT p.*, o.nombre AS org_nombre, u.nombre_completo AS creado_por
            FROM proyectos p
            LEFT JOIN organizaciones o ON o.id = p.organizacion_id
            LEFT JOIN usuarios u ON u.id = p.created_by
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
        $stmt = $pdo->prepare("
            SELECT d.*, u.nombre_completo AS subido_por
            FROM documentos_proyecto d
            LEFT JOIN usuarios u ON u.id = d.uploaded_by
            WHERE d.proyecto_id = ?
            ORDER BY d.created_at DESC
        ");
        $stmt->execute([$id]);
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'descargar') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM documentos_proyecto WHERE id = ?");
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

/* Post crear proyecto */
if ($method === 'POST' && $action === '') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $d = json_decode(file_get_contents('php://input'), true);
    if (empty($d['nombre']) || empty($d['organizacion_id'])) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Nombre y organización son requeridos']); exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO proyectos
            (organizacion_id, nombre, descripcion, fondo_programa, monto_solicitado,
             monto_aprobado, estado, fecha_postulacion, fecha_resolucion, observaciones, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        (int)$d['organizacion_id'],
        trim($d['nombre']),
        $d['descripcion']        ?? null,
        $d['fondo_programa']     ?? null,
        isset($d['monto_solicitado']) && $d['monto_solicitado'] !== '' ? (float)$d['monto_solicitado'] : null,
        isset($d['monto_aprobado'])   && $d['monto_aprobado']   !== '' ? (float)$d['monto_aprobado']   : null,
        $d['estado']             ?? 'postulando',
        $d['fecha_postulacion']  ?? null,
        $d['fecha_resolucion']   ?? null,
        $d['observaciones']      ?? null,
        $user['id'],
    ]);
    $newId = $pdo->lastInsertId();
    logHistorial('proyectos', $newId, 'crear', 'Proyecto creado: ' . trim($d['nombre']), $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true,'id'=>$newId]);
    exit;
}

/* Post: subir documento */
if ($method === 'POST' && $action === 'upload') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $proyId = (int)($_POST['proyecto_id'] ?? 0);
    $tipo   = trim($_POST['tipo'] ?? 'Otro');

    if (!$proyId || !isset($_FILES['archivo'])) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Datos incompletos']); exit;
    }

    $file     = $_FILES['archivo'];
    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;

    if ($file['size'] > $maxBytes) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Archivo demasiado grande (máx '.UPLOAD_MAX_MB.' MB)']); exit; }
    if (!in_array($file['type'], UPLOAD_TIPOS, true)) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Tipo de archivo no permitido']); exit; }

    $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $carpeta = 'proy' . $proyId . '/';
    $dir     = UPLOAD_DIR . $carpeta;
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $nombreGuardado = uniqid('doc_') . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . $nombreGuardado)) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No se pudo guardar el archivo']); exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO documentos_proyecto
            (proyecto_id, tipo, nombre, ruta_archivo, nombre_original, mime_type, tamanio_bytes, uploaded_by)
        VALUES (?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $proyId, $tipo,
        pathinfo($file['name'], PATHINFO_FILENAME),
        $carpeta . $nombreGuardado,
        $file['name'],
        $file['type'],
        $file['size'],
        $user['id'],
    ]);
    ob_end_clean();
    echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);
    exit;
}

/* Put actualizar proyecto */
if ($method === 'PUT') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }

    $pdo->prepare("
        UPDATE proyectos SET
            nombre            = ?,
            descripcion       = ?,
            fondo_programa    = ?,
            monto_solicitado  = ?,
            monto_aprobado    = ?,
            estado            = ?,
            fecha_postulacion = ?,
            fecha_resolucion  = ?,
            observaciones     = ?,
            updated_at        = datetime('now','localtime')
        WHERE id = ?
    ")->execute([
        trim($d['nombre']),
        $d['descripcion']       ?? null,
        $d['fondo_programa']    ?? null,
        isset($d['monto_solicitado']) && $d['monto_solicitado'] !== '' ? (float)$d['monto_solicitado'] : null,
        isset($d['monto_aprobado'])   && $d['monto_aprobado']   !== '' ? (float)$d['monto_aprobado']   : null,
        $d['estado']            ?? 'postulando',
        $d['fecha_postulacion'] ?? null,
        $d['fecha_resolucion']  ?? null,
        $d['observaciones']     ?? null,
        $id,
    ]);
    logHistorial('proyectos', $id, 'editar', 'Proyecto actualizado', $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true]);
    exit;
}

/* Delete eliminar proyecto */
if ($method === 'DELETE' && $action === '') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }

    $docs = $pdo->prepare("SELECT ruta_archivo FROM documentos_proyecto WHERE proyecto_id = ?");
    $docs->execute([$id]);
    foreach ($docs->fetchAll() as $doc) {
        $path = UPLOAD_DIR . $doc['ruta_archivo'];
        if (file_exists($path)) unlink($path);
    }
    $pdo->prepare("DELETE FROM proyectos WHERE id = ?")->execute([$id]);
    logHistorial('proyectos', $id, 'eliminar', 'Proyecto eliminado', $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true]);
    exit;
}

/* Delete eliminar documento */
if ($method === 'DELETE' && $action === 'doc') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }

    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT ruta_archivo FROM documentos_proyecto WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();
    if ($doc) {
        $path = UPLOAD_DIR . $doc['ruta_archivo'];
        if (file_exists($path)) unlink($path);
        $pdo->prepare("DELETE FROM documentos_proyecto WHERE id = ?")->execute([$id]);
    }
    ob_end_clean();
    echo json_encode(['ok'=>true]);
    exit;
}

ob_end_clean();
echo json_encode(['ok'=>false,'error'=>'Método o acción no válidos']);
