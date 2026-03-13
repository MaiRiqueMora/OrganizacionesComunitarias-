<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$data     = json_decode(file_get_contents('php://input'), true);
$rawToken = trim($data['token']    ?? '');
$password = $data['password']      ?? '';
$confirm  = $data['confirm']       ?? '';

if (!$rawToken)              { echo json_encode(['ok'=>false,'error'=>'Token inválido.']); exit; }
if (strlen($password) < 8)  { echo json_encode(['ok'=>false,'error'=>'La contraseña debe tener al menos 8 caracteres.']); exit; }
if ($password !== $confirm)  { echo json_encode(['ok'=>false,'error'=>'Las contraseñas no coinciden.']); exit; }

$tokenHash = hash('sha256', $rawToken);
$pdo       = getDB();

$stmt = $pdo->prepare("
    SELECT id, user_id, expires_at, used
    FROM password_resets
    WHERE token = ?
    LIMIT 1
");
$stmt->execute([$tokenHash]);
$reset = $stmt->fetch();

if (!$reset)        { echo json_encode(['ok'=>false,'error'=>'Token inválido o no encontrado.']); exit; }
if ($reset['used']) { echo json_encode(['ok'=>false,'error'=>'Este enlace ya fue utilizado.']); exit; }
if (strtotime($reset['expires_at']) < time()) {
    echo json_encode(['ok'=>false,'error'=>'El enlace ha expirado. Solicita uno nuevo.']); exit;
}

// Actualizar contraseña
$pdo->prepare("UPDATE usuarios SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    ->execute([password_hash($password, PASSWORD_BCRYPT), $reset['user_id']]);

// Marcar token como usado
$pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
    ->execute([$reset['id']]);

echo json_encode(['ok'=>true]);
