<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: directivos.php
 * 
 * DESCRIPCIÓN:
 * API REST para gestión de directivos de organizaciones municipales.
 * Maneja el registro y administración de autoridades y representantes.
 * 
 * FUNCIONALIDADES:
 * - Registro de nuevos directivos
 * - Edición de datos de directivos
 * - Eliminación lógica (papelera) y física
 * - Listado con filtros por organización y estado
 * - Búsqueda por nombre o cargo
 * - Control de vigencia de cargos
 * 
 * ENDPOINTS:
 * - GET    /api/directivos.php              - Listar directivos
 * - POST   /api/directivos.php              - Crear directivo
 * - PUT    /api/directivos.php              - Actualizar directivo
 * - DELETE /api/directivos.php              - Eliminar directivo
 * - GET    /api/directivos.php?action=list - Listar con filtros
 * 
 * FILTROS DISPONIBLES:
 * - org_id: Filtrar por ID de organización
 * - search: Búsqueda por nombre o cargo
 * - estado: Filtrar por estado (vigente/vencido)
 * 
 * SEGURIDAD:
 * - Requiere autenticación válida (requireSession)
 * - Control de permisos por rol (canWrite)
 * - Validación de datos de entrada
 * - Manejo seguro de eliminación
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

// Usar sessionUser en lugar de requireSession para no bloquear completamente
$user   = sessionUser();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo    = getDB();

