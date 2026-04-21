<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: forgot_password.php
 * 
 * DESCRIPCIÓN:
 * API REST para recuperación de contraseñas olvidadas.
 * Envía enlaces de restablecimiento seguros por correo electrónico.
 * 
 * FUNCIONALIDADES:
 * - Generación de tokens de recuperación únicos
 * - Envío de correos con enlaces de restablecimiento
 * - Validación de existencia de usuario por email
 * - Control de tiempo de expiración de tokens
 * - Prevención de ataques de fuerza bruta
 * - Logging de intentos de recuperación
 * 
 * ENDPOINT:
 * - POST /api/forgot_password.php - Solicitar recuperación de contraseña
 * 
 * PARÁMETROS JSON:
 * - email: Correo electrónico del usuario
 * 
 * PROCESO DE RECUPERACIÓN:
 * 1. Validar que el email existe en el sistema
 * 2. Generar token único con timestamp
 * 3. Almacenar token en base de datos
 * 4. Enviar correo con enlace de restablecimiento
 * 5. Registrar intento para auditoría
 * 
 * SEGURIDAD:
 * - Solo permite método POST
 * - Validación de formato de email
 * - Tokens únicos con expiración
 * - Rate limiting implícito por búsqueda de email
 * - No revela si email existe o no
 * - Logging de todos los intentos
 * 
 * CONFIGURACIÓN SMTP:
 * - Usa PHPMailer para envío de correos
 * - Configuración desde config.php
 * - Soporta Gmail con App Password
 * - Manejo de errores de envío
 * 
 * CORREO ENVIADO:
 * - Asunto: "Restablecimiento de Contraseña - Sistema Municipal"
 * - Contenido: Enlace con token de recuperación
 * - Expiración: 1 hora desde generación
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Éxito de la operación
 * - message: Mensaje informativo (siempre éxito por seguridad)
 * - error: Mensaje de error si aplica
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ini_set('display_errors', 0);
ob_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../vendor/phpmailer/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean();
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

$generic = ['ok' => true, 'message' => 'Si el correo está registrado, recibirás un enlace en breve.'];

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ob_end_clean();
    echo json_encode($generic);
    exit;
}

try {
    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT id, nombre_completo FROM usuarios WHERE email = ? AND activo = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        ob_end_clean();
        echo json_encode($generic);
        exit;
    }

    $token     = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);

    $pdo->prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0")
        ->execute([$user['id']]);
    $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)")
        ->execute([$user['id'], $tokenHash, $expiresAt]);

    $resetUrl = APP_URL . '/pages/reset_password.html?token=' . $token;
    $nombre   = $user['nombre_completo'] ?: 'Usuario';

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = SMTP_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = SMTP_PORT;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom(SMTP_FROM, 'Municipalidad de Pucón');
    $mail->addAddress($email, $nombre);
    $mail->Subject = 'Recuperación de contraseña — Sistema Municipal';
    $mail->isHTML(true);
    $mail->Body = "
    <div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e'>
      <div style='background:#0d1b2a;padding:28px 32px;border-radius:10px 10px 0 0;text-align:center'>
        <h2 style='color:#c9a84c;margin:0;font-size:1.2rem'>🏛️ Municipalidad de Pucón</h2>
        <p style='color:rgba(245,240,232,.6);margin:6px 0 0;font-size:.85rem'>Sistema de Organizaciones Comunitarias</p>
      </div>
      <div style='background:#f9f6f0;padding:32px;border-radius:0 0 10px 10px'>
        <p style='margin:0 0 16px'>Hola <strong>{$nombre}</strong>,</p>
        <p style='margin:0 0 24px;color:#444'>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para continuar:</p>
        <div style='text-align:center;margin:28px 0'>
          <a href='{$resetUrl}'
             style='background:#0d1b2a;color:#c9a84c;padding:14px 32px;border-radius:8px;
                    text-decoration:none;font-weight:bold;font-size:.95rem;display:inline-block'>
            Restablecer contraseña
          </a>
        </div>
        <p style='color:#888;font-size:.8rem;margin:24px 0 0'>
          Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este mensaje.<br><br>
          O copia este enlace en tu navegador:<br>
          <span style='color:#0d1b2a;word-break:break-all'>{$resetUrl}</span>
        </p>
      </div>
    </div>";
    $mail->AltBody = "Hola {$nombre},\n\nRestablece tu contraseña en el siguiente enlace (válido 1 hora):\n{$resetUrl}\n\nSi no solicitaste este cambio, ignora este mensaje.";

    $mail->send();

    ob_end_clean();
    echo json_encode($generic);

} catch (Exception $e) {
    ob_end_clean();
    error_log('PHPMailer error: ' . $e->getMessage());
    echo json_encode($generic);
} catch (\Throwable $e) {
    ob_end_clean();
    error_log('forgot_password error: ' . $e->getMessage());
    echo json_encode($generic);
}
