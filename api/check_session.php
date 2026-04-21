<?php
/**
 * Verificar si la sesión está activa
 */
ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user = sessionUser();

// Debug: log session status
error_log("check_session - session_status: " . session_status());
error_log("check_session - _SESSION: " . print_r($_SESSION, true));
error_log("check_session - user: " . print_r($user, true));

ob_end_clean();

if ($user) {
    echo json_encode([
        'ok' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'rol' => $user['rol'],
            'email' => $user['email'] ?? null
        ]
    ]);
} else {
    echo json_encode(['ok' => false, 'error' => 'Sesión no válida']);
}
