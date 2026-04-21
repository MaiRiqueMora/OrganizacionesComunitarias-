<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: change_password.php
 * 
 * DESCRIPCIÓN:
 * API REST para cambio de contraseña de usuarios autenticados.
 * Permite a los usuarios actualizar su propia contraseña de forma segura.
 * 
 * FUNCIONALIDADES:
 * - Validación de contraseña actual
 * - Verificación de nueva contraseña
 * - Confirmación de coincidencia
 * - Actualización segura con hash BCRYPT
 * - Validación de longitud mínima
 * 
 * ENDPOINT:
 * - POST /api/change_password.php - Cambiar contraseña
 * 
 * PARÁMETROS JSON:
 * - current: Contraseña actual del usuario
 * - password: Nueva contraseña (mínimo 8 caracteres)
 * - confirm: Confirmación de nueva contraseña
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Éxito de la operación
 * - error: Mensaje de error si aplica
 * 
 * SEGURIDAD:
 * - Requiere sesión activa (requireSession)
 * - Solo permite método POST
 * - Verifica contraseña actual con password_verify()
 * - Usa hash BCRYPT para almacenamiento
 * - Validación de longitud mínima (8 caracteres)
 * - Confirmación de coincidencia
 * 
 * VALIDACIONES:
 * - Todos los campos requeridos
 * - Mínimo 8 caracteres para nueva contraseña
 * - Las contraseñas nueva y confirm deben coincidir
 * - Contraseña actual debe ser correcta
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD']!=='POST'){
    http_response_code(405);
    exit;
}

// Requiere sesión activa
$u = requireSession();

// Obtener datos JSON
$d = json_decode(file_get_contents('php://input'),true);
$current=$d['current']??''; 
$new=$d['password']??''; 
$confirm=$d['confirm']??'';

// Validar campos requeridos
if(!$current||!$new||!$confirm){
    echo json_encode(['ok'=>false,'error'=>'Todos los campos son requeridos.']);
    exit;
}

// Validar longitud mínima
if(strlen($new)<8){
    echo json_encode(['ok'=>false,'error'=>'Mínimo 8 caracteres.']);
    exit;
}

// Validar coincidencia
if($new!==$confirm){
    echo json_encode(['ok'=>false,'error'=>'Las contraseñas no coinciden.']);
    exit;
}

// Verificar contraseña actual
$pdo=getDB();
$row=$pdo->prepare("SELECT password_hash FROM usuarios WHERE id=?");
$row->execute([$u['id']]); 
$row=$row->fetch();

if(!$row||!password_verify($current,$row['password_hash'])){
    echo json_encode(['ok'=>false,'error'=>'Contraseña actual incorrecta.']);
    exit;
}

// Actualizar contraseña con hash seguro
$pdo->prepare("UPDATE usuarios SET password_hash=? WHERE id=?")
    ->execute([password_hash($new,PASSWORD_BCRYPT),$u['id']]);

echo json_encode(['ok'=>true]);
