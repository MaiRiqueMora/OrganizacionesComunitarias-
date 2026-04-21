<?php
// Login final que acepta JSON y form data
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    http_response_code(405); 
    echo json_encode(['ok'=>false,'error'=>'Método no permitido']); 
    exit; 
}

// Obtener datos (aceptar JSON o form data)
$d = null;

// Intentar JSON primero
$json_input = file_get_contents('php://input');
if ($json_input && !empty($json_input)) {
    $d = json_decode($json_input, true);
}

// Si JSON falla, intentar form data
if (!$d) {
    $d = $_POST;
}

// Validar que tengamos datos
if (!$d) {
    echo json_encode(['ok'=>false,'error'=>'Datos no recibidos']); 
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
        echo json_encode(['ok'=>false,'error'=>'Usuario o contraseña incorrectos']); 
        exit;
    }
    
    // Verificar activo
    if (!$user['activo']) {
        echo json_encode(['ok'=>false,'error'=>'Usuario inactivo']); 
        exit;
    }
    
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
