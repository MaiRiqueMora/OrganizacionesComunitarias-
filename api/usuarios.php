<?php
/* ============================================================
   api/usuarios.php — CRUD de usuarios (solo administrador)
   ============================================================ */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/usuarios_service.php';
require_once __DIR__ . '/../config/response_helper.php';

$user   = requireRol('administrador');
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    json_out(['ok'=>true,'data'=>user_list()]);
}

if ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    try {
        $id = user_create($d);
        json_out(['ok'=>true,'id'=>$id], 201);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (RuntimeException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al crear usuario.'], 500);
    }
}

if ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true);
    try {
        user_update($d, $user);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al actualizar usuario.'], 500);
    }
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    try {
        user_delete($id, $user);
        json_out(['ok'=>true]);
    } catch (InvalidArgumentException $e) {
        json_out(['ok'=>false,'error'=>$e->getMessage()], 400);
    } catch (Throwable $e) {
        json_out(['ok'=>false,'error'=>'Error al eliminar usuario.'], 500);
    }
}
