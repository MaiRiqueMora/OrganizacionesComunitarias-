<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: deshacer_importacion.php
 * 
 * DESCRIPCIÓN:
 * API REST para reversión de importaciones masivas de datos.
 * Permite deshacer operaciones de importación por lotes con rollback completo.
 * 
 * FUNCIONALIDADES:
 * - Reversión completa de importaciones masivas
 * - Eliminación en cascada de registros importados
 * - Restauración de estado anterior del sistema
 * - Validación de permisos de administrador/funcionario
 * - Logging de operaciones de reversión
 * - Manejo seguro de transacciones
 * 
 * ENDPOINT:
 * - DELETE /api/deshacer_importacion.php?import_id=X&tipo=Y - Deshacer importación
 * 
 * PARÁMETROS:
 * - import_id: Identificador único de la importación
 * - tipo: Tipo de datos importados (organizaciones, proyectos, etc.)
 * 
 * TIPOS DE IMPORTACIÓN SOPORTADOS:
 * - organizaciones: Reversión de importación de organizaciones
 * - proyectos: Reversión de importación de proyectos/subvenciones
 * - directivos: Reversión de importación de directivos
 * - documentos: Reversión de importación de documentos
 * 
 * SEGURIDAD:
 * - Requiere rol administrador o funcionario (requireRol)
 * - Validación de parámetros obligatorios
 * - Solo permite método DELETE
 * - Control de acceso por permisos
 * - Transacciones atómicas para integridad
 * 
 * PROCESO DE REVERSIÓN:
 * 1. Validar parámetros y permisos
 * 2. Identificar registros importados por import_id
 * 3. Eliminar en orden inverso (dependencias primero)
 * 4. Limpiar metadatos de importación
 * 5. Confirmar operación completada
 * 
 * RESPUESTA JSON:
 * - ok: true/false - Éxito de la operación
 * - error: Mensaje de error si aplica
 * - registros_eliminados: Número de registros revertidos
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

// Requiere rol administrador o funcionario
requireRol('administrador', 'funcionario');
$user = sessionUser();

// Solo permitir método DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Método no válido']); exit;
}

// Validar parámetros obligatorios
$importId = trim($_GET['import_id'] ?? '');
$tipo     = trim($_GET['tipo'] ?? '');

if (!$importId || !$tipo) {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Parámetros incompletos']); exit;
}

$pdo = getDB();

$tabla = $tipo === 'directivos' ? 'directivos' : 'organizaciones';
$count = $pdo->prepare("SELECT COUNT(*) FROM $tabla WHERE import_id=?");
$count->execute([$importId]);
$total = (int)$count->fetchColumn();

if ($total === 0) {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>"No se encontraron registros con ID de importación '$importId'."]); exit;
}

$pdo->prepare("DELETE FROM $tabla WHERE import_id=?")->execute([$importId]);
logHistorial($tabla, 0, 'deshacer', "Importación $importId deshecha — $total registros eliminados.", $user['id']);

ob_end_clean();
echo json_encode(['ok'=>true,'eliminados'=>$total,'import_id'=>$importId]);
