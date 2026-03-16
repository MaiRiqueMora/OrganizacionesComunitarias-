<?php
/* ============================================================
   api/vencimientos.php — API para verificación de vencimientos
   GET    ?formato=json|pdf     → Lista de vencimientos próximos
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user = requireSession();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

$formato = $_GET['formato'] ?? 'json';

try {
    $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $vencimientos = [
        'personalidad_juridica' => obtenerVencimientosPersonalidadJuridica($db),
        'directivas' => obtenerVencimientosDirectivas($db),
        'organizaciones' => obtenerOrganizacionesConProblemas($db),
        'subvenciones' => obtenerVencimientosSubvenciones($db)
    ];
    
    if ($formato === 'pdf') {
        generarPDFVencimientos($vencimientos);
    } else {
        echo json_encode(['ok' => true, 'vencimientos' => $vencimientos]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error al verificar vencimientos: ' . $e->getMessage()]);
}

// ── FUNCIONES DE VERIFICACIÓN ─────────────────────────────────────

function obtenerVencimientosPersonalidadJuridica($db) {
    // Buscar organizaciones con personalidad jurídica por vencer (próximos 30 días)
    $query = "
        SELECT 
            o.id,
            o.nombre,
            o.rut,
            o.numero_decreto,
            CASE 
                WHEN o.numero_decreto IS NOT NULL AND o.numero_decreto != '' THEN
                    date(o.numero_decreto, '+10 years')
                ELSE NULL
            END as fecha_vencimiento,
            CASE 
                WHEN o.numero_decreto IS NOT NULL AND o.numero_decreto != '' THEN
                    julianday(date(o.numero_decreto, '+10 years')) - julianday(date('now'))
                ELSE NULL
            END as dias_restantes
        FROM organizaciones o
        WHERE o.estado = 'Activa'
          AND o.numero_decreto IS NOT NULL 
          AND o.numero_decreto != ''
          AND julianday(date(o.numero_decreto, '+10 years')) - julianday(date('now')) <= 30
          AND julianday(date(o.numero_decreto, '+10 years')) - julianday(date('now')) >= 0
        ORDER BY dias_restantes ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function obtenerVencimientosDirectivas($db) {
    // Buscar directivas por vencer (próximos 30 días)
    $query = "
        SELECT 
            d.id,
            d.cargo,
            d.nombre,
            d.rut,
            d.fin_periodo,
            o.nombre as organizacion,
            o.rut as organizacion_rut,
            julianday(date(d.fin_periodo)) - julianday(date('now')) as dias_restantes
        FROM directivas d
        INNER JOIN organizaciones o ON d.organizacion_id = o.id
        WHERE d.activo = 1
          AND d.fin_periodo IS NOT NULL
          AND julianday(date(d.fin_periodo)) - julianday(date('now')) <= 30
          AND julianday(date(d.fin_periodo)) - julianday(date('now')) >= 0
        ORDER BY dias_restantes ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function obtenerOrganizacionesConProblemas($db) {
    // Buscar organizaciones con problemas (inactivas, suspendidas, sin directiva)
    $query = "
        SELECT 
            o.id,
            o.nombre,
            o.rut,
            o.estado,
            CASE 
                WHEN o.estado = 'Inactiva' THEN 'Organización inactiva'
                WHEN o.estado = 'Suspendida' THEN 'Organización suspendida'
                WHEN NOT EXISTS (
                    SELECT 1 FROM directivas d 
                    WHERE d.organizacion_id = o.id AND d.activo = 1
                ) THEN 'Sin directiva activa'
                ELSE 'Requiere atención'
            END as observacion
        FROM organizaciones o
        WHERE o.estado != 'Activa'
           OR NOT EXISTS (
               SELECT 1 FROM directivas d 
               WHERE d.organizacion_id = o.id AND d.activo = 1
           )
        ORDER BY o.estado, o.nombre
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function obtenerVencimientosSubvenciones($db) {
    // Buscar subvenciones por vencer (próximos 60 días)
    $query = "
        SELECT 
            s.id,
            s.nombre_subvencion,
            s.fecha_resolucion,
            s.estado,
            o.nombre as organizacion,
            o.rut as organizacion_rut,
            CASE 
                WHEN s.fecha_resolucion IS NOT NULL THEN
                    date(s.fecha_resolucion, '+2 years')
                ELSE NULL
            END as fecha_vencimiento,
            CASE 
                WHEN s.fecha_resolucion IS NOT NULL THEN
                    julianday(date(s.fecha_resolucion, '+2 years')) - julianday(date('now'))
                ELSE NULL
            END as dias_restantes
        FROM subvenciones s
        INNER JOIN organizaciones o ON s.organizacion_id = o.id
        WHERE s.estado = 'Aprobada'
          AND s.fecha_resolucion IS NOT NULL
          AND julianday(date(s.fecha_resolucion, '+2 years')) - julianday(date('now')) <= 60
          AND julianday(date(s.fecha_resolucion, '+2 years')) - julianday(date('now')) >= 0
        ORDER BY dias_restantes ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// ── GENERACIÓN DE PDF ─────────────────────────────────────

function generarPDFVencimientos($vencimientos) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="vencimientos_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte de Vencimientos</title>';
    $html .= '<style>body{font-family:Arial;margin:20px}h1{color:#333}h2{color:#666;margin-top:30px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}.warning{background-color:#fff3cd}.error{background-color:#f8d7da}.info{background-color:#d1ecf1}</style></head><body>';
    
    $html .= '<h1>Reporte de Vencimientos - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y H:i') . '</p>';
    
    // Personalidad Jurídica
    if (!empty($vencimientos['personalidad_juridica'])) {
        $html .= '<h2>⚠️ Personalidad Jurídica por Vencer</h2>';
        $html .= '<table class="warning"><tr><th>Organización</th><th>RUT</th><th>N° Decreto</th><th>Fecha Vencimiento</th><th>Días Restantes</th></tr>';
        foreach ($vencimientos['personalidad_juridica'] as $item) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($item['nombre']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['rut']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['numero_decreto']) . '</td>';
            $html .= '<td>' . date('d/m/Y', strtotime($item['fecha_vencimiento'])) . '</td>';
            $html .= '<td>' . $item['dias_restantes'] . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';
    }
    
    // Directivas
    if (!empty($vencimientos['directivas'])) {
        $html .= '<h2>⚠️ Directivas por Vencer</h2>';
        $html .= '<table class="warning"><tr><th>Organización</th><th>Cargo</th><th>Persona</th><th>RUT</th><th>Fin Período</th><th>Días Restantes</th></tr>';
        foreach ($vencimientos['directivas'] as $item) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($item['organizacion']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['cargo']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['nombre']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['rut']) . '</td>';
            $html .= '<td>' . date('d/m/Y', strtotime($item['fin_periodo'])) . '</td>';
            $html .= '<td>' . $item['dias_restantes'] . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';
    }
    
    // Organizaciones con Problemas
    if (!empty($vencimientos['organizaciones'])) {
        $html .= '<h2>❌ Organizaciones con Problemas</h2>';
        $html .= '<table class="error"><tr><th>Organización</th><th>RUT</th><th>Estado</th><th>Observación</th></tr>';
        foreach ($vencimientos['organizaciones'] as $item) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($item['nombre']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['rut']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['estado']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['observacion']) . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';
    }
    
    // Subvenciones
    if (!empty($vencimientos['subvenciones'])) {
        $html .= '<h2>ℹ️ Subvenciones por Vencer</h2>';
        $html .= '<table class="info"><tr><th>Organización</th><th>Subvención</th><th>Fecha Resolución</th><th>Fecha Vencimiento</th><th>Días Restantes</th></tr>';
        foreach ($vencimientos['subvenciones'] as $item) {
            $html .= '<tr>';
            $html .= '<td>' . htmlspecialchars($item['organizacion']) . '</td>';
            $html .= '<td>' . htmlspecialchars($item['nombre_subvencion']) . '</td>';
            $html .= '<td>' . date('d/m/Y', strtotime($item['fecha_resolucion'])) . '</td>';
            $html .= '<td>' . date('d/m/Y', strtotime($item['fecha_vencimiento'])) . '</td>';
            $html .= '<td>' . $item['dias_restantes'] . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';
    }
    
    if (empty($vencimientos['personalidad_juridica']) && empty($vencimientos['directivas']) && 
        empty($vencimientos['organizaciones']) && empty($vencimientos['subvenciones'])) {
        $html .= '<h2>✅ Sin Vencimientos Próximos</h2>';
        $html .= '<p>No se encontraron vencimientos próximos en el sistema.</p>';
    }
    
    $html .= '</body></html>';
    echo $html;
}
?>
