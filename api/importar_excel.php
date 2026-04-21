<?php
// Importar organizaciones/directivos desde Excel (.xls/.xlsx)
ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

requireRol('administrador', 'funcionario');
$user = sessionUser();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Método no válido']); exit;
}

if (!isset($_FILES['archivo']) || !is_uploaded_file($_FILES['archivo']['tmp_name'])) {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No se recibió archivo']); exit;
}

$tipo = $_POST['tipo'] ?? '';
if (!$tipo || !in_array($tipo, ['organizaciones','directivos'])) {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Tipo no válido']); exit;
}

$archivo = $_FILES['archivo']['tmp_name'];
$ext = strtolower(pathinfo($_FILES['archivo']['name'], PATHINFO_EXTENSION));

// Detectar si es CSV por contenido aunque tenga extensión .xlsx
$isCSV = $ext === 'csv';
if (!$isCSV && in_array($ext, ['xls','xlsx'])) {
    $header = file_get_contents($_FILES['archivo']['tmp_name'], false, null, 0, 100);
    $isCSV = strpos($header, ';') !== false && strpos($header, 'PK') !== 0;
}

if (!in_array($ext, ['xls','xlsx','csv']) && !$isCSV) {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Solo se permiten archivos .xls, .xlsx o .csv']); exit;
}
 
try {
    if ($isCSV) {
        // Leer CSV directamente - leer líneas y convertir UTF-8
        $lines = file($archivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $lines = array_map(function($line) {
            return mb_convert_encoding($line, 'UTF-8', 'Windows-1252,ISO-8859-1,UTF-8');
        }, $lines);
        // Convertir a array de arrays (matriz)
        $rows = array_map(function($line) {
            return array_map('trim', explode(';', $line));
        }, $lines);
    } else {
        // Leer Excel real con PhpSpreadsheet
        $reader = IOFactory::createReaderForFile($archivo);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($archivo);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, false, false, false);
    }
    // Quitar encabezado si existe
    if (count($rows) > 1 && preg_match('/nombre|cargo|organizacion/i', implode(' ', $rows[0]))) {
        array_shift($rows);
    }
} catch (Throwable $e) {
    ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Error leyendo archivo: '.$e->getMessage()]); exit;
}

// Procesar directamente (sin llamada HTTP)
try {
    $pdo = getDB();
    $importId = date('Ymd-His') . '-' . uniqid();
    
    if ($tipo === 'directivos') {
        // Cargar mapa de organizaciones
        $orgsMap = [];
        foreach ($pdo->query("SELECT id, nombre FROM organizaciones WHERE eliminada = 0 OR eliminada IS NULL")->fetchAll() as $o) {
            $key = mb_strtolower(preg_replace('/\s+/', ' ', trim($o['nombre'])));
            $orgsMap[$key] = $o['id'];
        }
        
        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $orgActual = null;
        $orgIdActual = null;
        
        foreach ($rows as $i => $row) {
            $fila = $i + 2;
            
            // Detectar nueva organización
            $esOrg = !empty($row[0]) && is_numeric($row[0]);
            
            if ($esOrg || (!empty($row[1]) && !empty($row[2]))) {
                $orgActual = preg_replace('/\s+/', ' ', trim($row[1] ?? ''));
                
                $orgIdActual = null;
                $key = mb_strtolower($orgActual);
                
                if (isset($orgsMap[$key])) {
                    $orgIdActual = $orgsMap[$key];
                } else {
                    foreach ($orgsMap as $nom => $oid) {
                        if (str_contains($nom, $key) || str_contains($key, $nom)) {
                            $orgIdActual = $oid;
                            break;
                        }
                    }
                }
                
                if (!$orgIdActual) {
                    $errores[] = "Fila $fila: '$orgActual' no encontrada";
                    continue;
                }
            }
            
            $cargo = trim($row[2] ?? '');
            $nombre = trim($row[3] ?? '');
            
            if (!$nombre || !$cargo || !$orgIdActual) {
                continue;
            }
            
            // Procesar campos opcionales
            $correo = trim($row[4] ?? '');
            if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) $correo = null;
            
            $direccion = trim($row[6] ?? '');
            if (empty($direccion)) $direccion = null;
            
            $telefono = !empty($row[7]) ? preg_replace('/[^\d\s+\-()]/', '', (string)$row[7]) : null;
            
            // Parsear fecha
            $vigencia = null;
            $vigStr = trim($row[8] ?? '');
            if ($vigStr) {
                if (preg_match('/(\d{1,2})\/(\d{1,2})\/(\d{4})/', $vigStr, $m)) {
                    $vigencia = sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
                } elseif (preg_match('/(\d{1,2})-(\w+)-(\d{4})/', $vigStr, $m)) {
                    $meses = ['ene'=>1,'feb'=>2,'mar'=>3,'abr'=>4,'may'=>5,'jun'=>6,'jul'=>7,'ago'=>8,'sep'=>9,'oct'=>10,'nov'=>11,'dic'=>12,'enero'=>1,'febrero'=>2,'marzo'=>3,'abril'=>4,'mayo'=>5,'junio'=>6,'julio'=>7,'agosto'=>8,'septiembre'=>9,'octubre'=>10,'noviembre'=>11,'diciembre'=>12];
                    $mes = $meses[strtolower($m[2])] ?? null;
                    if ($mes) {
                        $vigencia = sprintf('%04d-%02d-%02d', $m[3], $mes, $m[1]);
                    }
                }
            }
            
            try {
                $existe = $pdo->prepare("SELECT id FROM directivos WHERE organizacion_id=? AND LOWER(TRIM(nombre))=LOWER(TRIM(?)) AND LOWER(TRIM(cargo))=LOWER(TRIM(?)) LIMIT 1");
                $existe->execute([$orgIdActual, $nombre, $cargo]);
                $did = $existe->fetchColumn();
                
                if ($did) {
                    $pdo->prepare("UPDATE directivos SET telefono=COALESCE(?,telefono), correo=COALESCE(?,correo), direccion=COALESCE(?,direccion), fecha_termino=COALESCE(?,fecha_termino), updated_at=NOW() WHERE id=?")
                        ->execute([$telefono, $correo, $direccion, $vigencia, $did]);
                    $actualizados++;
                } else {
                    $pdo->prepare("INSERT INTO directivos (organizacion_id,nombre,cargo,telefono,correo,direccion,fecha_termino,estado,import_id,created_by) VALUES (?,?,?,?,?,?,?,'Activo',?,?)")
                        ->execute([$orgIdActual, $nombre, $cargo, $telefono, $correo, $direccion, $vigencia, $importId, $user['id']]);
                    $insertados++;
                }
            } catch (Exception $e) {
                $errores[] = "Fila $fila: {$e->getMessage()}";
            }
        }
        
        $result = [
            'ok' => true,
            'insertados' => $insertados,
            'actualizados' => $actualizados,
            'errores' => $errores,
            'import_id' => $importId
        ];
        
    } else {
        // Para organizaciones (simplificado)
        $result = ['ok'=>false,'error'=>'Importación de organizaciones no implementada en este endpoint'];
    }
    
    ob_end_clean();
    echo json_encode($result);
    
} catch (Throwable $e) {
    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Error: '.$e->getMessage()]);
}
