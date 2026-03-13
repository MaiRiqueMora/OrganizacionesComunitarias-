<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// Get detalle de organización o listado con filtros
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';

    if ($action === 'tipos') {
        $rows = $pdo->query("SELECT id,nombre FROM tipos_organizacion ORDER BY nombre")->fetchAll();
        echo json_encode(['ok'=>true,'data'=>$rows]); exit;
    }

    if ($action === 'alertas') {
        $dias = ALERTA_DIAS_ANTES;
        $stmt = $pdo->prepare("
            SELECT o.id, o.nombre, d.fecha_termino,
                   CAST(julianday(d.fecha_termino) - julianday(date('now','localtime')) AS INTEGER) AS dias_restantes
            FROM organizaciones o
            JOIN directivas d ON d.organizacion_id = o.id AND d.es_actual = 1
            WHERE d.estado = 'Vigente'
              AND d.fecha_termino BETWEEN date('now','localtime') AND date('now','localtime','+'||?||' days')
            ORDER BY d.fecha_termino ASC
        ");
        $stmt->execute([$dias]);
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
    }

    if ($action === 'alertas_pj') {
        $dias = ALERTA_DIAS_ANTES;
        $stmt = $pdo->prepare("
            SELECT id, nombre, fecha_vencimiento_pj,
                   CAST(julianday(fecha_vencimiento_pj) - julianday(date('now','localtime')) AS INTEGER) AS dias_restantes
            FROM organizaciones
            WHERE personalidad_juridica = 1
              AND fecha_vencimiento_pj IS NOT NULL
              AND fecha_vencimiento_pj BETWEEN date('now','localtime') AND date('now','localtime','+'||?||' days')
            ORDER BY fecha_vencimiento_pj ASC
        ");
        $stmt->execute([$dias]);
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
    }

    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
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
        if (!$row) { echo json_encode(['ok'=>false,'error'=>'No encontrado.']); exit; }
        echo json_encode(['ok'=>true,'data'=>$row]); exit;
    }

    $where = []; $params = [];
    if (!empty($_GET['search'])) {
        $where[]  = "(o.nombre LIKE ? OR o.rut LIKE ?)";
        $params[] = '%'.$_GET['search'].'%';
        $params[] = '%'.$_GET['search'].'%';
    }
    if (!empty($_GET['estado'])) { $where[] = "o.estado = ?"; $params[] = $_GET['estado']; }
    if (!empty($_GET['tipo']))   { $where[] = "o.tipo_id = ?"; $params[] = (int)$_GET['tipo']; }

    $sql = "SELECT o.id, o.nombre, o.rut, o.estado, o.numero_socios,
                   o.fecha_vencimiento_dir, o.habilitada_fondos,
                   t.nombre AS tipo_nombre,
                   d.estado AS estado_directiva,
                   CAST(julianday(d.fecha_termino) - julianday(date('now','localtime')) AS INTEGER) AS dias_vence
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id = t.id
            LEFT JOIN directivas d ON d.organizacion_id = o.id AND d.es_actual = 1
            ".($where ? "WHERE ".implode(" AND ",$where) : "")."
            ORDER BY o.nombre ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
}

// Post nueva organización
if ($method === 'POST') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);
    $err = validateOrg($d);
    if ($err) { echo json_encode(['ok'=>false,'error'=>$err]); exit; }

    $stmt = $pdo->prepare("
        INSERT INTO organizaciones
            (nombre,rut,tipo_id,numero_registro_mun,fecha_constitucion,
             personalidad_juridica,numero_decreto,numero_pj_nacional,estado,
             direccion,sector_barrio,comuna,region,codigo_postal,
             telefono_principal,telefono_secundario,correo,redes_sociales,
             numero_socios,fecha_ultima_eleccion,fecha_vencimiento_dir,observaciones,
             funcionario_encargado_id,habilitada_fondos,
             nombre_banco,tipo_cuenta,representante_legal,area_accion,fecha_vencimiento_pj,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        trim($d['nombre']), trim($d['rut']),
        $d['tipo_id']?:(null),
        $d['numero_registro_mun']??null,
        $d['fecha_constitucion']??null,
        (int)(bool)($d['personalidad_juridica']??0),
        $d['numero_decreto']??null,
        $d['numero_pj_nacional']??null,
        $d['estado']??'Activa',
        trim($d['direccion']),
        $d['sector_barrio']??null,
        $d['comuna']??'Pucón',
        $d['region']??'La Araucanía',
        $d['codigo_postal']??null,
        $d['telefono_principal']??null,
        $d['telefono_secundario']??null,
        $d['correo']??null,
        $d['redes_sociales']??null,
        (int)($d['numero_socios']??0),
        $d['fecha_ultima_eleccion']??null,
        $d['fecha_vencimiento_dir']??null,
        $d['observaciones']??null,
        $d['funcionario_encargado_id']??null,
        (int)(bool)($d['habilitada_fondos']??0),
        $d['nombre_banco']??null,
        $d['tipo_cuenta']??null,
        $d['representante_legal']??null,
        $d['area_accion']??null,
        $d['fecha_vencimiento_pj']??null,
        $user['id'],
    ]);
    $newId = (int)$pdo->lastInsertId();
    logHistorial('organizaciones',$newId,'crear',"Organización creada: {$d['nombre']}",$user['id']);
    echo json_encode(['ok'=>true,'id'=>$newId]); exit;
}

