<?php

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

requireSession();

$tipo    = $_GET['tipo']    ?? '';
$formato = $_GET['formato'] ?? 'excel';
$pdo     = getDB();

// Obtener datos según tipo
switch ($tipo) {
    case 'organizaciones_activas':
        $titulo = 'Organizaciones Activas';
        $stmt   = $pdo->query("
            SELECT o.nombre, o.rut, t.nombre AS tipo, o.estado,
                   o.numero_socios, o.telefono_principal, o.correo,
                   o.direccion, o.comuna, o.fecha_constitucion
            FROM organizaciones o
            LEFT JOIN tipos_organizacion t ON o.tipo_id=t.id
            WHERE o.estado='Activa'
            ORDER BY o.nombre
        ");
        $cols = ['Nombre','RUT','Tipo','Estado','N° Socios','Teléfono','Correo','Dirección','Comuna','Fecha Constitución'];
        break;

    case 'directivas_vigentes':
        $titulo = 'Directivas Vigentes';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, d.fecha_inicio, d.fecha_termino,
                   d.estado, CAST(julianday(d.fecha_termino) - julianday(date('now','localtime')) AS INTEGER) AS dias_restantes
            FROM directivas d
            JOIN organizaciones o ON d.organizacion_id=o.id
            WHERE d.es_actual=1 AND d.estado='Vigente'
            ORDER BY d.fecha_termino ASC
        ");
        $cols = ['Organización','Fecha Inicio','Fecha Término','Estado','Días Restantes'];
        break;

    case 'directivas_vencidas':
        $titulo = 'Organizaciones con Directiva Vencida';
        $stmt   = $pdo->query("
            SELECT o.nombre AS organizacion, o.estado AS estado_org,
                   d.fecha_termino, CAST(ABS(julianday(date('now','localtime')) - julianday(d.fecha_termino)) AS INTEGER) AS dias_vencida
            FROM directivas d
            JOIN organizaciones o ON d.organizacion_id=o.id
            WHERE d.es_actual=1 AND (d.estado='Vencida' OR d.fecha_termino < date('now','localtime'))
            ORDER BY d.fecha_termino ASC
        ");
        $cols = ['Organización','Estado Organización','Fecha Vencimiento','Días Vencida'];
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

// Exportar Excel 
function exportExcel(string $titulo, array $cols, array $rows, string $fecha): void {
    $filename = sanitizeFilename($titulo).'_'.date('Ymd_His').'.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="'.$filename.'"');
    header('Pragma: no-cache');

    $out = fopen('php://output', 'w');
    fputs($out, "\xEF\xBB\xBF");
    fputcsv($out, [$titulo], ';');
    fputcsv($out, ['Generado: '.$fecha], ';');
    fputcsv($out, [], ';');
    fputcsv($out, $cols, ';');
    foreach ($rows as $row) fputcsv($out, $row, ';');
    fclose($out);
}

// Exportar PDF
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
