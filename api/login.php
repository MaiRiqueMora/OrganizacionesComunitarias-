<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$d        = json_decode(file_get_contents('php://input'), true);
$username = trim($d['username'] ?? '');
$password = $d['password'] ?? '';

if (!$username || !$password) { echo json_encode(['ok'=>false,'error'=>'Campos incompletos.']); exit; }

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT id,password_hash,rol,nombre_completo,activo FROM usuarios WHERE username=? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    echo json_encode(['ok'=>false,'error'=>'Usuario o contraseña incorrectos.']); exit;
}
if (!$user['activo']) {
    echo json_encode(['ok'=>false,'error'=>'Tu cuenta está desactivada. Contacta al administrador.']); exit;
}

sessionStart();
session_regenerate_id(true);
$_SESSION['user_id']  = $user['id'];
$_SESSION['username'] = $username;
$_SESSION['rol']      = $user['rol'];
$_SESSION['nombre']   = $user['nombre_completo'];

echo json_encode(['ok'=>true,'rol'=>$user['rol'],'nombre'=>$user['nombre_completo']]);
