<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/validator.php';
require_once __DIR__ . '/../config/session_secure.php';

// Establecer headers de seguridad
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$d        = json_decode(file_get_contents('php://input'), true);
$username = trim($d['username'] ?? '');
$password = $d['password'] ?? '';
$csrfToken = $d['csrf_token'] ?? '';

if (!$username || !$password) { 
    echo json_encode(['ok'=>false,'error'=>'Campos incompletos.']); 
    exit; 
}

// Verificar token CSRF
if (!validateCSRFToken($csrfToken)) {
    echo json_encode(['ok'=>false,'error'=>'Token de seguridad inválido.']); 
    exit;
}

// Verificar intentos de login
$attemptInfo = checkLoginAttempts($username);

if ($attemptInfo['blocked']) {
    echo json_encode([
        'ok' => false, 
        'error' => $attemptInfo['message'],
        'attempts' => $attemptInfo['attempts'],
        'blocked' => true
    ]); 
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT id,password_hash,rol,nombre_completo,activo FROM usuarios WHERE username=? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    // Registrar intento fallido
    $newAttemptInfo = recordFailedLogin($username);
    
    // Registrar en log de accesos fallidos
    logAccesoFallido($username, 'Credenciales incorrectas');
    
    echo json_encode([
        'ok' => false, 
        'error' => 'Usuario o contraseña incorrectos.',
        'attempts' => $newAttemptInfo['attempts'],
        'remaining_attempts' => $newAttemptInfo['remaining_attempts'],
        'blocked' => $newAttemptInfo['blocked']
    ]); 
    exit;
}

if (!$user['activo']) {
    echo json_encode(['ok'=>false,'error'=>'Tu cuenta está desactivada. Contacta al administrador.']); 
    exit;
}

// Login exitoso - limpiar intentos
clearLoginAttempts($username);

// Registrar acceso exitoso
logAcceso($user['id'], $username, [
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
]);

sessionStart();
session_regenerate_id(true);
$_SESSION['user_id']  = $user['id'];
$_SESSION['username'] = $username;
$_SESSION['rol']      = $user['rol'];
$_SESSION['nombre']   = $user['nombre_completo'];
$_SESSION['login_time'] = time(); // Para calcular duración de sesión

echo json_encode([
    'ok'=>true,
    'rol'=>$user['rol'],
    'nombre'=>$user['nombre_completo']
]);
