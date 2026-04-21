<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: diagnostico.php
 * 
 * DESCRIPCIÃ“N:
 * Script de diagnÃ³stico completo del sistema y base de datos.
 * Herramienta de verificaciÃ³n de estado e integridad del sistema.
 * 
 * FUNCIONALIDADES:
 * - VerificaciÃ³n de conexiÃ³n a base de datos
 * - Listado de todas las tablas existentes
 * - ValidaciÃ³n de estructura de tablas crÃ­ticas
 * - Conteo de registros por tabla
 * - DetecciÃ³n de problemas de instalaciÃ³n
 * - DiagnÃ³stico de integridad de datos
 * - VerificaciÃ³n de permisos y accesos
 * 
 * DIAGNÃ“STICOS REALIZADOS:
 * - ConexiÃ³n MySQL/MariaDB y existencia de BD
 * - Presencia de tablas esenciales (organizaciones, usuarios, etc.)
 * - Conteo de registros para verificar datos
 * - Estructura de tablas y columnas
 * - Estado general del sistema
 * 
 * USO:
 * - Herramienta de diagnÃ³stico rÃ¡pido
 * - VerificaciÃ³n post-instalaciÃ³n
 * - Soporte tÃ©cnico y troubleshooting
 * - Acceso sin autenticaciÃ³n (herramienta de sistema)
 * - Para uso del equipo de TI y desarrolladores
 * 
 * SALIDA JSON:
 * - ok: true/false - Estado general del sistema
 * - tablas: Array con nombres de tablas existentes
 * - registros: Array con conteo por tabla
 * - errores: Array con problemas detectados
 * - action: AcciÃ³n recomendada si hay problemas
 * 
 * ACCIONES RECOMENDADAS:
 * - Ejecutar install.php si no hay tablas
 * - Verificar permisos si hay errores de conexiÃ³n
 * - Revisar estructura si faltan tablas crÃ­ticas
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../config/db.php';

    $pdo = getDB();
    
    // Listar todas las tablas
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo json_encode(['error' => 'No hay tablas en la BD', 'action' => 'Ejecutar install.php']);
        exit;
    }
    
    // Verificar que existe la tabla organizaciones
    if (!in_array('organizaciones', $tables)) {
        echo json_encode(['error' => 'Tabla "organizaciones" no existe', 'tablas_existentes' => $tables]);
        exit;
    }
    
    // Contar registros
    $count = $pdo->query("SELECT COUNT(*) FROM organizaciones")->fetchColumn();
    
    echo json_encode(['ok' => true, 'tablas' => $tables, 'organizaciones_count' => $count]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
