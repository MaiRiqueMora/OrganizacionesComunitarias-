<?php

/**
 * Sistema Municipal de Organizaciones
 * API REST para gestión de accesos - MySQL Version
 */

ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user = sessionUser();
if (!$user || $user['rol'] !== 'administrador') {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Se requiere rol administrador']);
    exit;
}
$pdo    = getDB();
$action = $_GET['action'] ?? 'list';

if ($action === 'stats') {
    // Estadísticas usando nombres de columnas correctos de MySQL
    $sqlHoy = "SELECT COUNT(*) FROM accesos WHERE DATE(fecha_entrada) = CURDATE()";
    $hoy    = $pdo->query($sqlHoy)->fetchColumn();
    
    $semana = $pdo->query("SELECT COUNT(*) FROM accesos WHERE fecha_entrada >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
    
    // Intentos fallidos: contar donde exitoso = 0
    $fallidos = $pdo->query("SELECT COUNT(*) FROM login_intentos WHERE exitoso = 0")->fetchColumn();
    
    $usuarios = $pdo->query("SELECT COUNT(DISTINCT usuario_id) FROM accesos WHERE fecha_entrada >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
    
    ob_end_clean();
    echo json_encode(['ok' => true, 'data' => compact('hoy', 'semana', 'fallidos', 'usuarios')]);
    exit;
}

// Listado con paginación
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = 50;
$offset  = ($page - 1) * $perPage;
$solo_fallidos = !empty($_GET['fallidos']);

if ($solo_fallidos) {
    // Intentos fallidos
    $total = (int)$pdo->query("SELECT COUNT(*) FROM login_intentos WHERE exitoso = 0")->fetchColumn();
    $stmt  = $pdo->prepare("SELECT username, ip_address AS ip, 'Sistema bloqueado' AS navegador, "
                          . "'—' AS sistema_op, '—' AS dispositivo, "
                          . "fecha_intento AS inicio_sesion, NULL AS fin_sesion, "
                          . "NULL AS duracion_seg, 0 AS exito "
                          . "FROM login_intentos WHERE exitoso = 0 "
                          . "ORDER BY fecha_intento DESC LIMIT ? OFFSET ?");
    $stmt->execute([$perPage, $offset]);
} else {
    // Accesos normales - usando nombres de columnas correctos
    $total = (int)$pdo->query("SELECT COUNT(*) FROM accesos")->fetchColumn();
    $stmt  = $pdo->prepare("SELECT a.id, a.usuario_id, a.fecha_entrada AS inicio_sesion, a.fecha_salida AS fin_sesion, "
                          . "a.ip_address AS ip, a.user_agent AS navegador, 1 AS exito "
                          . "FROM accesos a "
                          . "ORDER BY a.fecha_entrada DESC LIMIT ? OFFSET ?");
    $stmt->execute([$perPage, $offset]);
}

ob_end_clean();
echo json_encode([
    'ok'    => true,
    'data'  => $stmt->fetchAll(),
    'total' => $total,
    'pages' => (int)ceil($total / $perPage),
    'page'  => $page,
]);
