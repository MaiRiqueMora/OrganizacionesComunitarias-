<?php

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user   = requireSession();
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$action = $_GET['action'] ?? '';

// Get detalle de directiva + cargos
if ($method === 'GET') {

    if (!empty($_GET['id'])) {
        $id   = (int)$_GET['id'];
        $dir  = $pdo->prepare("SELECT * FROM directivas WHERE id=?");
        $dir->execute([$id]); $dir = $dir->fetch();
        if (!$dir) { echo json_encode(['ok'=>false,'error'=>'No encontrado.']); exit; }
        $cargos = $pdo->prepare("SELECT * FROM cargos_directiva WHERE directiva_id=? ORDER BY id");
        $cargos->execute([$id]);
        $dir['cargos'] = $cargos->fetchAll();
        echo json_encode(['ok'=>true,'data'=>$dir]); exit;
    }

    // Historial de directivas de una organización
    if (!empty($_GET['org_id'])) {
        $stmt = $pdo->prepare("
            SELECT d.*, COUNT(c.id) AS total_cargos
            FROM directivas d
            LEFT JOIN cargos_directiva c ON c.directiva_id = d.id
            WHERE d.organizacion_id = ?
            GROUP BY d.id
            ORDER BY d.es_actual DESC, d.fecha_inicio DESC
        ");
        $stmt->execute([(int)$_GET['org_id']]);
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
    }

    echo json_encode(['ok'=>false,'error'=>'Parámetros requeridos.']); exit;
}

// Post nuevo cargo o nueva directiva
if ($method === 'POST') {
    requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);

    if ($action === 'cargo') {
        $dirId = (int)($d['directiva_id'] ?? 0);
        if (!$dirId) { echo json_encode(['ok'=>false,'error'=>'directiva_id requerido.']); exit; }

        $cargosValidos = ['Presidente','Presidenta','Vicepresidente','Vicepresidenta',
            'Secretario','Secretaria','Tesorero','Tesorera',
            '1° Director','2° Director','3° Director','Suplente'];

        if (empty($d['cargo']) || !in_array($d['cargo'],$cargosValidos))
            { echo json_encode(['ok'=>false,'error'=>'Cargo inválido.']); exit; }
        if (empty($d['nombre_titular']))
            { echo json_encode(['ok'=>false,'error'=>'Nombre del titular requerido.']); exit; }

        $obligatorios = ['Presidente','Presidenta','Secretario','Secretaria','Tesorero','Tesorera'];
        $esOblig = in_array($d['cargo'],$obligatorios) ? 1 : 0;

        if (!empty($d['id'])) {
            // Editar cargo existente
            $pdo->prepare("UPDATE cargos_directiva SET cargo=?,nombre_titular=?,rut_titular=?,
                telefono=?,correo=?,estado_cargo=?,es_obligatorio=? WHERE id=?")
                ->execute([$d['cargo'],trim($d['nombre_titular']),$d['rut_titular']??null,
                    $d['telefono']??null,$d['correo']??null,
                    $d['estado_cargo']??'Activo',$esOblig,(int)$d['id']]);
        } else {
            $pdo->prepare("INSERT INTO cargos_directiva
                (directiva_id,cargo,nombre_titular,rut_titular,telefono,correo,estado_cargo,es_obligatorio)
                VALUES (?,?,?,?,?,?,?,?)")
                ->execute([$dirId,$d['cargo'],trim($d['nombre_titular']),$d['rut_titular']??null,
                    $d['telefono']??null,$d['correo']??null,$d['estado_cargo']??'Activo',$esOblig]);
        }
        echo json_encode(['ok'=>true]); exit;
    }

    // Crear nueva directiva
    if (empty($d['organizacion_id'])) { echo json_encode(['ok'=>false,'error'=>'organizacion_id requerido.']); exit; }
    if (empty($d['fecha_inicio']))    { echo json_encode(['ok'=>false,'error'=>'Fecha de inicio requerida.']); exit; }
    if (empty($d['fecha_termino']))   { echo json_encode(['ok'=>false,'error'=>'Fecha de término requerida.']); exit; }

    // Marcar todas las anteriores como no actuales
    $pdo->prepare("UPDATE directivas SET es_actual=0 WHERE organizacion_id=?")
        ->execute([(int)$d['organizacion_id']]);

    $pdo->prepare("INSERT INTO directivas (organizacion_id,fecha_inicio,fecha_termino,estado,es_actual,created_by) VALUES (?,?,?,?,1,?)")
        ->execute([(int)$d['organizacion_id'],$d['fecha_inicio'],$d['fecha_termino'],$d['estado']??'Vigente',$user['id']]);

    $newId = (int)$pdo->lastInsertId();

    // Actualizar fecha_vencimiento en organización
    $pdo->prepare("UPDATE organizaciones SET fecha_vencimiento_dir=?,fecha_ultima_eleccion=? WHERE id=?")
        ->execute([$d['fecha_termino'],$d['fecha_inicio'],(int)$d['organizacion_id']]);

    logHistorial('directivas',$newId,'crear','Nueva directiva registrada',$user['id']);
    echo json_encode(['ok'=>true,'id'=>$newId]); exit;
}

// Put edición de directiva (fechas o estado, no cargos)
if ($method === 'PUT') {
    requireRol('administrador','funcionario');
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }

    $pdo->prepare("UPDATE directivas SET fecha_inicio=?,fecha_termino=?,estado=?,updated_at=datetime('now','localtime') WHERE id=?")
        ->execute([$d['fecha_inicio'],$d['fecha_termino'],$d['estado']??'Vigente',$id]);

    // Sincronizar fecha en organización si es la directiva actual
    $dir = $pdo->prepare("SELECT * FROM directivas WHERE id=?");
    $dir->execute([$id]); $dir = $dir->fetch();
    if ($dir && $dir['es_actual']) {
        $pdo->prepare("UPDATE organizaciones SET fecha_vencimiento_dir=? WHERE id=?")
            ->execute([$d['fecha_termino'],$dir['organizacion_id']]);
    }

    logHistorial('directivas',$id,'editar','Directiva editada',$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

// Delete eliminar directiva (solo admin)
if ($method === 'DELETE') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    $pdo->prepare("DELETE FROM directivas WHERE id=?")->execute([$id]);
    logHistorial('directivas',$id,'eliminar','Directiva eliminada',$user['id']);
    echo json_encode(['ok'=>true]); exit;
}
