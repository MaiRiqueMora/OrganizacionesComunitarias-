<?php

require_once __DIR__ . '/session_secure.php';

function sessionStart(): void {
    sessionStartSecure();
}

/* Devuelve el usuario de sesión o null */
function sessionUser(): ?array {
    $validation = validateSession();
    if (!$validation['valid']) {
        return null;
    }
    
    return [
        'id'       => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'rol'      => $_SESSION['rol'] ?? null,
        'nombre'   => $_SESSION['nombre'] ?? null,
    ];
}

/* Requiere sesión activa; si no, responde 401 y termina */
function requireSession(): array {
    $validation = validateSession();
    if (!$validation['valid']) {
        http_response_code(401);
        echo json_encode(['ok'=>false,'error'=>$validation['reason']]);
        exit;
    }
    
    return sessionUser();
}

/* Requiere uno de los roles indicados */
function requireRol(string ...$roles): array {
    $u = requireSession();
    if (!in_array($u['rol'], $roles)) {
        http_response_code(403);
        echo json_encode(['ok'=>false,'error'=>'No tienes permisos para esta acción.']);
        exit;
    }
    return $u;
}

/* Admin o funcionario */
function canWrite(): bool {
    $u = sessionUser();
    return $u && in_array($u['rol'], ['administrador','funcionario']);
}

/* ¿Es administrador? */
function isAdmin(): bool {
    $u = sessionUser();
    return $u && $u['rol'] === 'administrador';
}
