<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// Descarga de documento
if ($method === 'GET' && !empty($_GET['download'])) {
    $id   = (int)$_GET['download'];
    $stmt = $pdo->prepare("SELECT * FROM documentos WHERE id=?");
    $stmt->execute([$id]); $doc = $stmt->fetch();
    if (!$doc || !file_exists($doc['ruta_archivo'])) {
        header('Content-Type: application/json');
        echo json_encode(['ok'=>false,'error'=>'Archivo no encontrado.']); exit;
    }
    header('Content-Type: '.$doc['mime_type']);
    header('Content-Disposition: attachment; filename="'.rawurlencode($doc['nombre_original']).'"');
    header('Content-Length: '.filesize($doc['ruta_archivo']));
    header('Cache-Control: private');
    readfile($doc['ruta_archivo']); exit;
}

// Get documentos de una organización
if ($method === 'GET') {
    $orgId = (int)($_GET['org_id'] ?? 0);
    if (!$orgId) { echo json_encode(['ok'=>false,'error'=>'org_id requerido.']); exit; }
    $stmt = $pdo->prepare("
        SELECT d.*, u.nombre_completo AS subido_por
        FROM documentos d
        LEFT JOIN usuarios u ON d.uploaded_by = u.id
        WHERE d.organizacion_id = ?
        ORDER BY d.created_at DESC
    ");
    $stmt->execute([$orgId]);
    echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
}

// Post nuevo documento
if ($method === 'POST') {
    requireRol('administrador','funcionario');

    $orgId = (int)($_POST['organizacion_id'] ?? 0);
    $tipo  = $_POST['tipo'] ?? '';
    $nombre= trim($_POST['nombre'] ?? '');

    if (!$orgId)   { echo json_encode(['ok'=>false,'error'=>'organizacion_id requerido.']); exit; }
    if (!$tipo)    { echo json_encode(['ok'=>false,'error'=>'Tipo de documento requerido.']); exit; }
    if (!$nombre)  { echo json_encode(['ok'=>false,'error'=>'Nombre del documento requerido.']); exit; }
    if (empty($_FILES['archivo'])) { echo json_encode(['ok'=>false,'error'=>'No se recibió archivo.']); exit; }

    $file    = $_FILES['archivo'];
    $maxBytes= UPLOAD_MAX_MB * 1024 * 1024;

    if ($file['error'] !== UPLOAD_ERR_OK)   { echo json_encode(['ok'=>false,'error'=>'Error al subir el archivo.']); exit; }
    if ($file['size'] > $maxBytes)           { echo json_encode(['ok'=>false,'error'=>'El archivo supera '.UPLOAD_MAX_MB.'MB.']); exit; }

    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReal = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mimeReal, UPLOAD_TIPOS)) {
        echo json_encode(['ok'=>false,'error'=>'Tipo de archivo no permitido.']); exit;
    }

    // Generar nombre único
    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'org'.$orgId.'_'.time().'_'.bin2hex(random_bytes(4)).'.'.$ext;
    $destDir  = UPLOAD_DIR.'org'.$orgId.'/';
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    $destPath = $destDir.$filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        echo json_encode(['ok'=>false,'error'=>'No se pudo guardar el archivo.']); exit;
    }

    $pdo->prepare("INSERT INTO documentos
        (organizacion_id,tipo,nombre,ruta_archivo,nombre_original,mime_type,tamanio_bytes,uploaded_by)
        VALUES (?,?,?,?,?,?,?,?)")
        ->execute([$orgId,$tipo,$nombre,$destPath,$file['name'],$mimeReal,$file['size'],$user['id']]);

    logHistorial('documentos',(int)$pdo->lastInsertId(),'crear',"Documento subido: $nombre",$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

// Delete eliminar documento
if ($method === 'DELETE') {
    requireRol('administrador','funcionario');
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    $stmt = $pdo->prepare("SELECT ruta_archivo,nombre FROM documentos WHERE id=?");
    $stmt->execute([$id]); $doc = $stmt->fetch();
    if (!$doc) { echo json_encode(['ok'=>false,'error'=>'No encontrado.']); exit; }
    if (file_exists($doc['ruta_archivo'])) @unlink($doc['ruta_archivo']);
    $pdo->prepare("DELETE FROM documentos WHERE id=?")->execute([$id]);
    logHistorial('documentos',$id,'eliminar',"Documento eliminado: {$doc['nombre']}",$user['id']);
    echo json_encode(['ok'=>true]); exit;
}