/* ── GET ── */
if ($method === 'GET') {

    if ($action === 'list') {
        $where = []; $params = [];
        // Siempre excluir directivos eliminados
        $where[] = '(d.eliminada IS NULL OR d.eliminada = 0)';
        if (!empty($_GET['org_id']))  { $where[] = 'd.organizacion_id = ?'; $params[] = (int)$_GET['org_id']; }
        if (!empty($_GET['search']))  { $where[] = '(d.nombre LIKE ? OR d.cargo LIKE ?)'; $params[] = '%'.$_GET['search'].'%'; $params[] = '%'.$_GET['search'].'%'; }
        if (!empty($_GET['estado'])) {
            if ($_GET['estado'] === 'vigente') {
                // Incluir tanto los nuevos estados vigente como los antiguos Activo/Inactivo según fecha
                $where[] = '(d.estado = "vigente" OR (d.estado IN ("Activo", "Inactivo") AND (d.fecha_termino IS NULL OR d.fecha_termino >= CURDATE())))';
            } elseif ($_GET['estado'] === 'vencido') {
                // Incluir tanto los nuevos estados vencido como los antiguos según fecha
                $where[] = '(d.estado = "vencido" OR (d.estado IN ("Activo", "Inactivo") AND d.fecha_termino IS NOT NULL AND d.fecha_termino < CURDATE()))';
            }
        }
        $wsql = $where ? 'WHERE '.implode(' AND ',$where) : '';
        $stmt = $pdo->prepare("
            SELECT d.*, o.nombre AS org_nombre
            FROM directivos d
            LEFT JOIN organizaciones o ON o.id = d.organizacion_id
            $wsql
            ORDER BY d.nombre, o.nombre, d.cargo
        ");
        $stmt->execute($params);
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }
        $stmt = $pdo->prepare("
            SELECT d.*, o.nombre AS org_nombre
            FROM directivos d
            LEFT JOIN organizaciones o ON o.id = d.organizacion_id
            WHERE d.id = ?
        ");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$data]);
        exit;
    }

    if ($action === 'alertas') {
        $dias = ALERTA_DIAS_ANTES;
        $stmt = $pdo->prepare("
            SELECT d.id, d.nombre, d.cargo, d.fecha_termino, o.nombre AS org_nombre,
                   DATEDIFF(d.fecha_termino, CURDATE()) AS dias_restantes
            FROM directivos d
            JOIN organizaciones o ON o.id = d.organizacion_id
            WHERE d.estado = 'Activo'
              AND d.fecha_termino IS NOT NULL
              AND d.fecha_termino BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY d.fecha_termino ASC
        ");
        $stmt->execute([$dias]);
        ob_end_clean();
        echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
        exit;
    }

    if ($action === 'restaurar') {
        error_log("DEBUG: Método: $method, acción: $action");
        error_log("DEBUG: Usuario: " . json_encode($user));
        error_log("DEBUG: REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
        error_log("DEBUG: GET params: " . json_encode($_GET));
        error_log("DEBUG: canWrite(): " . (canWrite() ? 'true' : 'false'));
        if (!canWrite()) {
            error_log("DEBUG: Sin permisos para restaurar");
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['ok'=>false,'error'=>'Sin permisos']);
            exit;
        }
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }
        $pdo->prepare("UPDATE directivos SET eliminada = 0, fecha_eliminacion = NULL, eliminado_por = NULL WHERE id=?")->execute([$id]);
        logHistorial('directivos', $id, 'restaurar', 'Directivo restaurado de papelera', $user['id']);
        ob_end_clean();
        echo json_encode(['ok'=>true]);
        exit;
    }

    ob_end_clean();
    echo json_encode(['ok'=>false,'error'=>'Acción no válida']);
    exit;
}

/* ── POST crear ── */
if ($method === 'POST' && $action === '') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }
    
    // Verificar que tenemos usuario válido
    if (!$user || !isset($user['id'])) {
        error_log('ERROR directivos.php: Usuario no válido');
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Sesión no válida']); exit;
    }
    
    $d = json_decode(file_get_contents('php://input'), true);
    if (empty($d['nombre']) || empty($d['cargo']) || empty($d['organizacion_id'])) {
        ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Nombre, cargo y organización son obligatorios']); exit;
    }
    
    try {
        // INSERT con columnas que existen en la base de datos
        $stmt = $pdo->prepare("
            INSERT INTO directivos (organizacion_id, nombre, cargo, email, telefono, fecha_inicio, fecha_termino, estado, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $organizacion_id = (int)$d['organizacion_id'];
        $nombre = trim($d['nombre']);
        $cargo = trim($d['cargo']);
        $email = $d['correo'] ?? null;
        $telefono = $d['telefono'] ?? null;
        $fecha_inicio = $d['fecha_inicio'] ?? null;
        $fecha_termino = $d['fecha_termino'] ?? null;
        $estado = $d['estado'] ?? 'Activo';
        $observaciones = $d['observaciones'] ?? null;
        
        $stmt->execute([
            $organizacion_id,
            $nombre,
            $cargo,
            $email,
            $telefono,
            $fecha_inicio,
            $fecha_termino,
            $estado,
            $observaciones
        ]);
        
        $id = (int)$pdo->lastInsertId();
        if (function_exists('logHistorial')) {
            logHistorial('directivos', $id, 'crear', 'Directivo creado: ' . $nombre, $user['id']);
        }
        ob_end_clean();
        echo json_encode(['ok'=>true,'id'=>$id]);
        exit;
    } catch (PDOException $e) {
        error_log('ERROR directivos INSERT: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error de base de datos: ' . $e->getMessage()]);
        exit;
    } catch (Exception $e) {
        error_log('ERROR directivos: ' . $e->getMessage());
        ob_end_clean();
        echo json_encode(['ok'=>false,'error'=>'Error: ' . $e->getMessage()]);
        exit;
    }
}

/* ── PUT editar ── */
if ($method === 'PUT') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($_GET['id'] ?? $d['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }
    $pdo->prepare("
        UPDATE directivos SET
            organizacion_id=?, nombre=?, cargo=?, rut=?, telefono=?, correo=?,
            direccion=?, fecha_inicio=?, fecha_termino=?, estado=?, observaciones=?,
            updated_at=NOW()
        WHERE id=?
    ")->execute([(int)$d['organizacion_id'], trim($d['nombre']), trim($d['cargo']),
        $d['rut']??null, $d['telefono']??null, $d['correo']??null, $d['direccion']??null,
        $d['fecha_inicio']??null, $d['fecha_termino']??null, $d['estado']??'Activo',
        $d['observaciones']??null, $id]);
    
    // Obtener los datos actualizados para devolverlos
    $stmt = $pdo->prepare("
        SELECT d.*, o.nombre AS org_nombre
        FROM directivos d
        LEFT JOIN organizaciones o ON o.id = d.organizacion_id
        WHERE d.id = ?
    ");
    $stmt->execute([$id]);
    $data = $stmt->fetch();
    
    logHistorial('directivos', $id, 'editar', 'Directivo actualizado', $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true,'data'=>$data]);
    exit;
}

