<?php
// Versión debug del login.php para ver errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers de seguridad
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Type: application/json');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    http_response_code(405); 
    echo json_encode(['ok'=>false,'error'=>'Método no permitido']); 
    exit; 
}

// Obtener y validar datos de entrada
$d        = json_decode(file_get_contents('php://input'), true);
$username = trim($d['username'] ?? '');
$password = $d['password']     ?? '';
$ip       = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$ua       = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Validar campos obligatorios
if (!$username || !$password) {
    echo json_encode(['ok'=>false,'error'=>'Campos incompletos.']); 
    exit;
}

$pdo = getDB();

// Verificar intentos fallidos recientes (últimos 15 minutos)
$check = $pdo->prepare("SELECT COUNT(*) as intentos FROM login_intentos WHERE ip_address = ? AND exitoso = 0 AND fecha_intento > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
$check->execute([$ip]);
$intentos = $check->fetch()['intentos'];

if ($intentos >= 3) {
    echo json_encode(['ok'=>false,'error'=>'Demasiados intentos fallidos. Intenta más tarde.']); 
    exit;
}

$stmt = $pdo->prepare("SELECT id,password_hash,rol,activo,email FROM usuarios WHERE username=? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    // Registrar intento fallido
    try {
        $pdo->prepare("INSERT INTO login_intentos (username, ip_address, fecha_intento, exitoso) VALUES (?, ?, NOW(), 0)")
            ->execute([$username, $ip]);
    } catch (Exception $e) {
        error_log('Error registrando intento fallido: ' . $e->getMessage());
    }
    
    echo json_encode(['ok'=>false,'error'=>'Usuario o contraseña incorrectos.']); 
    exit;
}

if (!$user['activo']) {
    echo json_encode(['ok'=>false,'error'=>'Tu cuenta está desactivada. Contacta al administrador.']); 
    exit;
}

[$disp, $nav, $so] = parseUserAgent($ua);

// Registrar acceso
$pdo->prepare("INSERT INTO accesos (usuario_id, fecha_entrada, ip_address, user_agent) VALUES (?, NOW(), ?, ?)")
    ->execute([$user['id'], $ip, $ua]);
$acceso_id = $pdo->lastInsertId();

// Iniciar sesión segura
sessionStart();
session_regenerate_id(true);
$_SESSION['user_id']   = $user['id'];
$_SESSION['username']  = $username;
$_SESSION['rol']       = $user['rol'];
$_SESSION['nombre']    = $user['email']; // Usar email como nombre
$_SESSION['acceso_id'] = $acceso_id;
$_SESSION['last_activity'] = time();

// Configurar cookie segura
$params = session_get_cookie_params();
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => $params['path'],
    'domain'   => $params['domain'],
    'secure'   => false,   // Cambiar a true si se utiliza en HTTPS
    'httponly' => true,
    'samesite' => 'Strict',
]);

echo json_encode(['ok'=>true,'rol'=>$user['rol'],'nombre'=>$user['email']]);

function parseUserAgent(string $ua): array {
    // Dispositivo
    if (preg_match('/Mobile|Android|iPhone|iPad/i', $ua)) $disp = 'Móvil/Tablet';
    else $disp = 'Escritorio';

    // Navegador
    if      (str_contains($ua,'Edg'))     $nav = 'Edge';
    elseif  (str_contains($ua,'Chrome'))  $nav = 'Chrome';
    elseif  (str_contains($ua,'Firefox')) $nav = 'Firefox';
    elseif  (str_contains($ua,'Safari'))  $nav = 'Safari';
    elseif  (str_contains($ua,'Opera'))   $nav = 'Opera';
    else                                  $nav = 'Otro';

    // Sistema operativo
    if      (str_contains($ua,'Windows')) $so = 'Windows';
    elseif  (str_contains($ua,'Mac'))     $so = 'macOS';
    elseif  (str_contains($ua,'Linux'))   $so = 'Linux';
    elseif  (str_contains($ua,'Android')) $so = 'Android';
    elseif  (str_contains($ua,'iOS'))     $so = 'iOS';
    else                                  $so = 'Desconocido';

    return [$disp, $nav, $so];
}

function sessionStart(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>false]);
        session_start();
    }
}
?>
