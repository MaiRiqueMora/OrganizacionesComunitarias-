<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: auth_helper.php
 * 
 * DESCRIPCIÓN:
 * Sistema central de autenticación y gestión de sesiones.
 * Controla el acceso de usuarios al sistema municipal.
 * 
 * FUNCIONALIDADES:
 * - Inicio y gestión de sesiones PHP
 * - Validación de autenticación
 * - Control de timeout por inactividad
 * - Verificación de roles y permisos
 * - Manejo seguro de cookies
 * 
 * CONFIGURACIÓN:
 * - SESSION_TIMEOUT: 1800 segundos (30 minutos)
 * - Cookies HTTP-only y SameSite Strict
 * - Compatible con HTTPS (producción)
 * 
 * FUNCIONES PRINCIPALES:
 * - sessionStart(): Inicia sesión si no está activa
 * - sessionUser(): Retorna datos del usuario actual
 * - requireSession(): Requiere autenticación o detiene ejecución
 * - requireRol(): Requiere rol específico
 * - canWrite(): Verifica permisos de escritura
 * - isAdmin(): Verifica si es administrador
 * 
 * SEGURIDAD:
 * - Timeout automático por inactividad
 * - Destrucción de sesión al expirar
 * - Validación de roles en cada petición
 * - Cookies seguras contra XSS
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

define('SESSION_TIMEOUT', 1800); // 30 minutos de inactividad para cerrar

function sessionStart(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>false]); // Cambiar a true en producción con HTTPS
        session_start();
    }
}

function sessionUser(): ?array {
    sessionStart();
    if (!isset($_SESSION['user_id'])) return null;

    // Expiración por inactividad
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > SESSION_TIMEOUT) {
        session_unset();
        session_destroy();
        return null;
    }
    $_SESSION['last_activity'] = time();

    return [
        'id'       => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'rol'      => $_SESSION['rol'],
        'nombre'   => $_SESSION['nombre'],
    ];
}

function requireSession(): array {
    $u = sessionUser();
    if (!$u) {
        http_response_code(401);
        echo json_encode(['ok'=>false,'error'=>'Sesión no válida.']);
        exit;
    }
    return $u;
}

function requireRol(string ...$roles): array {
    $u = requireSession();
    if (!in_array($u['rol'], $roles)) {
        http_response_code(403);
        echo json_encode(['ok'=>false,'error'=>'No tienes permisos para esta acción.']);
        exit;
    }
    return $u;
}

function canWrite(): bool {
    $u = sessionUser();
    return $u && in_array($u['rol'], ['administrador','funcionario']);
}

function isAdmin(): bool {
    $u = sessionUser();
    return $u && $u['rol'] === 'administrador';
}
