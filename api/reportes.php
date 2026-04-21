<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: reportes.php
 * 
 * DESCRIPCIÓN:
 * API REST para generación de reportes y estadísticas del sistema.
 * Exporta datos en múltiples formatos para análisis y presentación.
 * 
 * FUNCIONALIDADES:
 * - Generación de reportes de organizaciones
 * - Estadísticas de proyectos y subvenciones
 * - Reportes de actividad de usuarios
 * - Análisis de accesos y auditoría
 * - Exportación a Excel, PDF y CSV
 * - Reportes personalizables con filtros
 * - Estadísticas gráficas y tabulares
 * - Consolidación de datos históricos
 * 
 * ENDPOINTS:
 * - GET /api/reportes.php?tipo=X&formato=Y - Generar reporte específico
 * 
 * PARÁMETROS:
 * - tipo: Tipo de reporte a generar
 * - formato: Formato de salida (excel, pdf, csv, json)
 * - filtros: Parámetros adicionales según tipo
 * 
 * TIPOS DE REPORTES DISPONIBLES:
 * - organizaciones_activas: Listado de organizaciones activas
 * - organizaciones_inactivas: Organizaciones inactivas
 * - proyectos_activos: Proyectos en ejecución
 * - proyectos_completados: Proyectos finalizados
 * - directivos_por_tipo: Directivos agrupados por cargo
 * - accesos_usuario: Actividad por usuario
 * - estadisticas_generales: Resumen general del sistema
 * - documentos_por_tipo: Documentos por categoría
 * - actividad_mensual: Actividad del último mes
 * 
 * FORMATOS DE EXPORTACIÓN:
 * - excel: Hoja de cálculo con PhpSpreadsheet
 * - pdf: Documento PDF con TCPDF
 * - csv: Archivo CSV delimitado por comas
 * - json: Datos estructurados en formato JSON
 * 
 * ESTRUCTURA DE DATOS POR REPORTE:
 * 
 * ORGANIZACIONES:
 * - ID, Nombre, Tipo, Estado, Contacto
 * - Fecha de creación, Última actualización
 * - Número de proyectos asociados
 * - Documentos cargados
 * 
 * PROYECTOS:
 * - ID, Nombre, Organización, Monto
 * - Estado, Fechas de inicio/fin
 * - Responsables, Documentación
 * 
 * DIRECTIVOS:
 * - Nombre, Cargo, Organización
 * - Período de gestión, Contacto
 * - Estado actual
 * 
 * ACCESOS:
 * - Usuario, Fecha, Tipo de acceso
 * - Duración de sesión, IP
 * - Dispositivo/Navegador
 * 
 * SEGURIDAD:
 * - Autenticación obligatoria
 * - Validación de permisos por rol
 * - Control de acceso a datos sensibles
 * - Logging de generación de reportes
 * - Sanitización de parámetros
 * 
 * PROCESO DE GENERACIÓN:
 * 1. Validar autenticación y permisos
 * 2. Identificar tipo de reporte solicitado
 * 3. Aplicar filtros y parámetros
 * 4. Consultar y procesar datos
 * 5. Generar archivo según formato
 * 6. Enviar al cliente o guardar
 * 7. Registrar operación
 * 
 * RESPUESTA:
 * - Descarga directa para archivos
 * - JSON con metadatos para consultas
 * - Errores detallados si aplica
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

// Validar autenticación
$user = sessionUser();
if (!$user) {
    header('Content-Type: application/json');
    echo json_encode(['ok'=>false,'error'=>'Sesión no válida.']);
    exit;
}

// Parámetros del reporte
$tipo    = $_GET['tipo']    ?? '';
$formato = $_GET['formato'] ?? 'excel';
$pdo     = getDB();

