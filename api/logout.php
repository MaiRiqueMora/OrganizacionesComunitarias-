<?php
// logout.php
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/validator.php';

sessionStart();

// Registrar logout si hay una sesión activa
if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
    $userId = $_SESSION['user_id'];
    $username = $_SESSION['username'];
    $loginTime = $_SESSION['login_time'] ?? time();
    $sessionDuration = time() - $loginTime;
    
    // Registrar cierre de sesión
    logLogout($userId, $username, $sessionDuration);
}

session_unset();
session_destroy();

// Redirigir al login
header('Location: ../index.html'); 
exit;
