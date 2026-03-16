<?php
/* ============================================================
   api/subvenciones.php — API para gestión de subvenciones
   GET    ?action=list&org_id=N           → listado de subvenciones por organización
   GET    ?action=stats&org_id=N           → estadísticas de subvenciones
   GET    ?action=get&id=N                → detalle de subvención
   POST   ?action=create                  → crear nueva subvención
   PUT    ?action=update&id=N             → actualizar subvención
   DELETE ?id=N                           → eliminar subvención
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();
    
    // ── GET ──────────────────────────────────────────────────────
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';
        $org_id = (int)($_GET['org_id'] ?? 0);
        
        if ($action === 'list') {
            if ($org_id <= 0) {
                json_out(['ok' => false, 'error' => 'ID de organización requerido']);
            }
            
            $stmt = $db->prepare("
                SELECT s.*, u.nombre_completo as creado_por_nombre 
                FROM subvenciones s 
                LEFT JOIN usuarios u ON s.creado_por = u.id 
                WHERE s.organizacion_id = ? 
                ORDER BY s.ano_postulacion DESC, s.creado_en DESC
            ");
            $stmt->execute([$org_id]);
            $subvenciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            json_out(['ok' => true, 'data' => $subvenciones]);
        }
        
        if ($action === 'stats') {
            if ($org_id <= 0) {
                json_out(['ok' => false, 'error' => 'ID de organización requerido']);
            }
            
            // Estadísticas generales
            $stmt = $db->prepare("
                SELECT 
                    COUNT(*) as total_postulaciones,
                    COUNT(CASE WHEN estado = 'Aprobada' THEN 1 END) as total_aprobadas,
                    COUNT(CASE WHEN estado = 'Rechazada' THEN 1 END) as total_rechazadas,
                    COUNT(CASE WHEN estado = 'Postulada' THEN 1 END) as total_pendientes,
                    COUNT(CASE WHEN estado = 'En Evaluación' THEN 1 END) as total_evaluacion,
                    COALESCE(SUM(monto_aprobado), 0) as monto_total_aprobado,
                    MIN(ano_postulacion) as primer_ano,
                    MAX(ano_postulacion) as ultimo_ano
                FROM subvenciones 
                WHERE organizacion_id = ?
            ");
            $stmt->execute([$org_id]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Historial por año
            $stmt = $db->prepare("
                SELECT 
                    ano_postulacion,
                    COUNT(*) as cantidad,
                    COUNT(CASE WHEN estado = 'Aprobada' THEN 1 END) as aprobadas,
                    COALESCE(SUM(monto_aprobado), 0) as monto_total
                FROM subvenciones 
                WHERE organizacion_id = ?
                GROUP BY ano_postulacion 
                ORDER BY ano_postulacion DESC
            ");
            $stmt->execute([$org_id]);
            $historial = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            json_out([
                'ok' => true, 
                'data' => [
                    'estadisticas' => $stats,
                    'historial_anual' => $historial
                ]
            ]);
        }
        
        if ($action === 'get') {
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                json_out(['ok' => false, 'error' => 'ID de subvención requerido']);
            }
            
            $stmt = $db->prepare("
                SELECT s.*, o.nombre as nombre_organizacion, u.nombre_completo as creado_por_nombre 
                FROM subvenciones s 
                LEFT JOIN organizaciones o ON s.organizacion_id = o.id 
                LEFT JOIN usuarios u ON s.creado_por = u.id 
                WHERE s.id = ?
            ");
            $stmt->execute([$id]);
            $subvencion = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$subvencion) {
                json_out(['ok' => false, 'error' => 'Subvención no encontrada'], 404);
            }
            
            json_out(['ok' => true, 'data' => $subvencion]);
        }
    }
    
    // ── POST (crear) ─────────────────────────────────────────────
    if ($method === 'POST') {
        $action = $_GET['action'] ?? 'create';
        
        if ($action === 'create') {
            $org_id = (int)($_POST['organizacion_id'] ?? 0);
            $nombre = trim($_POST['nombre_subvencion'] ?? '');
            $ano = (int)($_POST['ano_postulacion'] ?? 0);
            $estado = $_POST['estado'] ?? 'Postulada';
            $monto = !empty($_POST['monto_aprobado']) ? floatval($_POST['monto_aprobado']) : null;
            $fecha = !empty($_POST['fecha_resolucion']) ? $_POST['fecha_resolucion'] : null;
            $obs = trim($_POST['observaciones'] ?? '');
            
            // Validaciones
            if ($org_id <= 0) {
                json_out(['ok' => false, 'error' => 'ID de organización requerido']);
            }
            if (empty($nombre)) {
                json_out(['ok' => false, 'error' => 'Nombre de subvención requerido']);
            }
            if ($ano < 2000 || $ano > date('Y') + 2) {
                json_out(['ok' => false, 'error' => 'Año de postulación inválido']);
            }
            
            // Verificar que la organización existe
            $stmt = $db->prepare("SELECT id FROM organizaciones WHERE id = ?");
            $stmt->execute([$org_id]);
            if (!$stmt->fetch()) {
                json_out(['ok' => false, 'error' => 'Organización no encontrada']);
            }
            
            // Insertar subvención
            $stmt = $db->prepare("
                INSERT INTO subvenciones 
                (organizacion_id, nombre_subvencion, ano_postulacion, estado, monto_aprobado, fecha_resolucion, observaciones, creado_por) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$org_id, $nombre, $ano, $estado, $monto, $fecha, $obs, $user['id']]);
            
            $id = $db->lastInsertId();
            
            json_out([
                'ok' => true, 
                'message' => 'Subvención registrada exitosamente',
                'data' => ['id' => $id]
            ]);
        }
    }
    
    // ── PUT (actualizar) ───────────────────────────────────────────
    if ($method === 'PUT') {
        parse_str(file_get_contents('php://input'), $data);
        
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_out(['ok' => false, 'error' => 'ID de subvención requerido']);
        }
        
        // Verificar que existe
        $stmt = $db->prepare("SELECT id FROM subvenciones WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            json_out(['ok' => false, 'error' => 'Subvención no encontrada'], 404);
        }
        
        $nombre = trim($data['nombre_subvencion'] ?? '');
        $ano = (int)($data['ano_postulacion'] ?? 0);
        $estado = $data['estado'] ?? 'Postulada';
        $monto = !empty($data['monto_aprobado']) ? floatval($data['monto_aprobado']) : null;
        $fecha = !empty($data['fecha_resolucion']) ? $data['fecha_resolucion'] : null;
        $obs = trim($data['observaciones'] ?? '');
        
        // Validaciones
        if (empty($nombre)) {
            json_out(['ok' => false, 'error' => 'Nombre de subvención requerido']);
        }
        if ($ano < 2000 || $ano > date('Y') + 2) {
            json_out(['ok' => false, 'error' => 'Año de postulación inválido']);
        }
        
        // Actualizar
        $stmt = $db->prepare("
            UPDATE subvenciones 
            SET nombre_subvencion = ?, ano_postulacion = ?, estado = ?, monto_aprobado = ?, 
                fecha_resolucion = ?, observaciones = ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$nombre, $ano, $estado, $monto, $fecha, $obs, $id]);
        
        json_out(['ok' => true, 'message' => 'Subvención actualizada exitosamente']);
    }
    
    // ── DELETE ─────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_out(['ok' => false, 'error' => 'ID de subvención requerido']);
        }
        
        // Verificar que existe
        $stmt = $db->prepare("SELECT id FROM subvenciones WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            json_out(['ok' => false, 'error' => 'Subvención no encontrada'], 404);
        }
        
        // Eliminar
        $stmt = $db->prepare("DELETE FROM subvenciones WHERE id = ?");
        $stmt->execute([$id]);
        
        json_out(['ok' => true, 'message' => 'Subvención eliminada exitosamente']);
    }
    
} catch (Exception $e) {
    json_out(['ok' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}
?>