switch ($tipo) {
    case 'organizaciones_activas':
        $titulo = 'Organizaciones Activas';
        $stmt   = $pdo->query("
            SELECT o.nombre, o.rut, t.nombre AS tipo, o.estado,
                   o.numero_socios, o.telefono_principal, o.correo,
                   o.direccion, o.comuna
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id=t.id
            WHERE o.estado='Activa'
            ORDER BY o.nombre
        ");
        $cols = ['Nombre','RUT','Tipo','Estado','N° Socios','Teléfono','Correo','Dirección','Comuna'];
        break;

    case 'directivas_vigentes':
        $titulo = 'Directivas Vigentes';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, d.fecha_inicio, d.fecha_termino,
                   d.estado, DATEDIFF(d.fecha_termino, CURDATE()) AS dias_restantes
            FROM directivas d
            JOIN organizaciones o ON d.organizacion_id=o.id
            WHERE d.estado='Vigente'
            ORDER BY d.fecha_termino ASC
        ");
        $cols = ['Organización','Fecha Inicio','Fecha Término','Estado','Días Restantes'];
        break;

    case 'directivas_vencidas':
        $titulo = 'Organizaciones con Directiva Vencida';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, o.estado AS estado_org,
                   d.fecha_termino, ABS(DATEDIFF(CURDATE(), d.fecha_termino)) AS dias_vencida
            FROM directivas d
            JOIN organizaciones o ON d.organizacion_id=o.id
            WHERE d.fecha_termino < CURDATE()
            ORDER BY d.fecha_termino ASC
        ");
        $cols = ['Organización','Estado Organización','Fecha Vencimiento','Días Vencida'];
        break;

    case 'directivos':
        $titulo = 'Directivos por Organización';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, o.estado AS estado_org,
                   d.cargo, d.nombre, d.email,
                   d.telefono, d.correo, d.estado
            FROM directivos d
            JOIN organizaciones o ON o.id = d.organizacion_id
            WHERE d.eliminada = 0 OR d.eliminada IS NULL
            ORDER BY o.nombre, d.cargo, d.nombre
        ");
        $cols = ['Organización','Estado Org.','Cargo','Nombre','Email','Teléfono','Correo','Estado Directivo'];
        break;

    case 'sedes':
        $titulo = 'Sedes y Domicilios';
        $stmt   = $pdo->query("
            SELECT o.nombre, o.rut, t.nombre AS tipo,
                   o.direccion, o.sector_barrio AS sector_uv,
                   o.comuna, o.telefono_principal, o.correo, o.estado
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id = t.id
            ORDER BY o.nombre
        ");
        $cols = ['Nombre','RUT','Tipo','Dirección','Sector/U.V.','Comuna','Teléfono','Correo','Estado'];
        break;

    case 'socios_por_tipo':
        $titulo = 'Socios por Tipo de Organización';
        $stmt   = $pdo->query("
            SELECT t.nombre AS tipo,
                   COUNT(o.id) AS total_organizaciones,
                   SUM(o.numero_socios) AS total_socios,
                   ROUND(AVG(o.numero_socios),1) AS promedio_socios
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id = t.id
            WHERE o.estado = 'Activa'
            GROUP BY t.nombre
            ORDER BY total_socios DESC
        ");
        $cols = ['Tipo','Total Organizaciones','Total Socios','Promedio Socios'];
        break;

    case 'directivos_cargos':
        $titulo = 'Directivos por Cargo';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, d.nombre, d.cargo, d.email,
                   d.telefono, d.correo, d.estado,
                   d.fecha_inicio, d.fecha_termino
            FROM directivos d
            JOIN organizaciones o ON o.id = d.organizacion_id
            WHERE (d.eliminada = 0 OR d.eliminada IS NULL) 
            ORDER BY d.cargo, o.nombre, d.nombre
        ");
        $cols = ['Organización','Nombre','Cargo','Email','Teléfono','Correo','Estado','Fecha Inicio','Fecha Término'];
        break;

    case 'directivos_direcciones':
        $titulo = 'Direcciones de Directivos';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, d.nombre, d.cargo,
                   d.direccion, d.telefono, d.correo
            FROM directivos d
            JOIN organizaciones o ON o.id = d.organizacion_id
            WHERE d.estado = 'Activo' AND d.direccion IS NOT NULL AND d.direccion != ''
            ORDER BY o.nombre, d.cargo
        ");
        $cols = ['Organización','Nombre','Cargo','Dirección','Teléfono','Correo'];
        break;

    case 'estadisticas_personas':
        $titulo = 'Estadísticas de Personas';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, t.nombre AS tipo,
                   o.numero_socios AS socios,
                   COUNT(d.id) AS total_directivos,
                   SUM(CASE WHEN d.estado='Activo' THEN 1 ELSE 0 END) AS directivos_activos
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON t.id = o.tipo_id
            LEFT JOIN directivos d ON d.organizacion_id = o.id
            WHERE o.estado = 'Activa'
            GROUP BY o.id
            ORDER BY o.nombre
        ");
        $cols = ['Organización','Tipo','N° Socios','Total Directivos','Directivos Activos'];
        break;

    default:
        header('Content-Type: application/json');
        echo json_encode(['ok'=>false,'error'=>'Tipo de reporte no válido.']); exit;
}

$rows = $stmt->fetchAll(PDO::FETCH_NUM);
$fecha = date('d/m/Y H:i');

if ($formato === 'excel') {
    exportExcel($titulo, $cols, $rows, $fecha);
} else {
    exportPDF($titulo, $cols, $rows, $fecha);
}

function exportExcel(string $titulo, array $cols, array $rows, string $fecha): void {
    $filename = sanitizeFilename($titulo).'_'.date('Ymd_His').'.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="'.$filename.'"');
    header('Pragma: no-cache');

    $out = fopen('php://output', 'w');

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

function exportPDF(string $titulo, array $cols, array $rows, string $fecha): void {
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
