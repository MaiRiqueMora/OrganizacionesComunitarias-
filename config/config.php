<?php

/* Base de datos */
define('DB_HOST',    'localhost');
define('DB_NAME',    'munidb_v2'); // Cambiado de 'munidb' a 'munidb_v2'
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

/* SMTP (Gmail) */
define('SMTP_HOST',      'smtp.gmail.com');
define('SMTP_PORT',      587);
define('SMTP_USER',      'tucorreo@gmail.com');
define('SMTP_PASS',      'xxxx xxxx xxxx xxxx');
define('SMTP_FROM',      'tucorreo@gmail.com');
define('SMTP_FROM_NAME', 'Municipalidad — Sistema de Organizaciones');

/* Aplicación */
define('APP_NAME',     'Sistema de Organizaciones');
define('APP_URL',      'http://localhost/sistema-municipal');
define('TOKEN_EXPIRY', 3600);

/* Subida de archivos */
define('UPLOAD_DIR',      __DIR__ . '/../uploads/');
define('UPLOAD_URL',      APP_URL . '/uploads/');    
define('UPLOAD_MAX_MB',   10);                        
define('UPLOAD_TIPOS',    ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png']);

/* Alertas de vencimiento de directiva */
define('ALERTA_DIAS_ANTES', 30);

/* Zona horaria */
date_default_timezone_set('America/Santiago');
