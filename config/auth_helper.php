<?php
function sessionStart(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
}

/* Devuelve el usuario de sesión o null */
function sessionUser(): ?array {
    sessionStart();
    if (!isset($_SESSION['user_id'])) return null;
    return [
        'id'       => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'rol'      => $_SESSION['rol'],
        'nombre'   => $_SESSION['nombre'],
    ];
}

/* Requiere sesión activa; si no, responde 401 y termina */
function requireSession(): array {
    $u = sessionUser();
    if (!$u) {
        http_response_code(401);
        echo json_encode(['ok'=>false,'error'=>'Sesión no válida.']);
        exit;
    }
    return $u;
}

/* Requiere un rol específico */
function requireRol(string ...$roles): array {
    $u = requireSession();
    if (!in_array($u['rol'], $roles)) {
        http_response_code(403);
        echo json_encode(['ok'=>false,'error'=>'No tienes permisos para esta acción.']);
        exit;
    }
    return $u;
}

/* ¿Puede escribir? (admin o funcionario) */
function canWrite(): bool {
    $u = sessionUser();
    return $u && in_array($u['rol'], ['administrador','funcionario']);
}

/* ¿Es administrador? */
function isAdmin(): bool {
    $u = sessionUser();
    return $u && $u['rol'] === 'administrador';
}
