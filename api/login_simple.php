<?php
// Login simplificado para diagnóstico
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

try {
    // 1. Cargar configuración
    require_once __DIR__ . '/../config/db.php';
    
    // 2. Verificar método POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
        http_response_code(405); 
        echo json_encode(['ok'=>false,'error'=>'Método no permitido']); 
        exit; 
    }
    
    // 3. Obtener datos
    $d = json_decode(file_get_contents('php://input'), true);
    $username = trim($d['username'] ?? '');
    $password = $d['password'] ?? '';
    
    // 4. Validar campos
    if (!$username || !$password) {
        echo json_encode(['ok'=>false,'error'=>'Campos incompletos.']); 
        exit;
    }
    
    // 5. Conectar a BD
    $pdo = getDB();
    
    // 6. Buscar usuario
    $stmt = $pdo->prepare("SELECT id,password_hash,rol,nombre_completo,activo FROM usuarios WHERE username=? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    // 7. Verificar credenciales
    if (!$user || !password_verify($password, $user['password_hash'])) {
        echo json_encode(['ok'=>false,'error'=>'Usuario o contraseña incorrectos.']); 
        exit;
    }
    
    // 8. Verificar si está activo
    if (!$user['activo']) {
        echo json_encode(['ok'=>false,'error'=>'Tu cuenta está desactivada.']); 
        exit;
    }
    
    // 9. Iniciar sesión
    sessionStart();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $username;
    $_SESSION['rol'] = $user['rol'];
    $_SESSION['nombre'] = $user['nombre_completo'];
    $_SESSION['last_activity'] = time();
    
    // 10. Respuesta exitosa
    echo json_encode(['ok'=>true,'rol'=>$user['rol'],'nombre'=>$user['nombre_completo']]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Error interno: ' . $e->getMessage()]);
}

function sessionStart(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>false]);
        session_start();
    }
}
?>
