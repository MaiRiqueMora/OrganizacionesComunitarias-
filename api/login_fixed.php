<?php
// Login simplificado y corregido
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers
header('Content-Type: application/json');

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    http_response_code(405); 
    echo json_encode(['ok'=>false,'error'=>'Método no permitido']); 
    exit; 
}

// Obtener datos
$d = json_decode(file_get_contents('php://input'), true);
if (!$d) {
    echo json_encode(['ok'=>false,'error'=>'JSON inválido']); 
    exit;
}

$username = trim($d['username'] ?? '');
$password = $d['password'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

// Validar
if (!$username || !$password) {
    echo json_encode(['ok'=>false,'error'=>'Campos incompletos']); 
    exit;
}

try {
    // Conectar
    require_once __DIR__ . '/../config/db.php';
    $pdo = getDB();
    
    // Buscar usuario
    $stmt = $pdo->prepare("SELECT id,password_hash,rol,activo,email FROM usuarios WHERE username=? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    // Verificar credenciales
    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Registrar intento fallido
        $pdo->prepare("INSERT INTO login_intentos (username, ip_address, fecha_intento, exitoso) VALUES (?, ?, NOW(), 0)")
            ->execute([$username, $ip]);
        
        echo json_encode(['ok'=>false,'error'=>'Usuario o contraseña incorrectos']); 
        exit;
    }
    
    // Verificar activo
    if (!$user['activo']) {
        echo json_encode(['ok'=>false,'error'=>'Usuario inactivo']); 
        exit;
    }
    
    // Registrar acceso
    $pdo->prepare("INSERT INTO accesos (usuario_id, fecha_entrada, ip_address, user_agent) VALUES (?, NOW(), ?, ?)")
        ->execute([$user['id'], $ip, $_SERVER['HTTP_USER_AGENT'] ?? '']);
    
    // Iniciar sesión
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>false]);
        session_start();
    }
    session_regenerate_id(true);
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $username;
    $_SESSION['rol'] = $user['rol'];
    $_SESSION['nombre'] = $user['email'];
    $_SESSION['last_activity'] = time();
    
    // Respuesta exitosa
    echo json_encode(['ok'=>true,'rol'=>$user['rol'],'nombre'=>$user['email']]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Error: ' . $e->getMessage()]);
}
?>
