<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: config.php
 * 
 * DESCRIPCIÓN:
 * Archivo principal de configuración del sistema municipal.
 * Centraliza todos los parámetros ajustables de la aplicación.
 * 
 * SECCIONES DE CONFIGURACIÓN:
 * 1. Base de datos MySQL/MariaDB
 * 2. Servidor SMTP (emails)
 * 3. Parámetros de aplicación
 * 4. Subida de archivos
 * 5. Sistema de alertas
 * 6. Zona horaria y manejo de errores
 * 
 * AJUSTES IMPORTANTES ANTES DE INSTALAR:
 * - DB_*: Credenciales de MySQL/MariaDB
 * - SMTP_*: Configuración de servidor de correo
 * - APP_URL: URL base de la aplicación
 * 
 * SEGURIDAD:
 * - Usar contraseñas de aplicación Gmail (no la real)
 * - Habilitar 'secure'=>true en cookies con HTTPS
 * - Configurar firewall para acceso MySQL
 * 
 * @author Sistema Municipal
 * @version 2.0 (MySQL)
 * @since 2026
 */
/* 
   Base de datos MySQL/MariaDB
   Configurar estos datos según el servidor MySQL/MariaDB
*/
define('DB_HOST', 'localhost');           // Servidor MySQL
define('DB_NAME', 'sistema_municipal');   // Nombre de la base de datos
define('DB_USER', 'root');               // Usuario MySQL
define('DB_PASS', '');                    // Contraseña MySQL
define('DB_CHARSET', 'utf8mb4');          // Charset UTF-8 completo

/* ── SMTP (para recuperación de contraseña) ─────────────
   Usar una App Password de Gmail (no la contraseña real).
   Si no se usa recuperación por email, dejar como está.  */
define('SMTP_HOST',      'smtp.gmail.com');
define('SMTP_PORT',      587);
define('SMTP_USER',      'tucorreo@gmail.com');
define('SMTP_PASS',      'xxxx xxxx xxxx xxxx');
define('SMTP_FROM',      'tucorreo@gmail.com');
define('SMTP_FROM_NAME', 'Municipalidad de Pucón');

/* ── Aplicación ─────────────────────────────────────────
   Cambiar APP_URL si el sistema no está en la raíz o
   si el nombre de la carpeta es diferente.               */
define('APP_NAME', 'Sistema de Organizaciones');
define('APP_URL',  'http://localhost/sistema-municipal');
define('TOKEN_EXPIRY', 3600);

/* ── Subida de archivos ─────────────────────────────── */
define('UPLOAD_DIR',    __DIR__ . '/../uploads/');
define('UPLOAD_URL',    APP_URL . '/uploads/');
define('UPLOAD_MAX_MB', 10);
define('UPLOAD_TIPOS',  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png',
]);

/* ── Alertas ────────────────────────────────────────── */
define('ALERTA_DIAS_ANTES', 30);

/* ── Zona horaria ───────────────────────────────────── */
date_default_timezone_set('America/Santiago');

/* ── Manejo de errores ──────────────────────────────── */
ini_set('display_errors', '0');
ini_set('log_errors',     '1');
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

/**
 * Obtiene configuración de la base de datos
 * @return array Configuración de conexión MySQL
 */
function getDatabaseConfig(): array {
    return [
        'host'     => DB_HOST,
        'database' => DB_NAME,
        'username' => DB_USER,
        'password' => DB_PASS,
        'charset'  => DB_CHARSET,
    ];
}
