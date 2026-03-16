<?php
/**
 * Página principal - Redirección automática según sesión
 * Verifica si hay sesión activa y redirige al dashboard o login
 * Incluye verificación de seguridad de red interna
 */

session_start();

// Cargar configuración
require_once 'config/config.php';

// Verificar acceso de red interna si está habilitado
if (FORCE_INTERNAL_ACCESS) {
    require_once 'config/NetworkSecurity.php';
    NetworkSecurity::enforceAccess();
}

// Configuración
define('LOGIN_PAGE', 'index.html');
define('DASHBOARD_PAGE', 'pages/dashboard.html');

// Verificar si hay sesión activa
if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
    // Sesión activa - redirigir al dashboard
    header('Location: ' . DASHBOARD_PAGE);
    exit;
} else {
    // Sin sesión - redirigir al login
    header('Location: ' . LOGIN_PAGE);
    exit;
}
?>
