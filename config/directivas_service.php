<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/directivas_helper.php';

/**
 * Devuelve directiva con sus cargos por ID.
 */
function dir_getWithCargos(int $id): ?array {
    $pdo = getDB();
    $dirStmt = $pdo->prepare("SELECT * FROM directivas WHERE id=?");
    $dirStmt->execute([$id]);
    $dir = $dirStmt->fetch();
    if (!$dir) return null;

    $cargosStmt = $pdo->prepare("SELECT * FROM cargos_directiva WHERE directiva_id=? ORDER BY id");
    $cargosStmt->execute([$id]);
    $dir['cargos'] = $cargosStmt->fetchAll();
    return $dir;
}

/**
 * Lista historial de directivas de una organización.
 */
function dir_listByOrg(int $orgId): array {
    $pdo = getDB();
    $stmt = $pdo->prepare("
        SELECT d.*, COUNT(c.id) AS total_cargos
        FROM directivas d
        LEFT JOIN cargos_directiva c ON c.directiva_id = d.id
        WHERE d.organizacion_id = ?
        GROUP BY d.id
        ORDER BY d.es_actual DESC, d.fecha_inicio DESC
    ");
    $stmt->execute([$orgId]);
    return $stmt->fetchAll();
}

/**
 * Crea o actualiza un cargo de directiva.
 */
function dir_saveCargo(array $d): void {
    $err = validateCargo($d);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $obligatorios = ['Presidente','Presidenta','Secretario','Secretaria','Tesorero','Tesorera'];
    $esOblig = in_array($d['cargo'], $obligatorios, true) ? 1 : 0;

    $pdo = getDB();
    if (!empty($d['id'])) {
        $stmt = $pdo->prepare("
            UPDATE cargos_directiva SET cargo=?,nombre_titular=?,rut_titular=?,
                telefono=?,correo=?,estado_cargo=?,es_obligatorio=? WHERE id=?
        ");
        $stmt->execute([
            $d['cargo'],
            trim($d['nombre_titular']),
            $d['rut_titular'] ?? null,
            $d['telefono'] ?? null,
            $d['correo'] ?? null,
            $d['estado_cargo'] ?? 'Activo',
            $esOblig,
            (int)$d['id'],
        ]);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO cargos_directiva
                (directiva_id,cargo,nombre_titular,rut_titular,telefono,correo,estado_cargo,es_obligatorio)
            VALUES (?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            (int)$d['directiva_id'],
            $d['cargo'],
            trim($d['nombre_titular']),
            $d['rut_titular'] ?? null,
            $d['telefono'] ?? null,
            $d['correo'] ?? null,
            $d['estado_cargo'] ?? 'Activo',
            $esOblig,
        ]);
    }
}

/**
 * Crea una nueva directiva y actualiza organización.
 */
function dir_create(array $d, int $userId): int {
    $err = validateDirectiva($d);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $pdo = getDB();

    // Marcar anteriores como no actuales
    $pdo->prepare("UPDATE directivas SET es_actual=0 WHERE organizacion_id=?")
        ->execute([(int)$d['organizacion_id']]);

    // Insertar nueva directiva
    $stmt = $pdo->prepare("
        INSERT INTO directivas (organizacion_id,fecha_inicio,fecha_termino,estado,es_actual,created_by)
        VALUES (?,?,?,?,1,?)
    ");
    $stmt->execute([
        (int)$d['organizacion_id'],
        $d['fecha_inicio'],
        $d['fecha_termino'],
        $d['estado'] ?? 'Vigente',
        $userId,
    ]);

    $newId = (int)$pdo->lastInsertId();

    // Actualizar fechas en organización
    $pdo->prepare("
        UPDATE organizaciones SET fecha_vencimiento_dir=?,fecha_ultima_eleccion=? WHERE id=?
    ")->execute([
        $d['fecha_termino'],
        $d['fecha_inicio'],
        (int)$d['organizacion_id'],
    ]);

    logHistorial('directivas', $newId, 'crear', 'Nueva directiva registrada', $userId);
    return $newId;
}

/**
 * Actualiza una directiva existente y sincroniza organización si corresponde.
 */
function dir_update(array $d, int $userId): void {
    $id = (int)($d['id'] ?? 0);
    if (!$id) {
        throw new InvalidArgumentException('ID requerido.');
    }
    if (empty($d['fecha_inicio']) || empty($d['fecha_termino'])) {
        throw new InvalidArgumentException('Fechas requeridas.');
    }

    $pdo = getDB();
    $pdo->prepare("
        UPDATE directivas SET fecha_inicio=?,fecha_termino=?,estado=? WHERE id=?
    ")->execute([
        $d['fecha_inicio'],
        $d['fecha_termino'],
        $d['estado'] ?? 'Vigente',
        $id,
    ]);

    // Sincronizar organización si es actual
    $dirStmt = $pdo->prepare("SELECT * FROM directivas WHERE id=?");
    $dirStmt->execute([$id]);
    $dir = $dirStmt->fetch();
    if ($dir && $dir['es_actual']) {
        $pdo->prepare("
            UPDATE organizaciones SET fecha_vencimiento_dir=? WHERE id=?
        ")->execute([
            $d['fecha_termino'],
            $dir['organizacion_id'],
        ]);
    }

    logHistorial('directivas', $id, 'editar', 'Directiva editada', $userId);
}

/**
 * Elimina una directiva.
 */
function dir_delete(int $id, int $userId): void {
    $pdo = getDB();
    $pdo->prepare("DELETE FROM directivas WHERE id=?")->execute([$id]);
    logHistorial('directivas', $id, 'eliminar', 'Directiva eliminada', $userId);
}

