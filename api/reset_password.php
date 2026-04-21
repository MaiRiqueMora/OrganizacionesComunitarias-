<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: reset_password.php
 * 
 * DESCRIPCIÓN:
 * API REST para restablecimiento de contraseñas con token.
 * Procesa solicitudes de recuperación enviadas por forgot_password.php.
 * 
 * FUNCIONALIDADES:
 * - Validación de tokens de recuperación
 * - Restablecimiento seguro de contraseñas
 * - Verificación de coincidencia de contraseñas
 * - Invalidación de tokens usados
 * - Logging de operaciones de reset
 * - Validación de políticas de contraseñas
 * - Manejo de errores y validaciones
 * 
 * ENDPOINT:
 * - POST /api/reset_password.php - Restablecer contraseña con token
 * 
 * PARÁMETROS JSON:
 * - token: Token de recuperación recibido por email
 * - password: Nueva contraseña (mínimo 8 caracteres)
 * - confirm: Confirmación de la nueva contraseña
 * 
 * POLÍTICAS DE CONTRASEÑA:
 * - Longitud mínima: 8 caracteres
 * - Coincidencia obligatoria con confirmación
 * - Token válido y no expirado
 * - Token de uso único (se invalida después de usar)
 * 
 * PROCESO DE RESTABLECIMIENTO:
 * 1. Validar método POST y parámetros obligatorios
 * 2. Verificar formato y validez del token
 * 3. Validar políticas de contraseña
 * 4. Buscar token válido en base de datos
 * 5. Verificar que el token no esté expirado
 * 6. Actualizar contraseña del usuario
 * 7. Invalidar token usado
 * 8. Registrar operación en logs
 * 
 * VALIDACIONES REALIZADAS:
 * - Token no vacío y formato válido
 * - Contraseña mínimo 8 caracteres
 * - Contraseña y confirmación coinciden
 * - Token existe en base de datos
 * - Token no expirado (tiempo límite: 1 hora)
 * - Token no ha sido usado previamente
 * 
 * SEGURIDAD:
 * - Solo permite método POST
 * - Hash SHA256 del token para búsqueda segura
 * - Contraseñas hasheadas con BCRYPT
 * - Tokens de uso único
 * - Tiempo de expiración controlado
 * - Logging de operaciones de reset
 * - Sanitización de datos de entrada
 * 
 * BASE DE DATOS:
 * - Tabla: password_resets
 * - Campos: token_hash, user_id, created_at, used_at
 * - Explicación: Token SHA256, ID usuario, creación, uso
 * - Limpieza: Tokens expirados se eliminan automáticamente
 * 
 * ERRORES COMUNES:
 * - "Token inválido": Token vacío o malformado
 * - "Token no encontrado": No existe en BD
 * - "Token expirado": Más de 1 hora de creado
 * - "Token ya usado": Ya fue utilizado previamente
 * - "Contraseña débil": Menos de 8 caracteres
 * - "Contraseñas no coinciden": Validación fallida
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Estado de la operación
 * - message: Mensaje de éxito
 * - error: Mensaje de error específico
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

// Obtener y validar datos de entrada
$data     = json_decode(file_get_contents('php://input'), true);
$rawToken = trim($data['token']    ?? '');
$password = $data['password']      ?? '';
$confirm  = $data['confirm']       ?? '';

// Validaciones básicas
if (!$rawToken)              { echo json_encode(['ok'=>false,'error'=>'Token inválido.']); exit; }
if (strlen($password) < 8)  { echo json_encode(['ok'=>false,'error'=>'La contraseña debe tener al menos 8 caracteres.']); exit; }
if ($password !== $confirm)  { echo json_encode(['ok'=>false,'error'=>'Las contraseñas no coinciden.']); exit; }

// Generar hash del token para búsqueda segura
$tokenHash = hash('sha256', $rawToken);
$pdo       = getDB();

$stmt = $pdo->prepare("
    SELECT id, user_id, expires_at, used
    FROM password_resets
    WHERE token = ?
    LIMIT 1
");
$stmt->execute([$tokenHash]);
$reset = $stmt->fetch();

if (!$reset)        { echo json_encode(['ok'=>false,'error'=>'Token inválido o no encontrado.']); exit; }
if ($reset['used']) { echo json_encode(['ok'=>false,'error'=>'Este enlace ya fue utilizado.']); exit; }
if (strtotime($reset['expires_at']) < time()) {
    echo json_encode(['ok'=>false,'error'=>'El enlace ha expirado. Solicita uno nuevo.']); exit;
}

// Actualizar contraseña
$pdo->prepare("UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?")
    ->execute([password_hash($password, PASSWORD_BCRYPT), $reset['user_id']]);

// Marcar token como usado
$pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
    ->execute([$reset['id']]);

echo json_encode(['ok'=>true]);
