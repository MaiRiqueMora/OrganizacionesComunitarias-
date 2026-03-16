<?php
/* ============================================================
   api/csrf_token.php — Generador de tokens CSRF
   GET → genera un nuevo token CSRF
   ============================================================ */
require_once __DIR__ . '/../config/session_secure.php';

// Establecer headers de seguridad
setSecurityHeaders();

sessionStartSecure();

// Generar nuevo token CSRF
$token = generateCSRFToken();

echo json_encode([
    'ok' => true,
    'csrf_token' => $token
]);
