<?php

/**
 * Configuración del Sistema Municipal
 * Usa variables de entorno desde archivo .env
 */

// Cargar variables de entorno
require_once __DIR__ . '/Env.php';
Env::load();

/* Base de datos */
define('DB_HOST',    env('DB_HOST', 'localhost'));
define('DB_NAME',    env('DB_NAME', 'munidb_v2'));
define('DB_USER',    env('DB_USER', 'root'));
define('DB_PASS',    env('DB_PASS', ''));
define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));

/* SMTP (Gmail) */
define('SMTP_HOST',      env('SMTP_HOST', 'smtp.gmail.com'));
define('SMTP_PORT',      env('SMTP_PORT', '587'));
define('SMTP_USER',      env('SMTP_USER', 'tucorreo@gmail.com'));
define('SMTP_PASS',      env('SMTP_PASS', 'xxxx xxxx xxxx xxxx'));
define('SMTP_FROM',      env('SMTP_FROM', 'tucorreo@gmail.com'));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'Municipalidad — Sistema de Organizaciones'));

/* Aplicación */
define('APP_NAME',     env('APP_NAME', 'Sistema de Organizaciones'));
define('APP_URL',      env('APP_URL', 'http://localhost/sistema-municipal'));
define('TOKEN_EXPIRY', env('TOKEN_EXPIRY', '3600'));

/* Subida de archivos */
define('UPLOAD_DIR',      __DIR__ . '/../' . env('UPLOAD_DIR', 'uploads/'));
define('UPLOAD_URL',      APP_URL . '/' . env('UPLOAD_DIR', 'uploads/'));    
define('UPLOAD_MAX_MB',   env('UPLOAD_MAX_MB', '10'));                        
define('UPLOAD_TIPOS',    ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png']);

/* Alertas de vencimiento de directiva */
define('ALERTA_DIAS_ANTES', env('ALERTA_DIAS_ANTES', '30'));

/* Zona horaria */
date_default_timezone_set(env('TIMEZONE', 'America/Santiago'));

/* Configuración de entorno */
define('APP_ENV', env('APP_ENV', 'development'));
define('DEBUG',   env('DEBUG', false));
define('LOG_ERRORS', env('LOG_ERRORS', true));
