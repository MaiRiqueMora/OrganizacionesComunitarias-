<?php
/* ============================================================
   api/reportes.php — API para generación de reportes municipales
   GET    ?tipo=sedes&formato=excel|pdf     → Listado de sedes
   GET    ?tipo=personas_directiva&formato=excel|pdf → Estadísticas de directiva
   GET    ?tipo=personas_totales&formato=excel|pdf → Personas en directivas
   GET    ?tipo=organizaciones_activas&formato=excel|pdf → Organizaciones activas
   GET    ?tipo=organizaciones_sector&formato=excel|pdf → Organizaciones por sector
   GET    ?tipo=organizaciones_fondos&formato=excel|pdf → Organizaciones con fondos
   GET    ?tipo=directivas_vigentes&formato=excel|pdf → Directivas vigentes
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

$tipo = $_GET['tipo'] ?? '';
$formato = $_GET['formato'] ?? '';

if (!in_array($tipo, ['sedes', 'personas_directiva', 'personas_totales', 'organizaciones_activas', 'organizaciones_sector', 'organizaciones_fondos', 'directivas_vigentes'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Tipo de reporte no válido']);
    exit;
}

if (!in_array($formato, ['excel', 'pdf'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Formato no válido']);
    exit;
}

try {
    $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    switch ($tipo) {
        case 'sedes':
            generarReporteSedes($db, $formato);
            break;
        case 'personas_directiva':
            generarReportePersonasDirectiva($db, $formato);
            break;
        case 'personas_totales':
            generarReportePersonasTotales($db, $formato);
            break;
        case 'organizaciones_activas':
            generarReporteOrganizacionesActivas($db, $formato);
            break;
        case 'organizaciones_sector':
            generarReporteOrganizacionesSector($db, $formato);
            break;
        case 'organizaciones_fondos':
            generarReporteOrganizacionesFondos($db, $formato);
            break;
        case 'directivas_vigentes':
            generarReporteDirectivasVigentes($db, $formato);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error al generar reporte: ' . $e->getMessage()]);
}

// ── FUNCIONES DE GENERACIÓN DE REPORTES ─────────────────────────────

function generarReporteSedes($db, $formato) {
    $query = "
        SELECT 
            o.nombre as organizacion,
            o.rut,
            o.direccion as direccion_principal,
            o.direccion_sede,
            o.sector_barrio,
            o.comuna,
            o.region,
            o.codigo_postal,
            o.telefono_principal,
            o.correo
        FROM organizaciones o
        WHERE o.estado = 'Activa'
        ORDER BY o.nombre
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $sedes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelSedes($sedes);
    } else {
        generarPDFSedes($sedes);
    }
}

function generarReportePersonasDirectiva($db, $formato) {
    // Estadísticas por cargo
    $query = "
        SELECT 
            d.cargo,
            COUNT(*) as cantidad,
            COUNT(CASE WHEN d.activo = 1 THEN 1 END) as activos,
            COUNT(CASE WHEN d.inicio_periodo <= date('now') AND (d.fin_periodo IS NULL OR d.fin_periodo >= date('now')) THEN 1 END) as vigentes
        FROM directivas d
        INNER JOIN organizaciones o ON d.organizacion_id = o.id
        WHERE o.estado = 'Activa'
        GROUP BY d.cargo
        ORDER BY 
            CASE d.cargo
                WHEN 'Presidente' THEN 1
                WHEN 'Vicepresidente' THEN 2
                WHEN 'Secretario' THEN 3
                WHEN 'Tesorero' THEN 4
                WHEN '1° Director' THEN 5
                WHEN '2° Director' THEN 6
                WHEN '3° Director' THEN 7
                WHEN 'Suplente' THEN 8
                ELSE 9
            END
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $estadisticas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelPersonasDirectiva($estadisticas);
    } else {
        generarPDFPersonasDirectiva($estadisticas);
    }
}

function generarReportePersonasTotales($db, $formato) {
    $query = "
        SELECT 
            o.nombre as organizacion,
            o.rut,
            d.cargo,
            d.nombre as persona_nombre,
            d.rut as persona_rut,
            d.email,
            d.telefono,
            d.direccion as persona_direccion,
            d.inicio_periodo,
            d.fin_periodo,
            CASE 
                WHEN d.inicio_periodo <= date('now') AND (d.fin_periodo IS NULL OR d.fin_periodo >= date('now')) 
                THEN 'Vigente' 
                ELSE 'No Vigente' 
            END as estado_periodo
        FROM directivas d
        INNER JOIN organizaciones o ON d.organizacion_id = o.id
        WHERE o.estado = 'Activa' AND d.activo = 1
        ORDER BY o.nombre, 
            CASE d.cargo
                WHEN 'Presidente' THEN 1
                WHEN 'Vicepresidente' THEN 2
                WHEN 'Secretario' THEN 3
                WHEN 'Tesorero' THEN 4
                WHEN '1° Director' THEN 5
                WHEN '2° Director' THEN 6
                WHEN '3° Director' THEN 7
                WHEN 'Suplente' THEN 8
                ELSE 9
            END
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $personas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelPersonasTotales($personas);
    } else {
        generarPDFPersonasTotales($personas);
    }
}

function generarReporteOrganizacionesActivas($db, $formato) {
    $query = "
        SELECT 
            o.nombre,
            o.rut,
            ot.nombre as tipo,
            o.numero_registro_mun,
            o.fecha_constitucion,
            o.personalidad_juridica,
            o.numero_decreto,
            o.direccion,
            o.sector_barrio,
            o.numero_socios,
            o.area_accion,
            o.representante_legal,
            o.telefono_principal,
            o.correo,
            o.habilitada_fondos
        FROM organizaciones o
        LEFT JOIN organizacion_tipos ot ON o.tipo_id = ot.id
        WHERE o.estado = 'Activa'
        ORDER BY o.nombre
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $organizaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelOrganizacionesActivas($organizaciones);
    } else {
        generarPDFOrganizacionesActivas($organizaciones);
    }
}

function generarReporteOrganizacionesSector($db, $formato) {
    $query = "
        SELECT 
            o.sector_barrio,
            COUNT(*) as cantidad_organizaciones,
            COUNT(CASE WHEN o.habilitada_fondos = 1 THEN 1 END) as con_fondos,
            SUM(o.numero_socios) as total_socios
        FROM organizaciones o
        WHERE o.estado = 'Activa' AND o.sector_barrio IS NOT NULL AND o.sector_barrio != ''
        GROUP BY o.sector_barrio
        ORDER BY cantidad_organizaciones DESC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $sectores = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelOrganizacionesSector($sectores);
    } else {
        generarPDFOrganizacionesSector($sectores);
    }
}

function generarReporteOrganizacionesFondos($db, $formato) {
    $query = "
        SELECT 
            o.nombre,
            o.rut,
            o.direccion,
            o.sector_barrio,
            o.numero_socios,
            o.area_accion,
            o.representante_legal,
            o.telefono_principal,
            o.correo,
            o.nombre_banco,
            o.tipo_cuenta
        FROM organizaciones o
        WHERE o.estado = 'Activa' AND o.habilitada_fondos = 1
        ORDER BY o.nombre
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $organizaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelOrganizacionesFondos($organizaciones);
    } else {
        generarPDFOrganizacionesFondos($organizaciones);
    }
}

function generarReporteDirectivasVigentes($db, $formato) {
    $query = "
        SELECT 
            o.nombre as organizacion,
            o.rut,
            d.cargo,
            d.nombre as persona_nombre,
            d.rut as persona_rut,
            d.email,
            d.telefono,
            d.inicio_periodo,
            d.fin_periodo,
            CASE 
                WHEN d.inicio_periodo <= date('now') AND (d.fin_periodo IS NULL OR d.fin_periodo >= date('now')) 
                THEN 'Vigente' 
                ELSE 'No Vigente' 
            END as estado_periodo
        FROM directivas d
        INNER JOIN organizaciones o ON d.organizacion_id = o.id
        WHERE o.estado = 'Activa' AND d.activo = 1
        ORDER BY o.nombre, 
            CASE d.cargo
                WHEN 'Presidente' THEN 1
                WHEN 'Vicepresidente' THEN 2
                WHEN 'Secretario' THEN 3
                WHEN 'Tesorero' THEN 4
                WHEN '1° Director' THEN 5
                WHEN '2° Director' THEN 6
                WHEN '3° Director' THEN 7
                WHEN 'Suplente' THEN 8
                ELSE 9
            END
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $directivas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($formato === 'excel') {
        generarExcelDirectivasVigentes($directivas);
    } else {
        generarPDFDirectivasVigentes($directivas);
    }
}

// ── FUNCIONES DE EXPORTACIÓN EXCEL ─────────────────────────────────────

function generarExcelSedes($sedes) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="sedes_pucon_' . date('Y-m-d') . '.xlsx"');
    
    echo "Organización\tRUT\tDirección Principal\tDirección Sede\tSector\tComuna\tRegión\tCódigo Postal\tTeléfono\tEmail\n";
    
    foreach ($sedes as $sede) {
        echo "{$sede['organizacion']}\t{$sede['rut']}\t{$sede['direccion_principal']}\t{$sede['direccion_sede']}\t{$sede['sector_barrio']}\t{$sede['comuna']}\t{$sede['region']}\t{$sede['codigo_postal']}\t{$sede['telefono_principal']}\t{$sede['correo']}\n";
    }
}

function generarExcelPersonasDirectiva($estadisticas) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="estadisticas_directiva_' . date('Y-m-d') . '.xlsx"');
    
    echo "Cargo\tTotal Asignados\tActivos\tVigentes\n";
    
    foreach ($estadisticas as $est) {
        echo "{$est['cargo']}\t{$est['cantidad']}\t{$est['activos']}\t{$est['vigentes']}\n";
    }
}

function generarExcelPersonasTotales($personas) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="personas_directivas_' . date('Y-m-d') . '.xlsx"');
    
    echo "Organización\tRUT Org\tCargo\tPersona\tRUT Persona\tEmail\tTeléfono\tDirección\tInicio Período\tFin Período\tEstado\n";
    
    foreach ($personas as $persona) {
        echo "{$persona['organizacion']}\t{$persona['rut']}\t{$persona['cargo']}\t{$persona['persona_nombre']}\t{$persona['persona_rut']}\t{$persona['email']}\t{$persona['telefono']}\t{$persona['persona_direccion']}\t{$persona['inicio_periodo']}\t{$persona['fin_periodo']}\t{$persona['estado_periodo']}\n";
    }
}

function generarExcelOrganizacionesActivas($organizaciones) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="organizaciones_activas_' . date('Y-m-d') . '.xlsx"');
    
    echo "Nombre\tRUT\tTipo\tN° Registro\tFecha Constitución\tPersonalidad Jurídica\tN° Decreto\tDirección\tSector\tN° Socios\tÁrea\tRepresentante\tTeléfono\tEmail\tHabilitada Fondos\n";
    
    foreach ($organizaciones as $org) {
        $pj = $org['personalidad_juridica'] ? 'Activa' : 'Inactiva';
        $fondos = $org['habilitada_fondos'] ? 'Sí' : 'No';
        echo "{$org['nombre']}\t{$org['rut']}\t{$org['tipo']}\t{$org['numero_registro_mun']}\t{$org['fecha_constitucion']}\t{$pj}\t{$org['numero_decreto']}\t{$org['direccion']}\t{$org['sector_barrio']}\t{$org['numero_socios']}\t{$org['area_accion']}\t{$org['representante_legal']}\t{$org['telefono_principal']}\t{$org['correo']}\t{$fondos}\n";
    }
}

function generarExcelOrganizacionesSector($sectores) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="organizaciones_sector_' . date('Y-m-d') . '.xlsx"');
    
    echo "Sector/Barrio\tCantidad Organizaciones\tCon Fondos\tTotal Socios\n";
    
    foreach ($sectores as $sector) {
        echo "{$sector['sector_barrio']}\t{$sector['cantidad_organizaciones']}\t{$sector['con_fondos']}\t{$sector['total_socios']}\n";
    }
}

function generarExcelOrganizacionesFondos($organizaciones) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="organizaciones_fondos_' . date('Y-m-d') . '.xlsx"');
    
    echo "Nombre\tRUT\tDirección\tSector\tN° Socios\tÁrea\tRepresentante\tTeléfono\tEmail\tBanco\tTipo Cuenta\n";
    
    foreach ($organizaciones as $org) {
        echo "{$org['nombre']}\t{$org['rut']}\t{$org['direccion']}\t{$org['sector_barrio']}\t{$org['numero_socios']}\t{$org['area_accion']}\t{$org['representante_legal']}\t{$org['telefono_principal']}\t{$org['correo']}\t{$org['nombre_banco']}\t{$org['tipo_cuenta']}\n";
    }
}

function generarExcelDirectivasVigentes($directivas) {
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="directivas_vigentes_' . date('Y-m-d') . '.xlsx"');
    
    echo "Organización\tRUT Org\tCargo\tPersona\tRUT Persona\tEmail\tTeléfono\tInicio Período\tFin Período\tEstado\n";
    
    foreach ($directivas as $directiva) {
        echo "{$directiva['organizacion']}\t{$directiva['rut']}\t{$directiva['cargo']}\t{$directiva['persona_nombre']}\t{$directiva['persona_rut']}\t{$directiva['email']}\t{$directiva['telefono']}\t{$directiva['inicio_periodo']}\t{$directiva['fin_periodo']}\t{$directiva['estado_periodo']}\n";
    }
}

// ── FUNCIONES DE EXPORTACIÓN PDF ─────────────────────────────────────

function generarPDFSedes($sedes) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="sedes_pucon_' . date('Y-m-d') . '.pdf"');
    
    // HTML simple para PDF
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Listado de Sedes</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Listado de Sedes - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Organización</th><th>RUT</th><th>Dirección Principal</th><th>Dirección Sede</th><th>Sector</th><th>Teléfono</th><th>Email</th></tr>';
    
    foreach ($sedes as $sede) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($sede['organizacion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['rut']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['direccion_principal']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['direccion_sede']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['sector_barrio']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['telefono_principal']) . '</td>';
        $html .= '<td>' . htmlspecialchars($sede['correo']) . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFPersonasDirectiva($estadisticas) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="estadisticas_directiva_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estadísticas de Directiva</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Estadísticas de Directiva - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Cargo</th><th>Total Asignados</th><th>Activos</th><th>Vigentes</th></tr>';
    
    foreach ($estadisticas as $est) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($est['cargo']) . '</td>';
        $html .= '<td>' . $est['cantidad'] . '</td>';
        $html .= '<td>' . $est['activos'] . '</td>';
        $html .= '<td>' . $est['vigentes'] . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFPersonasTotales($personas) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="personas_directivas_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Personas en Directivas</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Personas en Directivas - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Organización</th><th>Cargo</th><th>Persona</th><th>RUT</th><th>Email</th><th>Teléfono</th><th>Estado Período</th></tr>';
    
    foreach ($personas as $persona) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($persona['organizacion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['cargo']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['persona_nombre']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['persona_rut']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['email']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['telefono']) . '</td>';
        $html .= '<td>' . htmlspecialchars($persona['estado_periodo']) . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFOrganizacionesActivas($organizaciones) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="organizaciones_activas_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Organizaciones Activas</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Organizaciones Activas - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Nombre</th><th>RUT</th><th>Tipo</th><th>Dirección</th><th>Sector</th><th>N° Socios</th><th>Representante</th><th>Teléfono</th></tr>';
    
    foreach ($organizaciones as $org) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($org['nombre']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['rut']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['tipo']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['direccion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['sector_barrio']) . '</td>';
        $html .= '<td>' . $org['numero_socios'] . '</td>';
        $html .= '<td>' . htmlspecialchars($org['representante_legal']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['telefono_principal']) . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFOrganizacionesSector($sectores) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="organizaciones_sector_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Organizaciones por Sector</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Organizaciones por Sector - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Sector/Barrio</th><th>Cantidad Organizaciones</th><th>Con Fondos</th><th>Total Socios</th></tr>';
    
    foreach ($sectores as $sector) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($sector['sector_barrio']) . '</td>';
        $html .= '<td>' . $sector['cantidad_organizaciones'] . '</td>';
        $html .= '<td>' . $sector['con_fondos'] . '</td>';
        $html .= '<td>' . $sector['total_socios'] . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFOrganizacionesFondos($organizaciones) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="organizaciones_fondos_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Organizaciones con Fondos</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Organizaciones con Fondos - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Nombre</th><th>RUT</th><th>Dirección</th><th>Sector</th><th>N° Socios</th><th>Área</th><th>Representante</th><th>Teléfono</th></tr>';
    
    foreach ($organizaciones as $org) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($org['nombre']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['rut']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['direccion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['sector_barrio']) . '</td>';
        $html .= '<td>' . $org['numero_socios'] . '</td>';
        $html .= '<td>' . htmlspecialchars($org['area_accion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['representante_legal']) . '</td>';
        $html .= '<td>' . htmlspecialchars($org['telefono_principal']) . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}

function generarPDFDirectivasVigentes($directivas) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="directivas_vigentes_' . date('Y-m-d') . '.pdf"');
    
    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Directivas Vigentes</title><style>body{font-family:Arial;margin:20px}h1{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body>';
    $html .= '<h1>Directivas Vigentes - Municipalidad de Pucón</h1>';
    $html .= '<p>Fecha: ' . date('d/m/Y') . '</p>';
    $html .= '<table><tr><th>Organización</th><th>Cargo</th><th>Persona</th><th>RUT</th><th>Email</th><th>Teléfono</th><th>Estado Período</th></tr>';
    
    foreach ($directivas as $directiva) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($directiva['organizacion']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['cargo']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['persona_nombre']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['persona_rut']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['email']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['telefono']) . '</td>';
        $html .= '<td>' . htmlspecialchars($directiva['estado_periodo']) . '</td>';
        $html .= '</tr>';
    }
    
    $html .= '</table></body></html>';
    echo $html;
}
?>
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); exit;
}

$fecha = date('d/m/Y H:i');

if ($formato === 'excel') {
    exportExcel($titulo, $cols, $rows, $fecha);
} else {
    exportPDF($titulo, $cols, $rows, $fecha);
}

// ── Export Excel (CSV con BOM para compatibilidad Excel) ──────
function exportExcel(string $titulo, array $cols, array $rows, string $fecha): void {
    $filename = sanitizeFilename($titulo).'_'.date('Ymd_His').'.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="'.$filename.'"');
    header('Pragma: no-cache');

    $out = fopen('php://output', 'w');
    // BOM UTF-8 para que Excel abra correctamente con tildes
    fputs($out, "\xEF\xBB\xBF");
    // Título y fecha
    fputcsv($out, [$titulo], ';');
    fputcsv($out, ['Generado: '.$fecha], ';');
    fputcsv($out, [], ';');
    // Cabeceras
    fputcsv($out, $cols, ';');
    // Datos
    foreach ($rows as $row) fputcsv($out, $row, ';');
    fclose($out);
}

// ── Export PDF (HTML imprimible enviado como descarga) ────────
function exportPDF(string $titulo, array $cols, array $rows, string $fecha): void {
    // Intentamos usar mPDF si está disponible, sino HTML imprimible
    $mpdfPath = __DIR__.'/../vendor/mpdf/src/Mpdf.php';
    if (file_exists($mpdfPath)) {
        exportWithMpdf($titulo, $cols, $rows, $fecha, $mpdfPath);
    } else {
        exportHtmlPrintable($titulo, $cols, $rows, $fecha);
    }
}

function exportWithMpdf(string $titulo, array $cols, array $rows, string $fecha, string $path): void {
    require_once $path;
    $mpdf = new \Mpdf\Mpdf(['mode'=>'utf-8','format'=>'A4-L']);
    $mpdf->WriteHTML(buildHtmlTable($titulo, $cols, $rows, $fecha));
    $filename = sanitizeFilename($titulo).'_'.date('Ymd_His').'.pdf';
    $mpdf->Output($filename, 'D');
}

function exportHtmlPrintable(string $titulo, array $cols, array $rows, string $fecha): void {
    // Sin mPDF: entrega HTML con auto-print para imprimir/guardar como PDF desde el navegador
    header('Content-Type: text/html; charset=utf-8');
    echo buildHtmlTable($titulo, $cols, $rows, $fecha, true);
}

function buildHtmlTable(string $titulo, array $cols, array $rows, string $fecha, bool $autoPrint=false): string {
    $ths = implode('', array_map(fn($c)=>"<th>".htmlspecialchars($c)."</th>", $cols));
    $trs = '';
    foreach ($rows as $i=>$row) {
        $tds = implode('', array_map(fn($v)=>"<td>".htmlspecialchars((string)($v??''))."</td>", $row));
        $bg  = $i%2===0 ? '#f9f9f9' : '#ffffff';
        $trs .= "<tr style='background:$bg'>$tds</tr>";
    }
    $printScript = $autoPrint ? "<script>window.onload=()=>window.print();</script>" : '';
    return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'/>
    <title>$titulo</title>$printScript
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#222;padding:20px}
      h2{color:#0d3b6e;margin-bottom:4px} .meta{color:#666;font-size:10px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#0d3b6e;color:#fff;padding:7px 10px;text-align:left;font-size:10px}
      td{padding:6px 10px;border-bottom:1px solid #e0e0e0}
      @media print{body{padding:0}}
    </style></head><body>
    <h2>$titulo</h2>
    <div class='meta'>Municipalidad de Pucón &nbsp;·&nbsp; Generado: $fecha &nbsp;·&nbsp; Total registros: ".count($rows)."</div>
    <table><thead><tr>$ths</tr></thead><tbody>$trs</tbody></table>
    </body></html>";
}

function sanitizeFilename(string $s): string {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '_', iconv('UTF-8','ASCII//TRANSLIT',$s));
}
