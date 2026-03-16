<?php
/* ============================================================
   api/organizaciones.php — CRUD organizaciones
   GET    ?action=list&search=&estado=&tipo=   → listado
   GET    ?action=get&id=N                     → detalle
   GET    ?action=alertas                      → directivas por vencer
   GET    ?action=tipos                        → tipos de organización
   POST                                        → crear
   PUT                                         → editar
   DELETE ?id=N                                → eliminar (solo admin)
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/organizaciones_helper.php';
require_once __DIR__ . '/../config/organizaciones_service.php';
require_once __DIR__ . '/../config/response_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';

    if ($action === 'tipos') {
        json_out(['ok'=>true,'data'=>org_tipos()]);
    }

    if ($action === 'alertas') {
        json_out(['ok'=>true,'data'=>org_alertas(ALERTA_DIAS_ANTES)]);
    }

    if ($action === 'get') {
        $id  = (int)($_GET['id'] ?? 0);
        $row = org_get($id);
        if (!$row) { json_out(['ok'=>false,'error'=>'No encontrado.'], 404); }
        json_out(['ok'=>true,'data'=>$row]);
    }

    $filters = [
        'search' => $_GET['search'] ?? null,
        'estado' => $_GET['estado'] ?? null,
        'tipo'   => $_GET['tipo']   ?? null,
    ];
    json_out(['ok'=>true,'data'=>org_list($filters)]);
}

// ── POST (crear) ─────────────────────────────────────────────
if ($method === 'POST') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);
    try {
        $newId = org_create($d, $user['id']);
        json_out(['ok'=>true,'id'=>$newId], 201);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al crear organización.'], 500);
    }
}

// ── PUT (editar) ─────────────────────────────────────────────
if ($method === 'PUT') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);
    try {
        org_update($d, $user['id']);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al actualizar organización.'], 500);
    }
}

// ── DELETE ───────────────────────────────────────────────────
if ($method === 'DELETE') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { json_out(['ok'=>false,'error'=>'ID requerido.'], 400); }
    try {
        org_delete($id, $user['id']);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al eliminar organización.'], 500);
    }
}

