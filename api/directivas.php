<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: directivas.php
 * 
 * DESCRIPCIÓN:
 * API REST para gestión de directivas municipales y sus cargos asociados.
 * Administra la estructura organizativa y autoridades del municipio.
 * 
 * FUNCIONALIDADES:
 * - Creación, edición y eliminación de directivas
 * - Gestión de cargos dentro de cada directiva
 * - Listado de directivas con información detallada
 * - Asignación de miembros a directivas
 * - Control de vigencia y períodos
 * - Historial de cambios en directivas
 * 
 * ENDPOINTS:
 * - GET    /api/directivas.php              - Listar directivas
 * - GET    /api/directivas.php?id=X        - Detalle de directiva específica
 * - POST   /api/directivas.php              - Crear nueva directiva
 * - PUT    /api/directivas.php?id=X        - Actualizar directiva
 * - DELETE /api/directivas.php?id=X        - Eliminar directiva
 * - GET    /api/directivas.php?action=cargos&id=X - Listar cargos de directiva
 * 
 * ESTRUCTURA DE DATOS:
 * - Directiva: Entidad principal (consejo, comité, etc.)
 * - Cargos: Posiciones dentro de la directiva (presidente, secretario, etc.)
 * - Miembros: Personas asignadas a cada cargo
 * - Períodos: Vigencia de cada directiva
 * 
 * SEGURIDAD:
 * - Requiere autenticación de usuario
 * - Control de permisos por rol
 * - Validación de datos de entrada
 * - Logging de operaciones críticas
 * 
 * NOTA IMPORTANTE:
 * - Actualmente configurado con usuario temporal para pruebas
 * - En producción, descomentar requireSession()
 * - Eliminar código temporal antes de despliegue
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 * @todo Eliminar código temporal de autenticación
 */

require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Temporal: desactivar verificación de sesión para pruebas
// $user   = requireSession();
$user = ['id' => 1, 'username' => 'admin', 'rol' => 'administrador']; // Usuario temporal
// Debug: log para verificar que el usuario se está asignando correctamente
error_log('Usuario temporal asignado: ' . print_r($user, true));
$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$action = $_GET['action'] ?? '';

if ($method === 'GET') {

    // Detalle directiva + cargos
    if (!empty($_GET['id'])) {
        $id   = (int)$_GET['id'];
        $dir  = $pdo->prepare("SELECT id,organizacion_id,fecha_inicio,fecha_termino,estado FROM directivas WHERE id=?");
        $dir->execute([$id]); $dir = $dir->fetch();
        if (!$dir) { echo json_encode(['ok'=>false,'error'=>'No encontrado.']); exit; }
        $cargos = $pdo->prepare("SELECT id,directiva_id,cargo,nombre,rut,telefono,correo,direccion FROM cargos_directiva WHERE directiva_id=? ORDER BY id");
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
            ORDER BY d.fecha_inicio DESC
        ");
        $stmt->execute([(int)$_GET['org_id']]);
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]); exit;
    }

    echo json_encode(['ok'=>false,'error'=>'Parámetros requeridos.']); exit;
}

if ($method === 'POST') {
    // Temporal: desactivar verificación de rol para pruebas
    // requireRol('administrador','funcionario');
    $d = json_decode(file_get_contents('php://input'), true);

    // Guardar/actualizar cargo individual
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

    try {
        // Iniciar transacción
        $pdo->beginTransaction();
        
        // Insertar nueva directiva (sin es_actual ni created_by que no existen)
        $stmt = $pdo->prepare("
            INSERT INTO directivas (organizacion_id, fecha_inicio, fecha_termino, estado, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([(int)$d['organizacion_id'], $d['fecha_inicio'], $d['fecha_termino'], $d['estado']??'Vigente']);
        
        $newId = (int)$pdo->lastInsertId();
        
        // Actualizar fecha de vencimiento en la organización (sin fecha_ultima_eleccion que no existe)
        $stmt = $pdo->prepare("
            UPDATE organizaciones 
            SET fecha_vencimiento_dir = ? 
            WHERE id = ?
        ");
        $stmt->execute([$d['fecha_termino'], (int)$d['organizacion_id']]);
        
        // Confirmar transacción
        $pdo->commit();
        
        echo json_encode(['ok'=>true,'id'=>$newId]); exit;
        
    } catch (Exception $e) {
        // Revertir transacción si hay error
        if (isset($pdo)) {
            $pdo->rollBack();
        }
        echo json_encode(['ok'=>false,'error'=>'Error en la base de datos: ' . $e->getMessage()]); exit;
    }
}

if ($method === 'PUT') {
    // Temporal: desactivar verificación de rol para pruebas
    // requireRol('administrador','funcionario');
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }

    $pdo->prepare("UPDATE directivas SET fecha_inicio=?,fecha_termino=?,estado=?,updated_at=NOW() WHERE id=?")
        ->execute([$d['fecha_inicio'],$d['fecha_termino'],$d['estado']??'Vigente',$id]);

    // Sincronizar fecha en organización si es la directiva actual
    $dir = $pdo->prepare("SELECT id,organizacion_id,fecha_inicio,fecha_termino,estado FROM directivas WHERE id=?");
    $dir->execute([$id]); $dir = $dir->fetch();
    if ($dir && $dir['es_actual']) {
        $pdo->prepare("UPDATE organizaciones SET fecha_vencimiento_dir=? WHERE id=?")
            ->execute([$d['fecha_termino'],$dir['organizacion_id']]);
    }

    logHistorial('directivas',$id,'editar','Directiva editada',$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

if ($method === 'POST' && $action === 'restaurar') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    
    // Verificar si ya está activa
    $check = $pdo->prepare("SELECT id FROM directivas WHERE id=? AND eliminada = 1");
    $check->execute([$id]);
    if (!$check->fetch()) {
        echo json_encode(['ok'=>false,'error'=>'Directiva no encontrada o ya está activa.']); exit;
    }
    
    // Restaurar de papelera
    $pdo->prepare("UPDATE directivas SET eliminada = 0, fecha_eliminacion = NULL, eliminado_por = NULL WHERE id=?")->execute([$id]);
    logHistorial('directivas',$id,'restaurar','Directiva restaurada de papelera',$user['id']);
    echo json_encode(['ok'=>true]); exit;
}

if ($method === 'DELETE') {
    requireRol('administrador');
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    
    // Verificar si ya está eliminada
    $check = $pdo->prepare("SELECT id FROM directivas WHERE id=? AND (eliminada = 0 OR eliminada IS NULL)");
    $check->execute([$id]);
    if (!$check->fetch()) {
        echo json_encode(['ok'=>false,'error'=>'Directiva no encontrada o ya eliminada.']); exit;
    }
    
    // Soft delete - mover a papelera
    $pdo->prepare("UPDATE directivas SET eliminada = 1, fecha_eliminacion = NOW(), eliminado_por = ? WHERE id=?")->execute([$user['id'], $id]);
    logHistorial('directivas',$id,'eliminar','Directiva movida a papelera',$user['id']);
    echo json_encode(['ok'=>true]); exit;
}
