<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user   = requireRol('administrador');
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $rows = $pdo->query("SELECT id,username,email,rol,nombre_completo,activo,created_at FROM usuarios ORDER BY nombre_completo")->fetchAll();
    echo json_encode(['ok'=>true,'data'=>$rows]); exit;
}

if ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    if (empty($d['username']))       { echo json_encode(['ok'=>false,'error'=>'Username requerido.']); exit; }
    if (empty($d['email']))          { echo json_encode(['ok'=>false,'error'=>'Email requerido.']); exit; }
    if (empty($d['password']))       { echo json_encode(['ok'=>false,'error'=>'Contraseña requerida.']); exit; }
    if (strlen($d['password']) < 8)  { echo json_encode(['ok'=>false,'error'=>'Mínimo 8 caracteres.']); exit; }
    $roles = ['administrador','funcionario','consulta'];
    if (!in_array($d['rol']??'',$roles)) { echo json_encode(['ok'=>false,'error'=>'Rol inválido.']); exit; }
    try {
        $pdo->prepare("INSERT INTO usuarios (username,email,password_hash,rol,nombre_completo) VALUES (?,?,?,?,?)")
            ->execute([trim($d['username']),trim($d['email']),password_hash($d['password'],PASSWORD_BCRYPT),$d['rol'],trim($d['nombre_completo']??'')]);
        echo json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['ok'=>false,'error'=>'El username o email ya existe.']);
    }
    exit;
}

if ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    // No deja al admin desactivarse a sí mismo
    if ($id === $user['id'] && isset($d['activo']) && !$d['activo']) {
        echo json_encode(['ok'=>false,'error'=>'No puedes desactivar tu propia cuenta.']); exit;
    }
    $fields = []; $vals = [];
    if (isset($d['email']))          { $fields[]='email=?';          $vals[]=trim($d['email']); }
    if (isset($d['rol']))            { $fields[]='rol=?';            $vals[]=$d['rol']; }
    if (isset($d['nombre_completo'])){ $fields[]='nombre_completo=?';$vals[]=trim($d['nombre_completo']); }
    if (isset($d['activo']))         { $fields[]='activo=?';         $vals[]=(int)(bool)$d['activo']; }
    if (!empty($d['password']) && strlen($d['password'])>=8) {
        $fields[]='password_hash=?'; $vals[]=password_hash($d['password'],PASSWORD_BCRYPT);
    }
    if (!$fields) { echo json_encode(['ok'=>false,'error'=>'Sin datos para actualizar.']); exit; }
    $vals[] = $id;
    $pdo->prepare("UPDATE usuarios SET ".implode(',',$fields)." WHERE id=?")->execute($vals);
    echo json_encode(['ok'=>true]); exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id === $user['id']) { echo json_encode(['ok'=>false,'error'=>'No puedes eliminarte a ti mismo.']); exit; }
    $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
    echo json_encode(['ok'=>true]); exit;
}
