<?php
/* ============================================================
   api/reportes.php
   GET ?tipo=organizaciones_activas&formato=excel|pdf
   GET ?tipo=directivas_vigentes&formato=excel|pdf
   GET ?tipo=directivas_vencidas&formato=excel|pdf
   ============================================================ */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../config/reportes_service.php';

requireSession();

$tipo    = $_GET['tipo']    ?? '';
$formato = $_GET['formato'] ?? 'excel';

try {
    [$titulo, $cols, $rows] = report_build($tipo);
} catch (InvalidArgumentException $e) {
    header('Content-Type: application/json');
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
