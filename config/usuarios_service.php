<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/usuarios_helper.php';

/**
 * Lista todos los usuarios.
 */
function user_list(): array {
    $pdo  = getDB();
    $stmt = $pdo->query("SELECT id,username,email,rol,nombre_completo,activo,created_at FROM usuarios ORDER BY nombre_completo");
    return $stmt->fetchAll();
}

/**
 * Crea un nuevo usuario y devuelve su ID.
 */
function user_create(array $d): int {
    $err = validateUser($d, true);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $pdo = getDB();
    try {
        $stmt = $pdo->prepare("INSERT INTO usuarios (username,email,password_hash,rol,nombre_completo) VALUES (?,?,?,?,?)");
        $stmt->execute([
            trim($d['username']),
            trim($d['email']),
            password_hash($d['password'], PASSWORD_BCRYPT),
            $d['rol'] ?? 'funcionario',
            trim($d['nombre_completo'] ?? ''),
        ]);
        return (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        // Unificar mensaje para no filtrar detalles internos
        throw new RuntimeException('El username o email ya existe.');
    }
}

/**
 * Actualiza un usuario existente.
 */
function user_update(array $d, array $currentUser): void {
    $id = (int)($d['id'] ?? 0);
    if (!$id) {
        throw new InvalidArgumentException('ID requerido.');
    }

    // No dejar al admin desactivarse a sí mismo
    if ($id === (int)$currentUser['id'] && isset($d['activo']) && !$d['activo']) {
        throw new InvalidArgumentException('No puedes desactivar tu propia cuenta.');
    }

    $err = validateUser($d, false);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $fields = [];
    $vals   = [];

    if (isset($d['email'])) {
        $fields[] = 'email=?';
        $vals[]   = trim($d['email']);
    }
    if (isset($d['rol'])) {
        $fields[] = 'rol=?';
        $vals[]   = $d['rol'];
    }
    if (isset($d['nombre_completo'])) {
        $fields[] = 'nombre_completo=?';
        $vals[]   = trim($d['nombre_completo']);
    }
    if (isset($d['activo'])) {
        $fields[] = 'activo=?';
        $vals[]   = (int)(bool)$d['activo'];
    }
    if (!empty($d['password'])) {
        $fields[] = 'password_hash=?';
        $vals[]   = password_hash($d['password'], PASSWORD_BCRYPT);
    }

    if (!$fields) {
        throw new InvalidArgumentException('Sin datos para actualizar.');
    }

    $vals[] = $id;
    $pdo    = getDB();
    $stmt   = $pdo->prepare("UPDATE usuarios SET ".implode(',', $fields)." WHERE id=?");
    $stmt->execute($vals);
}

/**
 * Elimina un usuario.
 */
function user_delete(int $id, array $currentUser): void {
    if ($id === (int)$currentUser['id']) {
        throw new InvalidArgumentException('No puedes eliminarte a ti mismo.');
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id=?");
    $stmt->execute([$id]);
}

