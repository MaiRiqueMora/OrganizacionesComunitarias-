<?php

require_once __DIR__ . '/db.php';

/**
 * Lista documentos por organización.
 */
function doc_listByOrg(int $orgId): array {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT d.*, u.nombre_completo AS subido_por
        FROM documentos d
        LEFT JOIN usuarios u ON d.uploaded_by = u.id
        WHERE d.organizacion_id = ?
        ORDER BY d.created_at DESC
    ");
    $stmt->execute([$orgId]);
    return $stmt->fetchAll();
}

/**
 * Obtiene un documento por ID para descarga.
 */
function doc_getForDownload(int $id): ?array {
    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT * FROM documentos WHERE id=?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();
    return $doc ?: null;
}

/**
 * Valida y guarda un archivo subido.
 * Lanza InvalidArgumentException con mensajes de validación.
 */
function doc_upload(array $post, array $files, int $userId): void {
    $orgId = (int)($post['organizacion_id'] ?? 0);
    $tipo  = $post['tipo'] ?? '';
    $nombre = trim($post['nombre'] ?? '');

    if (!$orgId)   { throw new InvalidArgumentException('organizacion_id requerido.'); }
    if (!$tipo)    { throw new InvalidArgumentException('Tipo de documento requerido.'); }
    if (!$nombre)  { throw new InvalidArgumentException('Nombre del documento requerido.'); }
    if (empty($files['archivo'])) { throw new InvalidArgumentException('No se recibió archivo.'); }

    $file     = $files['archivo'];
    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('Error al subir el archivo.');
    }
    if ($file['size'] > $maxBytes) {
        throw new InvalidArgumentException('El archivo supera '.UPLOAD_MAX_MB.'MB.');
    }

    // Validar MIME real
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReal = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mimeReal, UPLOAD_TIPOS, true)) {
        throw new InvalidArgumentException('Tipo de archivo no permitido.');
    }

    // Generar nombre único
    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'org'.$orgId.'_'.time().'_'.bin2hex(random_bytes(4)).'.'.$ext;
    $destDir  = UPLOAD_DIR.'org'.$orgId.'/';
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    $destPath = $destDir.$filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        throw new RuntimeException('No se pudo guardar el archivo.');
    }

    $pdo = getDB();
    $pdo->prepare("INSERT INTO documentos
        (organizacion_id,tipo,nombre,ruta_archivo,nombre_original,mime_type,tamanio_bytes,uploaded_by)
        VALUES (?,?,?,?,?,?,?,?)")
        ->execute([$orgId,$tipo,$nombre,$destPath,$file['name'],$mimeReal,$file['size'],$userId]);

    logHistorial('documentos',(int)$pdo->lastInsertId(),'crear',"Documento subido: $nombre",$userId);
}

/**
 * Elimina un documento (y su archivo) por ID.
 */
function doc_delete(int $id, int $userId): void {
    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT ruta_archivo,nombre FROM documentos WHERE id=?");
    $stmt->execute([$id]); $doc = $stmt->fetch();
    if (!$doc) {
        throw new InvalidArgumentException('No encontrado.');
    }
    if (file_exists($doc['ruta_archivo'])) {
        @unlink($doc['ruta_archivo']);
    }
    $pdo->prepare("DELETE FROM documentos WHERE id=?")->execute([$id]);
    logHistorial('documentos',$id,'eliminar',"Documento eliminado: {$doc['nombre']}",$userId);
}