/* ── DELETE ── */
if ($method === 'DELETE') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ID requerido']); exit; }
    
    // Soft delete - mover a papelera como las organizaciones
    $pdo->prepare("UPDATE directivos SET eliminada = 1, fecha_eliminacion = NOW(), eliminado_por = ? WHERE id=?")->execute([$user['id'], $id]);
    logHistorial('directivos', $id, 'eliminar', 'Directivo movido a papelera', $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true]);
    exit;
}

/* ── POST importar Excel ── */
if ($method === 'POST' && $action === 'importar') {
    if (!canWrite()) { ob_end_clean(); http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Sin permisos']); exit; }
    if (empty($_FILES['archivo'])) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No se recibió el archivo']); exit; }

    $file = $_FILES['archivo'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['xlsx','xls'])) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'Solo se aceptan .xlsx o .xls']); exit; }
    if (!class_exists('ZipArchive') && $ext==='xlsx') { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'ZipArchive no disponible']); exit; }

    $rows = leerExcelDirectivos($file['tmp_name'], $ext);
    if ($rows === false) { ob_end_clean(); echo json_encode(['ok'=>false,'error'=>'No se pudo leer el archivo']); exit; }

    $insertados = 0; $actualizados = 0; $errores = [];

    $orgsMap = [];
    foreach ($pdo->query("SELECT id, nombre FROM organizaciones")->fetchAll() as $o) {
        // Normalizar: trim + colapsar espacios múltiples internos
        $key = mb_strtolower(preg_replace('/\s+/', ' ', trim($o['nombre'])));
        $orgsMap[$key] = $o['id'];
    }

    $orgActual = null; $orgIdActual = null;
    $filaNum = 1;

    foreach ($rows as $row) {
        $filaNum++;
        $esOrg = !empty($row[0]) && is_numeric($row[0]);

        if ($esOrg) {
            // Fila cabecera de organización
            $orgActual   = preg_replace('/\s+/', ' ', trim($row[1] ?? ''));
            $orgIdActual = null;
            $key = mb_strtolower($orgActual);

            // 1. Coincidencia exacta normalizada
            if (isset($orgsMap[$key])) {
                $orgIdActual = $orgsMap[$key];
            } else {
                // 2. Búsqueda por substring bidireccional
                foreach ($orgsMap as $nom => $oid) {
                    if (str_contains($nom, $key) || str_contains($key, $nom)) {
                        $orgIdActual = $oid; break;
                    }
                }
            }
            if (!$orgIdActual) {
                // 3. Búsqueda por palabras clave (ignora artículos y espacios)
                $palabrasKey = array_filter(explode(' ', $key), fn($w) => strlen($w) > 3);
                foreach ($orgsMap as $nom => $oid) {
                    $coincidencias = 0;
                    foreach ($palabrasKey as $pal) {
                        if (str_contains($nom, $pal)) $coincidencias++;
                    }
                    if ($coincidencias >= count($palabrasKey) * 0.8) {
                        $orgIdActual = $oid; break;
                    }
                }
            }

            $cargo  = trim($row[2] ?? '');
            $nombre = trim($row[3] ?? '');
            if (!$nombre || !$cargo) continue;
        } else {
            $cargo  = trim($row[2] ?? '');
            $nombre = trim($row[3] ?? '');
            if (!$nombre || !$cargo) continue;
            $correoB = trim($row[1] ?? '');
            $correo  = filter_var($correoB, FILTER_VALIDATE_EMAIL) ? $correoB : null;
        }

        if (!$orgIdActual) {
            $errores[] = "Fila $filaNum: '$orgActual' no encontrada. Importa primero las organizaciones.";
            continue;
        }

        $correo   = $correo ?? (isset($row[1]) && filter_var(trim($row[1]??''), FILTER_VALIDATE_EMAIL) ? trim($row[1]) : null);
        $direccion= trim($row[5] ?? '');
        $telefono = !empty($row[6]) ? trim((string)$row[6]) : null;
        $vigencia = $row[7] ?? null;

        // Determinar estado según la fecha de término
        $estado = 'vigente';
        if ($vigencia) {
            $fechaTermino = new DateTime($vigencia);
            $hoy = new DateTime();
            if ($fechaTermino < $hoy) {
                $estado = 'vencido';
            }
        }

        try {
            // Verificar si ya existe
            $existe = $pdo->prepare("SELECT id FROM directivos WHERE organizacion_id=? AND LOWER(TRIM(nombre))=LOWER(TRIM(?)) AND LOWER(TRIM(cargo))=LOWER(TRIM(?)) LIMIT 1");
            $existe->execute([$orgIdActual, $nombre, $cargo]);
            $did = $existe->fetchColumn();

            if ($did) {
                // Actualizar incluyendo el estado calculado
                $pdo->prepare('UPDATE directivos SET telefono=COALESCE(?,telefono), correo=COALESCE(?,correo), direccion=COALESCE(CASE WHEN ?="" THEN NULL ELSE ? END,direccion), fecha_termino=COALESCE(?,fecha_termino), estado=?, updated_at=datetime("now","localtime") WHERE id=?')
                    ->execute([$telefono, $correo, $direccion, $direccion?:null, $vigencia, $estado, $did]);
                $actualizados++;
            } else {
                // Insertar con el estado calculado
                $pdo->prepare('INSERT INTO directivos (organizacion_id,nombre,cargo,telefono,correo,direccion,fecha_termino,estado,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
                    ->execute([$orgIdActual, $nombre, $cargo, $telefono, $correo, $direccion?:null, $vigencia, $estado, $user['id']]);
                $insertados++;
            }
        } catch (Throwable $e) {
            $errores[] = "Fila $filaNum ($nombre): ".$e->getMessage();
        }
    }

    logHistorial('directivos', 0, 'importar', "Importación: $insertados nuevos, $actualizados actualizados", $user['id']);
    ob_end_clean();
    echo json_encode(['ok'=>true,'insertados'=>$insertados,'actualizados'=>$actualizados,'errores'=>$errores]);
    exit;
}

