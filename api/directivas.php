<?php
/* ============================================================
   api/directivas.php
   GET  ?org_id=N            → directivas de una organización
   GET  ?id=N                → detalle con cargos
   POST                      → crear nueva directiva
   PUT                       → editar directiva
   POST ?action=cargo        → guardar cargo
   DELETE ?id=N              → eliminar directiva (admin)
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/directivas_service.php';
require_once __DIR__ . '/../config/response_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── GET
if ($method === 'GET') {

    // Detalle directiva + cargos
    if (!empty($_GET['id'])) {
        $id  = (int)$_GET['id'];
        $dir = dir_getWithCargos($id);
        if (!$dir) { json_out(['ok'=>false,'error'=>'No encontrado.'], 404); }
        json_out(['ok'=>true,'data'=>$dir]);
    }

    // Historial de directivas de una organización
    if (!empty($_GET['org_id'])) {
        json_out(['ok'=>true,'data'=>dir_listByOrg((int)$_GET['org_id'])]);
    }

    json_out(['ok'=>false,'error'=>'Parámetros requeridos.'], 400);
}

// ── POST
if ($method === 'POST') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);

    // Guardar/actualizar cargo individual
    if ($action === 'cargo') {
        try {
            dir_saveCargo($d);
            json_out(['ok'=>true]);
        } catch (InvalidArgumentException $e) {
            json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
        } catch (Throwable $e) {
            json_out(['ok'=>false,'error'=>'Error al guardar cargo.'], 500);
        }
    }

    // Crear nueva directiva
    try {
        $newId = dir_create($d, $user['id']);
        json_out(['ok'=>true,'id'=>$newId], 201);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al crear directiva.'], 500);
    }
}

// ── PUT
if ($method === 'PUT') {
    requireRol('administrador','funcionario');
    $d  = json_decode(file_get_contents('php://input'), true);
    try {
        dir_update($d, $user['id']);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al actualizar directiva.'], 500);
    }
}

// ── DELETE
if ($method === 'DELETE') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { json_out(['ok'=>false,'error'=>'ID requerido.'], 400); }
    try {
        dir_delete($id, $user['id']);
        json_out(['ok'=>true]);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al eliminar directiva.'], 500);
    }
}