// Put editar organización
if ($method === 'PUT') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);
    if (empty($d['id'])) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    $err = validateOrg($d);
    if ($err) { echo json_encode(['ok'=>false,'error'=>$err]); exit; }

    $stmt = $pdo->prepare("
        UPDATE organizaciones SET
            nombre=?,rut=?,tipo_id=?,numero_registro_mun=?,fecha_constitucion=?,
            personalidad_juridica=?,numero_decreto=?,numero_pj_nacional=?,estado=?,
            direccion=?,sector_barrio=?,comuna=?,region=?,codigo_postal=?,
            telefono_principal=?,telefono_secundario=?,correo=?,redes_sociales=?,
            numero_socios=?,fecha_ultima_eleccion=?,fecha_vencimiento_dir=?,observaciones=?,
            funcionario_encargado_id=?,habilitada_fondos=?,
            nombre_banco=?,tipo_cuenta=?,representante_legal=?,area_accion=?,
            fecha_vencimiento_pj=?,
            updated_at=datetime('now','localtime')
        WHERE id=?
    ");
    $stmt->execute([
        trim($d['nombre']), trim($d['rut']),
        $d['tipo_id']??null,
        $d['numero_registro_mun']??null,
        $d['fecha_constitucion']??null,
        (int)(bool)($d['personalidad_juridica']??0),
        $d['numero_decreto']??null,
        $d['numero_pj_nacional']??null,
        $d['estado']??'Activa',
        trim($d['direccion']),
        $d['sector_barrio']??null,
        $d['comuna']??'Pucón',
        $d['region']??'La Araucanía',
        $d['codigo_postal']??null,
        $d['telefono_principal']??null,
        $d['telefono_secundario']??null,
        $d['correo']??null,
        $d['redes_sociales']??null,
        (int)($d['numero_socios']??0),
        $d['fecha_ultima_eleccion']??null,
        $d['fecha_vencimiento_dir']??null,
        $d['observaciones']??null,
        $d['funcionario_encargado_id']??null,
        (int)(bool)($d['habilitada_fondos']??0),
        $d['nombre_banco']??null,
        $d['tipo_cuenta']??null,
        $d['representante_legal']??null,
        $d['area_accion']??null,
        $d['fecha_vencimiento_pj']??null,
        (int)$d['id'],
    ]);
    logHistorial('organizaciones',(int)$d['id'],'editar',"Organización editada: {$d['nombre']}",$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

// Delete organización
if ($method === 'DELETE') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    $row = $pdo->prepare("SELECT nombre FROM organizaciones WHERE id=?");
    $row->execute([$id]); $row = $row->fetch();
    if (!$row) { echo json_encode(['ok'=>false,'error'=>'No encontrado.']); exit; }
    $pdo->prepare("DELETE FROM organizaciones WHERE id=?")->execute([$id]);
    logHistorial('organizaciones',$id,'eliminar',"Organización eliminada: {$row['nombre']}",$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

function validateOrg(array $d): string {
    if (empty($d['nombre']))   return 'El nombre es requerido.';
    if (empty($d['rut']))      return 'El RUT es requerido.';
    if (empty($d['direccion'])) return 'La dirección es requerida.';
    $estados = ['Activa','Inactiva','Suspendida'];
    if (!empty($d['estado']) && !in_array($d['estado'],$estados)) return 'Estado inválido.';
    return '';
}
