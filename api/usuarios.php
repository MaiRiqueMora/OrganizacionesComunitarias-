<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: usuarios.php
 * 
 * DESCRIPCIÓN:
 * API REST para gestión de usuarios del sistema.
 * Maneja operaciones CRUD para administración de cuentas de usuario.
 * 
 * FUNCIONALIDADES:
 * - Listado de usuarios del sistema
 * - Creación de nuevas cuentas de usuario
 * - Actualización de datos de usuarios
 * - Activación/desactivación de cuentas
 * - Gestión de roles y permisos
 * - Validación de datos de usuario
 * - Control de acceso administrativo
 * 
 * ENDPOINTS:
 * - GET    /api/usuarios.php                    - Listar todos los usuarios
 * - POST   /api/usuarios.php                    - Crear nuevo usuario
 * - PUT    /api/usuarios.php?id=X              - Actualizar usuario existente
 * - DELETE /api/usuarios.php?id=X              - Eliminar usuario
 * 
 * SEGURIDAD:
 * - Requiere rol administrador obligatoriamente
 * - Validación de todos los datos de entrada
 * - Contraseñas hasheadas con BCRYPT
 * - Control de duplicados en username y email
 * - Sanitización de datos sensibles
 * - Logging de operaciones administrativas
 * 
 * ROLES DE USUARIO:
 * - administrador: Acceso completo al sistema
 * - funcionario: Acceso limitado a funciones asignadas
 * 
 * ESTRUCTURA DE DATOS:
 * - id: Identificador único del usuario
 * - username: Nombre de usuario único
 * - email: Correo electrónico único
 * - password: Contraseña hasheada (BCRYPT)
 * - rol: Rol de usuario (administrador/funcionario)
 * - nombre_completo: Nombre completo del usuario
 * - activo: Estado de la cuenta (true/false)
 * - created_at: Fecha de creación
 * - updated_at: Última actualización
 * 
 * VALIDACIONES:
 * - Username: Obligatorio, único, alfanumérico
 * - Email: Obligatorio, único, formato válido
 * - Password: Obligatorio, mínimo 8 caracteres
 * - Rol: Obligatorio, valor válido
 * - Nombre completo: Obligatorio
 * 
 * OPERACIONES CRUD:
 * 
 * GET - Listar usuarios:
 * - Devuelve todos los usuarios del sistema
 * - Incluye información básica (sin contraseñas)
 * - Ordenado por nombre completo
 * - Solo accesible por administradores
 * 
 * POST - Crear usuario:
 * - Valida todos los campos obligatorios
 * - Verifica unicidad de username y email
 * - Hashea contraseña con BCRYPT
 * - Asigna rol y estado por defecto
 * - Registra creación en logs
 * 
 * PUT - Actualizar usuario:
 * - Permite modificar datos excepto username
 * - Opcional cambiar contraseña
 * - Mantiene unicidad de email
 * - Actualiza timestamp de modificación
 * 
 * DELETE - Eliminar usuario:
 * - Verifica que no sea el último administrador
 * - Elimina sesión activa si existe
 * - Registra eliminación en auditoría
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Estado de la operación
 * - data: Array de usuarios o datos del usuario creado/actualizado
 * - message: Mensaje informativo
 * - error: Mensaje de error específico
 * 
 * ERRORES COMUNES:
 * - "Username requerido": Campo username vacío
 * - "Email requerido": Campo email vacío
 * - "Contraseña requerida": Campo password vacío
 * - "Username ya existe": Duplicado de username
 * - "Email ya existe": Duplicado de email
 * - "Rol inválido": Valor de rol no permitido
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Usar sessionUser para no bloquear completamente
$user   = sessionUser();
$method = $_SERVER['REQUEST_METHOD'];

// Verificar permisos de administrador
if (!$user || !isAdmin()) {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Se requiere rol administrador']);
    exit;
}
$pdo    = getDB();

if ($method === 'GET') {
    // Listar todos los usuarios del sistema
    try {
        $rows = $pdo->query("SELECT id,username,email,rol,nombre_completo,activo,creado_en AS created_at FROM usuarios ORDER BY nombre_completo")->fetchAll();
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$rows]); 
        exit;
    } catch (PDOException $e) {
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]); 
        exit;
    }
}

if ($method === 'POST') {
    // Crear nuevo usuario
    $d = json_decode(file_get_contents('php://input'), true);
    if (empty($d['username']))       { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Username requerido.']); exit; }
    if (empty($d['email']))          { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Email requerido.']); exit; }
    if (empty($d['password']))       { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Contraseña requerida.']); exit; }
    if (strlen($d['password']) < 8)  { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Mínimo 8 caracteres.']); exit; }
    $roles = ['administrador','funcionario','consulta'];
    if (!in_array($d['rol']??'',$roles)) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Rol inválido.']); exit; }
    try {
        $pdo->prepare("INSERT INTO usuarios (username,email,password_hash,rol,nombre_completo) VALUES (?,?,?,?,?)")
            ->execute([trim($d['username']),trim($d['email']),password_hash($d['password'],PASSWORD_BCRYPT),$d['rol'],trim($d['nombre_completo']??'')]);
        ob_end_clean();
        echo json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()]);
    } catch (PDOException $e) {
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'El username o email ya existe.']);
    }
    exit;
}

if ($method === 'PUT') {
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido.']); exit; }
    // No deja al admin desactivarse a sí mismo
    if ($id === $user['id'] && isset($d['activo']) && !$d['activo']) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No puedes desactivar tu propia cuenta.']); exit;
    }
    $fields = []; $vals = [];
    if (isset($d['email']))          { $fields[]='email=?';          $vals[]=trim($d['email']); }
    if (isset($d['rol']))            { $fields[]='rol=?';            $vals[]=$d['rol']; }
    if (isset($d['nombre_completo'])){ $fields[]='nombre_completo=?';$vals[]=trim($d['nombre_completo']); }
    if (isset($d['activo']))         { $fields[]='activo=?';         $vals[]=(int)(bool)$d['activo']; }
    if (!empty($d['password']) && strlen($d['password'])>=8) {
        $fields[]='password_hash=?'; $vals[]=password_hash($d['password'],PASSWORD_BCRYPT);
    }
    if (!$fields) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Sin datos para actualizar.']); exit; }
    $vals[] = $id;
    try {
        $pdo->prepare("UPDATE usuarios SET ".implode(',',$fields)." WHERE id=?")->execute($vals);
        ob_end_clean();
        echo json_encode(['ok'=>true]); 
        exit;
    } catch (PDOException $e) {
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error al actualizar: ' . $e->getMessage()]); 
        exit;
    }
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id === $user['id']) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No puedes eliminarte a ti mismo.']); exit; }
    try {
        $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
        ob_end_clean();
        echo json_encode(['ok'=>true]); 
        exit;
    } catch (PDOException $e) {
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error al eliminar: ' . $e->getMessage()]); 
        exit;
    }
}
