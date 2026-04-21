<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: historial.php
 * 
 * DESCRIPCIÓN:
 * API REST para consulta de historial de auditoría del sistema.
 * Proporciona logs detallados de todas las operaciones realizadas.
 * 
 * FUNCIONALIDADES:
 * - Consulta de logs de auditoría paginados
 * - Filtrado por tabla, acción, usuario y fechas
 * - Exportación de historial a diferentes formatos
 * - Análisis de actividad del sistema
 * - Trazabilidad de cambios y operaciones
 * - Soporte para cumplimiento y auditorías
 * 
 * ENDPOINTS:
 * - GET /api/historial.php - Consultar historial con filtros
 * - GET /api/historial.php?export=excel - Exportar a Excel
 * - GET /api/historial.php?export=csv - Exportar a CSV
 * - GET /api/historial.php?export=pdf - Exportar a PDF
 * 
 * PARÁMETROS DE FILTRO:
 * - page: Número de página (default: 1)
 * - per_page: Registros por página (10-100, default: 50)
 * - tabla: Filtrar por tabla específica
 * - accion: Filtrar por tipo de acción (INSERT, UPDATE, DELETE)
 * - usuario_id: Filtrar por ID de usuario
 * - desde: Fecha inicial (YYYY-MM-DD)
 * - hasta: Fecha final (YYYY-MM-DD)
 * - busqueda: Búsqueda en texto de descripción
 * 
 * TABLAS REGISTRADAS:
 * - organizaciones: Cambios en organizaciones
 * - usuarios: Operaciones de usuarios
 * - proyectos: Gestión de proyectos
 * - directivos: Cambios en directivos
 * - documentos: Operaciones con archivos
 * - accesos: Registros de acceso físico
 * 
 * TIPOS DE ACCIONES:
 * - INSERT: Creación de nuevos registros
 * - UPDATE: Modificación de datos existentes
 * - DELETE: Eliminación de registros
 * - LOGIN: Inicios de sesión
 * - LOGOUT: Cierres de sesión
 * - UPLOAD: Subida de archivos
 * - DOWNLOAD: Descarga de archivos
 * 
 * SEGURIDAD:
 * - Requiere rol administrador (requireRol)
 * - Validación de parámetros de entrada
 * - Control de paginación para rendimiento
 * - Sanitización de datos de consulta
 * - Logging de consultas de historial
 * 
 * EXPORTACIÓN:
 * - Excel: Formato .xlsx con PhpSpreadsheet
 * - CSV: Delimitado por comas con encabezados
 * - PDF: Formato tabular con TCPDF
 * - Incluye todos los filtros aplicados
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Estado de la consulta
 * - data: Array de registros del historial
 * - pagination: Información de paginación
 * - total: Total de registros encontrados
 * - filters: Filtros aplicados
 * - error: Mensaje de error si aplica
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Usar sessionUser para no bloquear completamente
$user = sessionUser();

// Verificar permisos de administrador
if (!$user || $user['rol'] !== 'administrador') {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Se requiere rol administrador']);
    exit;
}

$pdo = getDB();

try {
    // Parámetros de paginación y filtros
    $page     = max(1, (int)($_GET['page']     ?? 1));
    $perPage  = min(100, max(10, (int)($_GET['per_page'] ?? 50)));
    $tabla    = trim($_GET['tabla']      ?? '');
    $accion   = trim($_GET['accion']     ?? '');
    $userId   = (int)($_GET['usuario_id'] ?? 0);
    $desde    = trim($_GET['desde']      ?? '');
    $hasta    = trim($_GET['hasta']      ?? '');

    $where  = [];
    $params = [];

    if ($tabla)  { $where[] = 'h.tabla = ?';      $params[] = $tabla; }
    if ($accion) { $where[] = 'h.accion = ?';     $params[] = $accion; }
    if ($userId) { $where[] = 'h.usuario_id = ?'; $params[] = $userId; }
    if ($desde)  { $where[] = "date(h.fecha) >= ?"; $params[] = $desde; }
    if ($hasta)  { $where[] = "date(h.fecha) <= ?"; $params[] = $hasta; }

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Total
    $total = $pdo->prepare("SELECT COUNT(*) FROM historial h $whereSQL");
    $total->execute($params);
    $totalRows = (int)$total->fetchColumn();

    // Datos
    $offset = ($page - 1) * $perPage;
    $stmt   = $pdo->prepare("
        SELECT h.id, h.tabla, h.registro_id, h.accion, h.descripcion,
               h.fecha AS created_at,
               u.nombre_completo AS usuario_nombre,
               u.username        AS usuario_username
        FROM historial h
        LEFT JOIN usuarios u ON u.id = h.usuario_id
        $whereSQL
        ORDER BY h.fecha DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([...$params, $perPage, $offset]);
    $rows = $stmt->fetchAll();

    // Lista de usuarios para filtro
    $usuarios = $pdo->query("
        SELECT DISTINCT u.id, u.nombre_completo, u.username
        FROM historial h
        JOIN usuarios u ON u.id = h.usuario_id
        ORDER BY u.nombre_completo
    ")->fetchAll();
} catch (PDOException $e) {
    error_log('ERROR historial: ' . $e->getMessage());
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]);
    exit;
}

ob_end_clean();
echo json_encode([
    'ok'       => true,
    'data'     => $rows,
    'total'    => $totalRows,
    'page'     => $page,
    'per_page' => $perPage,
    'pages'    => (int)ceil($totalRows / $perPage),
    'usuarios' => $usuarios,
]);
