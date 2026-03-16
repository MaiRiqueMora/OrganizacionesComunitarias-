<?php

/**
 * API para generación de datos de presentaciones
 * Proporciona datos estadísticos para gráficos y dashboards
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Verificar autenticación
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

require_once '../config/db.php';

try {
    $db = getDB();
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'dashboard_stats':
            echo json_encode(getDashboardStats($db));
            break;
            
        case 'organizations_chart':
            echo json_encode(getOrganizationsChart($db));
            break;
            
        case 'users_activity':
            echo json_encode(getUsersActivity($db));
            break;
            
        case 'monthly_growth':
            echo json_encode(getMonthlyGrowth($db));
            break;
            
        case 'types_distribution':
            echo json_encode(getTypesDistribution($db));
            break;
            
        case 'municipal_performance':
            echo json_encode(getMunicipalPerformance($db));
            break;
            
        case 'presentation_data':
            echo json_encode(getPresentationData($db));
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Acción no válida']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor: ' . $e->getMessage()]);
}

/**
 * Estadísticas generales del dashboard
 */
function getDashboardStats($db) {
    $stats = [];
    
    // Total organizaciones
    $stmt = $db->query("SELECT COUNT(*) as total FROM organizaciones");
    $stats['total_organizations'] = $stmt->fetch()['total'];
    
    // Organizaciones activas
    $stmt = $db->query("SELECT COUNT(*) as total FROM organizaciones WHERE estado = 'activa'");
    $stats['active_organizations'] = $stmt->fetch()['total'];
    
    // Total usuarios
    $stmt = $db->query("SELECT COUNT(*) as total FROM usuarios");
    $stats['total_users'] = $stmt->fetch()['total'];
    
    // Usuarios activos (últimos 30 días)
    $stmt = $db->prepare("SELECT COUNT(DISTINCT user_id) as total FROM accesos WHERE fecha_hora >= DATE('now', '-30 days')");
    $stmt->execute();
    $stats['active_users'] = $stmt->fetch()['total'];
    
    // Documentos totales
    $stmt = $db->query("SELECT COUNT(*) as total FROM documentos");
    $stats['total_documents'] = $stmt->fetch()['total'];
    
    // Documentos del mes
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM documentos WHERE DATE(fecha_subida) = DATE('now', 'start of month')");
    $stmt->execute();
    $stats['monthly_documents'] = $stmt->fetch()['total'];
    
    // Organizaciones por tipo
    $stmt = $db->query("SELECT tipo, COUNT(*) as count FROM organizaciones GROUP BY tipo ORDER BY count DESC");
    $stats['organizations_by_type'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Crecimiento mensual
    $stmt = $db->prepare("SELECT DATE(fecha_registro) as date, COUNT(*) as count FROM organizaciones WHERE fecha_registro >= DATE('now', '-12 months') GROUP BY DATE(fecha_registro) ORDER BY date");
    $stmt->execute();
    $stats['monthly_growth'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return $stats;
}

/**
 * Datos para gráfico de organizaciones
 */
function getOrganizationsChart($db) {
    $period = $_GET['period'] ?? 'month'; // week, month, year
    
    $sql = "";
    switch ($period) {
        case 'week':
            $sql = "SELECT strftime('%Y-%m-%d', fecha_registro) as label, COUNT(*) as value FROM organizaciones WHERE fecha_registro >= DATE('now', '-7 days') GROUP BY strftime('%Y-%m-%d', fecha_registro) ORDER BY label";
            break;
        case 'month':
            $sql = "SELECT strftime('%Y-%m', fecha_registro) as label, COUNT(*) as value FROM organizaciones WHERE fecha_registro >= DATE('now', '-12 months') GROUP BY strftime('%Y-%m', fecha_registro) ORDER BY label";
            break;
        case 'year':
            $sql = "SELECT strftime('%Y', fecha_registro) as label, COUNT(*) as value FROM organizaciones GROUP BY strftime('%Y', fecha_registro) ORDER BY label";
            break;
    }
    
    $stmt = $db->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Actividad de usuarios
 */
function getUsersActivity($db) {
    $days = intval($_GET['days'] ?? 30);
    
    $stmt = $db->prepare("SELECT DATE(fecha_hora) as date, COUNT(*) as logins FROM accesos WHERE fecha_hora >= DATE('now', '-$days days') GROUP BY DATE(fecha_hora) ORDER BY date");
    $stmt->execute();
    $logins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Usuarios más activos
    $stmt = $db->prepare("SELECT u.username, u.nombre, COUNT(a.id) as activity_count FROM usuarios u LEFT JOIN accesos a ON u.id = a.user_id WHERE a.fecha_hora >= DATE('now', '-$days days') GROUP BY u.id ORDER BY activity_count DESC LIMIT 10");
    $stmt->execute();
    $top_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'daily_logins' => $logins,
        'top_users' => $top_users
    ];
}

/**
 * Crecimiento mensual
 */
function getMonthlyGrowth($db) {
    $months = intval($_GET['months'] ?? 12);
    
    $stmt = $db->prepare("SELECT strftime('%Y-%m', fecha_registro) as month, COUNT(*) as new_organizations FROM organizaciones WHERE fecha_registro >= DATE('now', '-$months months') GROUP BY strftime('%Y-%m', fecha_registro) ORDER BY month");
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular acumulado
    $cumulative = 0;
    foreach ($data as &$item) {
        $cumulative += $item['new_organizations'];
        $item['cumulative'] = $cumulative;
    }
    
    return $data;
}

/**
 * Distribución por tipos
 */
function getTypesDistribution($db) {
    $stmt = $db->query("SELECT tipo, COUNT(*) as count, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM organizaciones), 2) as percentage FROM organizaciones GROUP BY tipo ORDER BY count DESC");
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Indicadores de desempeño municipal
 */
function getMunicipalPerformance($db) {
    $indicators = [];
    
    // Tiempo promedio de respuesta (simulado)
    $indicators['avg_response_time'] = [
        'value' => 24.5,
        'unit' => 'horas',
        'target' => 48,
        'status' => 'good'
    ];
    
    // Porcentaje de digitalización
    $stmt = $db->query("SELECT COUNT(*) as total FROM organizaciones WHERE estado = 'activa'");
    $active = $stmt->fetch()['total'];
    $stmt = $db->query("SELECT COUNT(*) as total FROM organizaciones");
    $total = $stmt->fetch()['total'];
    $digitalization = $total > 0 ? round(($active / $total) * 100, 1) : 0;
    
    $indicators['digitalization_rate'] = [
        'value' => $digitalization,
        'unit' => '%',
        'target' => 80,
        'status' => $digitalization >= 80 ? 'good' : ($digitalization >= 60 ? 'warning' : 'critical')
    ];
    
    // Satisfacción de usuarios (simulado)
    $indicators['user_satisfaction'] = [
        'value' => 87.3,
        'unit' => '%',
        'target' => 85,
        'status' => 'good'
    ];
    
    // Eficiencia de procesos (simulado)
    $indicators['process_efficiency'] = [
        'value' => 92.1,
        'unit' => '%',
        'target' => 90,
        'status' => 'good'
    ];
    
    return $indicators;
}

/**
 * Datos completos para presentación
 */
function getPresentationData($db) {
    return [
        'dashboard_stats' => getDashboardStats($db),
        'organizations_chart' => getOrganizationsChart($db),
        'users_activity' => getUsersActivity($db),
        'monthly_growth' => getMonthlyGrowth($db),
        'types_distribution' => getTypesDistribution($db),
        'municipal_performance' => getMunicipalPerformance($db),
        'generated_at' => date('Y-m-d H:i:s'),
        'presentation_title' => 'Sistema de Gestión Municipal - Informe Ejecutivo',
        'municipality' => 'Municipalidad de Pucón',
        'period' => date('Y')
    ];
}
?>