ob_end_clean();
echo json_encode(['ok'=>false,'error'=>'Método o acción no válidos']);

/* ── Lector Excel ── */
function leerExcelDirectivos(string $path, string $ext): array|false {
    $colsFecha = [7, 12];
    try {
        if ($ext === 'xls') return leerXLS($path);
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) return false;
        $ss = [];
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml) {
            preg_match_all('/<si\b[^>]*>(.*?)<\/si>/s', $ssXml, $m);
            foreach ($m[1] as $si) {
                preg_match_all('/<t(?:\s[^>]*)?>([^<]*)<\/t>/', $si, $mt);
                $ss[] = implode('', $mt[1]);
            }
        }
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        if (!$sheetXml) return false;
        $rows = [];
        preg_match_all('/<row\b[^>]*\br="(\d+)"[^>]*>(.*?)<\/row>/s', $sheetXml, $rm);
        foreach ($rm[1] as $i => $rNum) {
            $rowData = []; $maxCol = -1;
            preg_match_all('/<c\b([^>]*)>(.*?)<\/c>/s', $rm[2][$i], $cm);
            foreach ($cm[1] as $j => $attrs) {
                $content = $cm[2][$j];
                preg_match('/\br="([A-Z]+)\d+"/i', $attrs, $refM);
                if (!$refM) continue;
                $col = colIdx($refM[1]);
                while ($maxCol < $col-1) { $rowData[] = null; $maxCol++; }
                $t = (preg_match('/\bt="([^"]+)"/', $attrs, $tM)) ? $tM[1] : '';
                preg_match('/<v>([^<]*)<\/v>/', $content, $vM);
                $v = $vM[1] ?? null;
                if ($t === 's')      $rowData[] = $ss[(int)$v] ?? '';
                elseif ($v !== null && in_array($col, $colsFecha)) $rowData[] = is_numeric($v) ? date('Y-m-d',(int)round(((float)$v-25569)*86400)) : $v;
                else                 $rowData[] = $v !== null ? ($v+0==$v?$v+0:$v) : null;
                $maxCol = $col;
            }
            $rows[(int)$rNum] = $rowData;
        }
        ksort($rows); $r = array_values($rows); array_shift($r);
        return $r;
    } catch (Throwable $e) { error_log('leerExcelDirectivos: '.$e->getMessage()); return false; }
}

function leerXLS(string $path): array|false {
    return false;
}

function colIdx(string $col): int {
    $idx = 0;
    foreach (str_split(strtoupper($col)) as $c) $idx = $idx*26 + ord($c)-64;
    return $idx-1;
}
