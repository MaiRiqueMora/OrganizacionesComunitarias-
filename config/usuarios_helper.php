<?php

/**
 * Valida los datos para crear o actualizar un usuario.
 * Devuelve cadena vacía si todo está correcto, o un mensaje de error en caso contrario.
 */
function validateUser(array $d, bool $isCreate = true): string {
    if ($isCreate && empty($d['username'])) {
        return 'Username requerido.';
    }
    if (empty($d['email'])) {
        return 'Email requerido.';
    }
    if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
        return 'Email inválido.';
    }

    $roles = ['administrador','funcionario','consulta'];
    if (!empty($d['rol']) && !in_array($d['rol'], $roles, true)) {
        return 'Rol inválido.';
    }

    if (!empty($d['password']) || $isCreate) {
        $pwd = $d['password'] ?? '';
        if (strlen($pwd) < 8) {
            return 'La contraseña debe tener al menos 8 caracteres.';
        }
    }

    return '';
}

