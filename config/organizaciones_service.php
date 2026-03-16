<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/organizaciones_helper.php';

/**
 * Devuelve listado de organizaciones según filtros opcionales.
 */
function org_list(array $filters = []): array {
    $pdo   = getDB();
    $where = [];
    $params = [];

    if (!empty($filters['search'])) {
        $where[]  = "(o.nombre LIKE ? OR o.rut LIKE ?)";
        $params[] = '%'.$filters['search'].'%';
        $params[] = '%'.$filters['search'].'%';
    }
    if (!empty($filters['estado'])) {
        $where[]  = "o.estado = ?";
        $params[] = $filters['estado'];
    }
    if (!empty($filters['tipo'])) {
        $where[]  = "o.tipo_id = ?";
        $params[] = (int)$filters['tipo'];
    }

    $sql = "SELECT o.id, o.nombre, o.rut, o.estado, o.numero_socios,
                   o.fecha_vencimiento_dir, o.habilitada_fondos,
                   t.nombre AS tipo_nombre,
                   d.estado AS estado_directiva,
                   DATEDIFF(d.fecha_termino, CURDATE()) AS dias_vence
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id = t.id
            LEFT JOIN directivas d ON d.organizacion_id = o.id AND d.es_actual = 1
            ".($where ? "WHERE ".implode(" AND ", $where) : "")."
            ORDER BY o.nombre ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Devuelve los tipos de organización.
 */
function org_tipos(): array {
    $pdo  = getDB();
    $stmt = $pdo->query("SELECT id,nombre FROM tipos_organizacion ORDER BY nombre");
    return $stmt->fetchAll();
}

/**
 * Devuelve organizaciones con directivas por vencer.
 */
function org_alertas(int $diasAntes): array {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT o.id, o.nombre, d.fecha_termino,
               DATEDIFF(d.fecha_termino, CURDATE()) AS dias_restantes
        FROM organizaciones o
        JOIN directivas d ON d.organizacion_id = o.id AND d.es_actual = 1
        WHERE d.estado = 'Vigente'
          AND d.fecha_termino BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        ORDER BY d.fecha_termino ASC
    ");
    $stmt->execute([$diasAntes]);
    return $stmt->fetchAll();
}

/**
 * Devuelve el detalle de una organización por ID.
 */
function org_get(int $id): ?array {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT o.*, t.nombre AS tipo_nombre,
               u.nombre_completo AS funcionario_nombre
        FROM organizaciones o
        LEFT JOIN tipos_organizacion t ON o.tipo_id = t.id
        LEFT JOIN usuarios u ON o.funcionario_encargado_id = u.id
        WHERE o.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Crea una nueva organización y devuelve el ID.
 */
function org_create(array $d, int $userId): int {
    $err = validateOrg($d);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("
        INSERT INTO organizaciones
            (nombre,rut,tipo_id,numero_registro_mun,fecha_constitucion,
             personalidad_juridica,numero_decreto,numero_pj_nacional,estado,
             direccion,sector_barrio,comuna,region,codigo_postal,
             telefono_principal,telefono_secundario,correo,redes_sociales,
             numero_socios,fecha_ultima_eleccion,fecha_vencimiento_dir,observaciones,
             funcionario_encargado_id,habilitada_fondos,
             nombre_banco,tipo_cuenta,representante_legal,area_accion,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");

    $stmt->execute([
        trim($d['nombre']),
        trim($d['rut']),
        $d['tipo_id'] ?: (null),
        $d['numero_registro_mun'] ?? null,
        $d['fecha_constitucion'] ?? null,
        (int)(bool)($d['personalidad_juridica'] ?? 0),
        $d['numero_decreto'] ?? null,
        $d['numero_pj_nacional'] ?? null,
        $d['estado'] ?? 'Activa',
        trim($d['direccion']),
        $d['sector_barrio'] ?? null,
        $d['comuna'] ?? 'Pucón',
        $d['region'] ?? 'La Araucanía',
        $d['codigo_postal'] ?? null,
        $d['telefono_principal'] ?? null,
        $d['telefono_secundario'] ?? null,
        $d['correo'] ?? null,
        $d['redes_sociales'] ?? null,
        (int)($d['numero_socios'] ?? 0),
        $d['fecha_ultima_eleccion'] ?? null,
        $d['fecha_vencimiento_dir'] ?? null,
        $d['observaciones'] ?? null,
        $d['funcionario_encargado_id'] ?? null,
        (int)(bool)($d['habilitada_fondos'] ?? 0),
        $d['nombre_banco'] ?? null,
        $d['tipo_cuenta'] ?? null,
        $d['representante_legal'] ?? null,
        $d['area_accion'] ?? null,
        $userId,
    ]);

    $newId = (int)$pdo->lastInsertId();
    logHistorial('organizaciones', $newId, 'crear', "Organización creada: {$d['nombre']}", $userId);
    return $newId;
}

/**
 * Actualiza una organización existente.
 */
function org_update(array $d, int $userId): void {
    if (empty($d['id'])) {
        throw new InvalidArgumentException('ID requerido.');
    }

    $err = validateOrg($d);
    if ($err) {
        throw new InvalidArgumentException($err);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("
        UPDATE organizaciones SET
            nombre=?,rut=?,tipo_id=?,numero_registro_mun=?,fecha_constitucion=?,
            personalidad_juridica=?,numero_decreto=?,numero_pj_nacional=?,estado=?,
            direccion=?,sector_barrio=?,comuna=?,region=?,codigo_postal=?,
            telefono_principal=?,telefono_secundario=?,correo=?,redes_sociales=?,
            numero_socios=?,fecha_ultima_eleccion=?,fecha_vencimiento_dir=?,observaciones=?,
            funcionario_encargado_id=?,habilitada_fondos=?,
            nombre_banco=?,tipo_cuenta=?,representante_legal=?,area_accion=?
        WHERE id=?
    ");

    $stmt->execute([
        trim($d['nombre']),
        trim($d['rut']),
        $d['tipo_id'] ?? null,
        $d['numero_registro_mun'] ?? null,
        $d['fecha_constitucion'] ?? null,
        (int)(bool)($d['personalidad_juridica'] ?? 0),
        $d['numero_decreto'] ?? null,
        $d['numero_pj_nacional'] ?? null,
        $d['estado'] ?? 'Activa',
        trim($d['direccion']),
        $d['sector_barrio'] ?? null,
        $d['comuna'] ?? 'Pucón',
        $d['region'] ?? 'La Araucanía',
        $d['codigo_postal'] ?? null,
        $d['telefono_principal'] ?? null,
        $d['telefono_secundario'] ?? null,
        $d['correo'] ?? null,
        $d['redes_sociales'] ?? null,
        (int)($d['numero_socios'] ?? 0),
        $d['fecha_ultima_eleccion'] ?? null,
        $d['fecha_vencimiento_dir'] ?? null,
        $d['observaciones'] ?? null,
        $d['funcionario_encargado_id'] ?? null,
        (int)(bool)($d['habilitada_fondos'] ?? 0),
        $d['nombre_banco'] ?? null,
        $d['tipo_cuenta'] ?? null,
        $d['representante_legal'] ?? null,
        $d['area_accion'] ?? null,
        (int)$d['id'],
    ]);

    logHistorial('organizaciones', (int)$d['id'], 'editar', "Organización editada: {$d['nombre']}", $userId);
}

/**
 * Elimina una organización.
 */
function org_delete(int $id, int $userId): void {
    $pdo = getDB();
    $rowStmt = $pdo->prepare("SELECT nombre FROM organizaciones WHERE id=?");
    $rowStmt->execute([$id]);
    $row = $rowStmt->fetch();
    if (!$row) {
        throw new InvalidArgumentException('No encontrado.');
    }

    $pdo->prepare("DELETE FROM organizaciones WHERE id=?")->execute([$id]);
    logHistorial('organizaciones', $id, 'eliminar', "Organización eliminada: {$row['nombre']}", $userId);
}

