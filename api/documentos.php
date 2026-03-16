<?php
/* ============================================================
   api/documentos.php
   GET  ?org_id=N     → listar documentos de org
   POST (multipart)   → subir documento
   DELETE ?id=N       → eliminar
   GET  ?download=N   → descargar archivo
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/documentos_service.php';
require_once __DIR__ . '/../config/response_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

// ── Descarga (GET especial, cambia headers) ───────────────────
if ($method === 'GET' && !empty($_GET['download'])) {
    $id   = (int)$_GET['download'];
    $doc  = doc_getForDownload($id);
    if (!$doc || !file_exists($doc['ruta_archivo'])) {
        header('Content-Type: application/json');
        json_out(['ok'=>false,'error'=>'Archivo no encontrado.'], 404);
    }
    header('Content-Type: '.$doc['mime_type']);
    header('Content-Disposition: attachment; filename="'.rawurlencode($doc['nombre_original']).'"');
    header('Content-Length: '.filesize($doc['ruta_archivo']));
    header('Cache-Control: private');
    readfile($doc['ruta_archivo']); exit;
}

// ── GET listado ───────────────────────────────────────────────
if ($method === 'GET') {
    $orgId = (int)($_GET['org_id'] ?? 0);
    if (!$orgId) { json_out(['ok'=>false,'error'=>'org_id requerido.'], 400); }
    json_out(['ok'=>true,'data'=>doc_listByOrg($orgId)]);
}

// ── POST subida ───────────────────────────────────────────────
if ($method === 'POST') {
    requireRol('administrador','funcionario');

    try {
        doc_upload($_POST, $_FILES, $user['id']);
        json_out(['ok'=>true], 201);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (RuntimeException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al subir el archivo.'], 500);
    }
}

// ── DELETE ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    requireRol('administrador','funcionario');
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) { json_out(['ok'=>false,'error'=>'ID requerido.'], 400); }
    try {
        doc_delete($id, $user['id']);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al eliminar documento.'], 500);
    }
}
