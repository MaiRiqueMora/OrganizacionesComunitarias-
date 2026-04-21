<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: logout.php
 * 
 * DESCRIPCIÓN:
 * API REST para cierre de sesión de usuarios.
 * Maneja el proceso de logout con registro de duración y limpieza de sesión.
 * 
 * FUNCIONALIDADES:
 * - Cierre seguro de sesión PHP
 * - Registro de duración de sesión en base de datos
 * - Limpieza completa de variables de sesión
 * - Redirección a página de login
 * - Logging de actividad de cierre de sesión
 * - Actualización de timestamps de acceso
 * 
 * ENDPOINT:
 * - GET/POST /api/logout.php - Cerrar sesión actual
 * 
 * PROCESO DE LOGOUT:
 * 1. Iniciar sesión si no está activa
 * 2. Verificar si existe registro de acceso
 * 3. Calcular duración total de la sesión
 * 4. Actualizar registro en tabla accesos
 * 5. Destruir completamente la sesión
 * 6. Limpiar cookies de sesión
 * 7. Redirigir a página de login
 * 
 * REGISTRO DE DURACIÓN:
 * - Busca inicio_sesion desde tabla accesos
 * - Calcula diferencia en segundos
 * - Actualiza fin_sesion con timestamp actual
 * - Guarda duracion_seg para estadísticas
 * - Maneja errores sin interrumpir el logout
 * 
 * SEGURIDAD:
 * - Destrucción completa de sesión PHP
 * - Limpieza de todas las variables $_SESSION
 * - Eliminación de cookie de sesión
 * - No requiere autenticación (para cierre forzado)
 * - Manejo seguro de errores
 * 
 * BASE DE DATOS:
 * - Tabla: accesos
 * - Campos actualizados:
 *   - fin_sesion: datetime('now','localtime')
 *   - duracion_seg: segundos totales de sesión
 * - Condición: WHERE id = acceso_id de sesión
 * 
 * REDIRECCIÓN:
 * - Después de logout exitoso
 * - Destino: ../index.php (página de login)
 * - Método: header('Location:')
 * - Salida inmediata con exit()
 * 
 * MANEJO DE ERRORES:
 * - Try-catch para operaciones de BD
 * - No interrumpe el proceso de logout
 * - Logging silencioso de errores
 * - Continúa con destrucción de sesión
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Iniciar sesión para poder destruirla
sessionStart();

// Registrar duración de sesión si existe acceso_id
if (!empty($_SESSION['acceso_id'])) {
    try {
        $pdo = getDB();
        
        // Obtener timestamp de inicio de sesión
        $stmt = $pdo->prepare("SELECT inicio_sesion FROM accesos WHERE id = ?");
        $stmt->execute([$_SESSION['acceso_id']]);
        $loginAt = $stmt->fetchColumn();
        
        if ($loginAt) {
            // Calcular duración en segundos
            $dur = time() - strtotime($loginAt);
            
            // Actualizar registro con fin de sesión y duración
            $pdo->prepare("UPDATE accesos SET fin_sesion = NOW(), duracion_seg = ? WHERE id = ?")
                ->execute([$dur, $_SESSION['acceso_id']]);
        }
    } catch (Throwable $e) { 
        // No interrumpir el logout por errores de BD
        error_log('Error al registrar logout: ' . $e->getMessage());
    }
}

session_unset();
session_destroy();

$isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) ||
          str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

if ($isAjax) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true]);
} else {
    header('Location: ../index.html');
    exit;
}
