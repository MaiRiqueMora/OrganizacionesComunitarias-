<?php
/* ============================================================
   api/accesos.php — API para gestión de accesos y auditoría
   GET ?action=list&usuario_id=N&limit=N&offset=N → listado
   GET ?action=stats&dias=N              → estadísticas
   ============================================================ */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/validator.php';

$user = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    
    if ($action === 'stats') {
        $dias = (int)($_GET['dias'] ?? 30);
        json_out(['ok' => true, 'data' => getAccesosStats($dias)]);
    }
    
    // Solo administradores pueden ver todos los accesos
    if ($user['rol'] !== 'administrador') {
        $usuarioId = $user['id'];
    } else {
        $usuarioId = (int)($_GET['usuario_id'] ?? 0);
    }
    
    $limit  = (int)($_GET['limit'] ?? 50);
    $offset  = (int)($_GET['offset'] ?? 0);
    $search  = trim($_GET['search'] ?? '');
    
    json_out(['ok' => true, 'data' => getAccesosList($usuarioId, $limit, $offset, $search)]);
    }
}

// ── Funciones de consulta ───────────────────────────────────────
function getAccesosList($usuarioId = 0, $limit = 50, $offset = 0, $search = '') {
    $pdo = getDB();
    
    $sql = "
        SELECT 
            a.id,
            a.usuario_id,
            a.username,
            a.ip_address,
            a.navegador,
            a.sistema_operativo,
            a.dispositivo,
            a.fecha_acceso,
            a.fecha_logout,
            a.duracion_sesion,
            CASE 
                WHEN a.duracion_sesion IS NULL THEN 'Activa'
                WHEN a.duracion_sesion < 60 THEN CONCAT(a.duracion_sesion, ' seg')
                WHEN a.duracion_sesion < 3600 THEN CONCAT(FLOOR(a.duracion_sesion/60), ' min')
                ELSE CONCAT(FLOOR(a.duracion_sesion/3600), ' h ', FLOOR((a.duracion_sesion%3600)/60), ' min')
            END as duracion_formateada,
            u.nombre_completo,
            u.rol
        FROM accesos a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE 1=1
    ";
    
    $params = [];
    
    if ($usuarioId > 0) {
        $sql .= " AND a.usuario_id = ?";
        $params[] = $usuarioId;
    }
    
    if (!empty($search)) {
        $sql .= " AND (a.username LIKE ? OR u.nombre_completo LIKE ? OR a.ip_address LIKE ?)";
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $sql .= " ORDER BY a.fecha_acceso DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll();
}

function getAccesosStats($dias = 30) {
    $pdo = getDB();
    
    $stmt = $pdo->prepare("
        SELECT 
            DATE(fecha_acceso) as fecha,
            COUNT(*) as total_accesos,
            COUNT(DISTINCT usuario_id) as usuarios_unicos,
            COUNT(DISTINCT ip_address) as ips_unicas,
            SUM(CASE WHEN dispositivo = 'Móvil' THEN 1 ELSE 0 END) as accesos_movil,
            SUM(CASE WHEN dispositivo = 'Desktop' THEN 1 ELSE 0 END) as accesos_desktop,
            SUM(CASE WHEN dispositivo = 'Tablet' THEN 1 ELSE 0 END) as accesos_tablet,
            AVG(duracion_sesion) as duracion_promedio
        FROM accesos
        WHERE fecha_acceso >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        GROUP BY DATE(fecha_acceso)
        ORDER BY fecha DESC
    ");
    
    $stmt->execute([$dias]);
    return $stmt->fetchAll();
}
