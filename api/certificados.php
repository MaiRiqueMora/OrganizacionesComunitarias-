<?php
/* ============================================================
   api/certificados.php — API para gestión de certificados municipales
   POST   → Generar certificados
   GET    → Verificar, estadísticas, historial
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

$user = requireSession();
$method = $_SERVER['REQUEST_METHOD'];
$accion = $_POST['accion'] ?? $_GET['accion'] ?? '';

if ($method === 'POST' && $accion === 'generar') {
    generarCertificado();
} elseif ($method === 'POST' && $accion === 'generar_directiva') {
    generarCertificadoDirectiva();
} elseif ($method === 'POST' && $accion === 'verificar') {
    verificarCertificado();
} elseif ($method === 'GET' && $accion === 'estadisticas') {
    obtenerEstadisticas();
} elseif ($method === 'GET' && $accion === 'historial') {
    generarHistorialPDF();
} else {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Operación no permitida']);
    exit;
}

// ── FUNCIONES PRINCIPALES ─────────────────────────────────────

function generarCertificado() {
    try {
        $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $tipo = $_POST['tipo'] ?? '';
        $organizacionId = $_POST['organizacion_id'] ?? '';
        
        if (!$tipo || !$organizacionId) {
            echo json_encode(['ok' => false, 'error' => 'Faltan datos requeridos']);
            return;
        }
        
        // Verificar que la organización exista
        $orgStmt = $db->prepare("SELECT * FROM organizaciones WHERE id = ?");
        $orgStmt->execute([$organizacionId]);
        $organizacion = $orgStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$organizacion) {
            echo json_encode(['ok' => false, 'error' => 'Organización no encontrada']);
            return;
        }
        
        // Generar número de certificado
        $numero = generarNumeroCertificado($db, $tipo);
        $codigo = generarCodigoVerificacion();
        $fechaEmision = date('Y-m-d');
        $fechaVencimiento = date('Y-m-d', strtotime('+30 days'));
        
        // Guardar certificado en la base de datos
        $insertStmt = $db->prepare("
            INSERT INTO certificados (
                tipo, organizacion_id, numero, codigo_verificacion, 
                fecha_emision, fecha_vencimiento, datos, emitido_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $datos = json_encode([
            'organizacion' => $organizacion['nombre'],
            'rut' => $organizacion['rut'],
            'direccion' => $organizacion['direccion'],
            'direccion_sede' => $organizacion['direccion_sede'],
            'sector_barrio' => $organizacion['sector_barrio'],
            'telefono_principal' => $organizacion['telefono_principal'],
            'correo' => $organizacion['correo'],
            'numero_socios' => $organizacion['numero_socios'],
            'representante_legal' => $organizacion['representante_legal'],
            'numero_decreto' => $organizacion['numero_decreto'],
            'fecha_constitucion' => $organizacion['fecha_constitucion'],
            'estado' => $organizacion['estado']
        ]);
        
        $insertStmt->execute([
            $tipo, $organizacionId, $numero, $codigo,
            $fechaEmision, $fechaVencimiento, $datos, $_SESSION['user_id']
        ]);
        
        $certificadoId = $db->lastInsertId();
        
        // Generar PDF
        $pdfUrl = generarPDFCertificado($certificadoId, $tipo, $organizacion, $numero, $codigo);
        
        echo json_encode([
            'ok' => true,
            'data' => [
                'id' => $certificadoId,
                'tipo_certificado' => getNombreTipoCertificado($tipo),
                'organizacion' => $organizacion['nombre'],
                'numero' => $numero,
                'codigo_verificacion' => $codigo,
                'fecha_emision' => $fechaEmision,
                'fecha_vencimiento' => $fechaVencimiento,
                'pdf_url' => $pdfUrl
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al generar certificado: ' . $e->getMessage()]);
    }
}

function generarCertificadoDirectiva() {
    try {
        $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $tipo = $_POST['tipo'] ?? '';
        $directivaId = $_POST['directiva_id'] ?? '';
        
        if (!$tipo || !$directivaId) {
            echo json_encode(['ok' => false, 'error' => 'Faltan datos requeridos']);
            return;
        }
        
        // Obtener datos de la directiva y organización
        $dirStmt = $db->prepare("
            SELECT d.*, o.nombre as organizacion_nombre, o.rut as organizizacion_rut, o.direccion as organizacion_direccion
            FROM directivas d
            INNER JOIN organizaciones o ON d.organizacion_id = o.id
            WHERE d.id = ?
        ");
        $dirStmt->execute([$directivaId]);
        $directiva = $dirStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$directiva) {
            echo json_encode(['ok' => false, 'error' => 'Directiva no encontrada']);
            return;
        }
        
        // Generar número de certificado
        $numero = generarNumeroCertificado($db, $tipo);
        $codigo = generarCodigoVerificacion();
        $fechaEmision = date('Y-m-d');
        $fechaVencimiento = date('Y-m-d', strtotime('+30 days'));
        
        // Guardar certificado en la base de datos
        $insertStmt = $db->prepare("
            INSERT INTO certificados (
                tipo, directiva_id, numero, codigo_verificacion, 
                fecha_emision, fecha_vencimiento, datos, emitido_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $datos = json_encode([
            'nombre' => $directiva['nombre'],
            'rut' => $directiva['rut'],
            'cargo' => $directiva['cargo'],
            'email' => $directiva['email'],
            'telefono' => $directiva['telefono'],
            'direccion' => $directiva['direccion'],
            'inicio_periodo' => $directiva['inicio_periodo'],
            'fin_periodo' => $directiva['fin_periodo'],
            'organizacion' => $directiva['organizacion_nombre'],
            'organizacion_rut' => $directiva['organizacion_rut'],
            'organizacion_direccion' => $directiva['organizacion_direccion']
        ]);
        
        $insertStmt->execute([
            $tipo, $directivaId, $numero, $codigo,
            $fechaEmision, $fechaVencimiento, $datos, $_SESSION['user_id']
        ]);
        
        $certificadoId = $db->lastInsertId();
        
        // Generar PDF
        $pdfUrl = generarPDFCertificadoDirectiva($certificadoId, $tipo, $directiva, $numero, $codigo);
        
        echo json_encode([
            'ok' => true,
            'data' => [
                'id' => $certificadoId,
                'tipo_certificado' => getNombreTipoCertificado($tipo),
                'persona' => $directiva['nombre'],
                'organizacion' => $directiva['organizacion_nombre'],
                'numero' => $numero,
                'codigo_verificacion' => $codigo,
                'fecha_emision' => $fechaEmision,
                'fecha_vencimiento' => $fechaVencimiento,
                'pdf_url' => $pdfUrl
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al generar certificado: ' . $e->getMessage()]);
    }
}

function verificarCertificado() {
    try {
        $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $codigo = $_POST['codigo'] ?? '';
        
        if (!$codigo) {
            echo json_encode(['ok' => false, 'error' => 'Código de verificación requerido']);
            return;
        }
        
        // Buscar certificado
        $stmt = $db->prepare("
            SELECT c.*, o.nombre as organizacion_nombre, o.rut as organizacion_rut
            FROM certificados c
            LEFT JOIN organizaciones o ON c.organizacion_id = o.id
            WHERE c.codigo_verificacion = ?
        ");
        $stmt->execute([$codigo]);
        $certificado = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$certificado) {
            echo json_encode(['ok' => false, 'error' => 'Certificado no encontrado']);
            return;
        }
        
        // Determinar estado
        $hoy = date('Y-m-d');
        $estado = 'vigente';
        if ($hoy > $certificado['fecha_vencimiento']) {
            $estado = 'expirado';
        }
        
        // Registrar verificación
        $verifStmt = $db->prepare("
            INSERT INTO verificaciones_certificados (certificado_id, fecha_verificacion, ip_usuario)
            VALUES (?, ?, ?)
        ");
        $verifStmt->execute([$certificado['id'], date('Y-m-d H:i:s'), $_SERVER['REMOTE_ADDR']]);
        
        // Actualizar contador de verificaciones
        $updateStmt = $db->prepare("
            UPDATE certificados SET verificaciones = verificaciones + 1, ultima_verificacion = ?
            WHERE id = ?
        ");
        $updateStmt->execute([date('Y-m-d H:i:s'), $certificado['id']]);
        
        $datos = json_decode($certificado['datos'], true);
        
        echo json_encode([
            'ok' => true,
            'data' => [
                'tipo_certificado' => getNombreTipoCertificado($certificado['tipo']),
                'numero' => $certificado['numero'],
                'organizacion' => $datos['organizacion'] ?? 'N/A',
                'persona' => $datos['nombre'] ?? null,
                'fecha_emision' => $certificado['fecha_emision'],
                'fecha_vencimiento' => $certificado['fecha_vencimiento'],
                'estado' => $estado,
                'verificaciones' => $certificado['verificaciones'] + 1,
                'ultima_verificacion' => date('Y-m-d H:i:s')
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al verificar certificado: ' . $e->getMessage()]);
    }
}

function obtenerEstadisticas() {
    try {
        $db = new PDO('sqlite:' . __DIR__ . '/../database/munidb.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Total de certificados
        $totalStmt = $db->prepare("SELECT COUNT(*) as total FROM certificados");
        $totalStmt->execute();
        $total = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Certificados este mes
        $mesStmt = $db->prepare("
            SELECT COUNT(*) as mes FROM certificados 
            WHERE strftime('%Y-%m', fecha_emision) = strftime('%Y-%m', 'now')
        ");
        $mesStmt->execute();
        $mes = $mesStmt->fetch(PDO::FETCH_ASSOC)['mes'];
        
        // Certificados vigentes
        $vigentesStmt = $db->prepare("
            SELECT COUNT(*) as vigentes FROM certificados 
            WHERE fecha_vencimiento >= date('now')
        ");
        $vigentesStmt->execute();
        $vigentes = $vigentesStmt->fetch(PDO::FETCH_ASSOC)['vigentes'];
        
        // Verificaciones hoy
        $verifStmt = $db->prepare("
            SELECT COUNT(*) as verificaciones_hoy FROM verificaciones_certificados 
            WHERE date(fecha_verificacion) = date('now')
        ");
        $verifStmt->execute();
        $verificacionesHoy = $verifStmt->fetch(PDO::FETCH_ASSOC)['verificaciones_hoy'];
        
        echo json_encode([
            'ok' => true,
            'data' => [
                'total' => $total,
                'mes' => $mes,
                'vigentes' => $vigentes,
                'verificaciones_hoy' => $verificacionesHoy
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al obtener estadísticas: ' . $e->getMessage()]);
    }
}

// ── FUNCIONES AUXILIARES ─────────────────────────────────────

function generarNumeroCertificado($db, $tipo) {
    $prefijos = [
        'personalidad_juridica' => 'PJ',
        'vigencia' => 'VG',
        'representacion' => 'RL',
        'socios' => 'SC',
        'provisorio_art6' => 'PR',
        'extincion_pj' => 'EX',
        'modificacion_estatutos' => 'ME',
        'cargo' => 'CG',
        'directiva_completa' => 'DC',
        'periodo' => 'PM',
        'quorum' => 'QM'
    ];
    
    $prefijo = $prefijos[$tipo] ?? 'CT';
    
    // Obtener último número del tipo
    $stmt = $db->prepare("SELECT numero FROM certificados WHERE tipo = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$tipo]);
    $ultimo = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($ultimo) {
        // Extraer número del formato
        if (preg_match('/(\d+)$/', $ultimo['numero'], $matches)) {
            $numero = (int)$matches[1] + 1;
        } else {
            $numero = 1;
        }
    } else {
        $numero = 1;
    }
    
    return sprintf('%s-%04d-%d', $prefijo, $numero, date('Y'));
}

function generarCodigoVerificacion() {
    return strtoupper(substr(md5(uniqid()), 0, 8) . '-' . substr(md5(time()), 0, 4));
}

function getNombreTipoCertificado($tipo) {
    $nombres = [
        'personalidad_juridica' => 'CERTIFICADO DE PERSONALIDAD JURÍDICA',
        'vigencia' => 'CERTIFICADO DE VIGENCIA',
        'representacion' => 'CERTIFICADO DE REPRESENTACIÓN LEGAL',
        'socios' => 'CERTIFICADO DE NÚMERO DE SOCIOS',
        'provisorio_art6' => 'CERTIFICADO PROVISORIO ART. 6',
        'extincion_pj' => 'CERTIFICADO DE EXTINCIÓN DE PERSONALIDAD JURÍDICA',
        'modificacion_estatutos' => 'CERTIFICADO DE MODIFICACIÓN DE ESTATUTOS',
        'cargo' => 'CERTIFICADO DE CARGO',
        'directiva_completa' => 'CERTIFICADO DE DIRECTIVA COMPLETA',
        'periodo' => 'CERTIFICADO DE PERÍODO DE MANDATO',
        'quorum' => 'CERTIFICADO DE QUÓRUM DIRECTIVO'
    ];
    
    return $nombres[$tipo] ?? 'CERTIFICADO';
}

function generarPDFCertificado($certificadoId, $tipo, $organizacion, $numero, $codigo) {
    // Crear directorio si no existe
    $dir = __DIR__ . '/../temp/certificados';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $filename = 'certificado_' . $certificadoId . '.pdf';
    $filepath = $dir . '/' . $filename;
    
    // Generar HTML del certificado según el tipo
    $html = generarHTMLCertificado($tipo, $organizacion, $numero, $codigo);
    
    // Usar wkhtmltopdf o similar para generar PDF
    // Por ahora, creamos un archivo temporal con el HTML
    file_put_contents($filepath . '.html', $html);
    
    // Simulación de generación PDF (en producción usar wkhtmltopdf)
    $pdfContent = '<html><body><h1>CERTIFICADO MUNICIPAL</h1><p>Este es un PDF generado para el certificado N° ' . $numero . '</p></body></html>';
    file_put_contents($filepath, $pdfContent);
    
    return '../temp/certificados/' . $filename;
}

function generarHTMLCertificado($tipo, $organizacion, $numero, $codigo) {
    $fecha = date('d/m/Y');
    $fechaVencimiento = date('d/m/Y', strtotime('+30 days'));
    
    $html = '<!DOCTYPE html><html><head>';
    $html .= '<meta charset="utf-8"><title>Certificado Municipal</title>';
    $html .= '<style>body{font-family:Arial,sans-serif;margin:20px;line-height:1.4}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:25px}.cert-title{font-size:18px;font-weight:bold;margin:15px 0;text-transform:uppercase}.cert-content{text-align:left;margin:20px 0;line-height:1.5}.footer{margin-top:40px;text-align:center}.signature{display:inline-block;margin:25px 30px;text-align:center}.qr-code{text-align:center;margin:20px 0;border:1px solid #ccc;padding:12px;background:#f9f9f9}.datos-table{width:100%;border-collapse:collapse;margin:10px 0}.datos-table td{padding:4px 0;border-bottom:1px solid #eee}.datos-table td:first-child{font-weight:bold;width:200px}</style>';
    $html .= '</head><body>';
    
    // Header unificado
    $html .= '<div class="header">';
    $html .= '<h1 style="margin:0;font-size:22px;">MUNICIPALIDAD DE PUCÓN</h1>';
    $html .= '<h2 style="margin:5px 0;font-size:16px;">DIRECCIÓN DE DESARROLLO COMUNITARIO</h2>';
    $html .= '<p style="margin:0;font-size:14px;"><strong>DEPARTAMENTO DE ORGANIZACIONES COMUNITARIAS</strong></p>';
    $html .= '<p style="margin:0;font-size:12px;">Región de La Araucanía - Chile</p>';
    $html .= '</div>';
    
    // Título del certificado
    $html .= '<div class="cert-title">' . getNombreTipoCertificado($tipo) . '</div>';
    
    $html .= '<div class="cert-content">';
    
    // Tabla de datos básicos
    $html .= '<table class="datos-table">';
    $html .= '<tr><td>N° de Certificado:</td><td>' . $numero . '</td></tr>';
    $html .= '<tr><td>Fecha de Emisión:</td><td>' . $fecha . '</td></tr>';
    $html .= '<tr><td>Válido hasta:</td><td>' . $fechaVencimiento . '</td></tr>';
    $html .= '</table>';
    
    // Contenido específico según tipo
    switch($tipo) {
        case 'personalidad_juridica':
            $html .= '<br><p><strong>SE CERTIFICA QUE:</strong></p>';
            $html .= '<table class="datos-table">';
            $html .= '<tr><td>Nombre de la Organización:</td><td>' . htmlspecialchars($organizacion['nombre']) . '</td></tr>';
            $html .= '<tr><td>RUT:</td><td>' . htmlspecialchars($organizacion['rut']) . '</td></tr>';
            $html .= '<tr><td>Dirección:</td><td>' . htmlspecialchars($organizacion['direccion']) . '</td></tr>';
            if (!empty($organizacion['direccion_sede'])) {
                $html .= '<tr><td>Dirección Sede:</td><td>' . htmlspecialchars($organizacion['direccion_sede']) . '</td></tr>';
            }
            $html .= '<tr><td>Sector/Barrio:</td><td>' . htmlspecialchars($organizacion['sector_barrio'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Representante Legal:</td><td>' . htmlspecialchars($organizacion['representante_legal'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° de Socios:</td><td>' . htmlspecialchars($organizacion['numero_socios'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° Decreto:</td><td>' . htmlspecialchars($organizacion['numero_decreto'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Fecha Constitución:</td><td>' . ($organizacion['fecha_constitucion'] ? date('d/m/Y', strtotime($organizacion['fecha_constitucion'])) : 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Estado:</td><td>' . htmlspecialchars($organizacion['estado']) . '</td></tr>';
            $html .= '</table>';
            $html .= '<br><p style="text-align:justify;">Se encuentra debidamente registrada en el Sistema Municipal de Organizaciones Comunitarias, con personalidad jurídica vigente y en pleno ejercicio de sus derechos y obligaciones.</p>';
            break;
            
        case 'modificacion_estatutos':
            $html .= '<br><p><strong>SE CERTIFICA LA MODIFICACIÓN DE ESTATUTOS DE:</strong></p>';
            $html .= '<table class="datos-table">';
            $html .= '<tr><td>Nombre de la Organización:</td><td>' . htmlspecialchars($organizacion['nombre']) . '</td></tr>';
            $html .= '<tr><td>RUT:</td><td>' . htmlspecialchars($organizacion['rut']) . '</td></tr>';
            $html .= '<tr><td>Dirección:</td><td>' . htmlspecialchars($organizacion['direccion']) . '</td></tr>';
            if (!empty($organizacion['direccion_sede'])) {
                $html .= '<tr><td>Dirección Sede:</td><td>' . htmlspecialchars($organizacion['direccion_sede']) . '</td></tr>';
            }
            $html .= '<tr><td>Sector/Barrio:</td><td>' . htmlspecialchars($organizacion['sector_barrio'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Representante Legal:</td><td>' . htmlspecialchars($organizacion['representante_legal'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° de Socios:</td><td>' . htmlspecialchars($organizacion['numero_socios'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Fecha Constitución:</td><td>' . ($organizacion['fecha_constitucion'] ? date('d/m/Y', strtotime($organizacion['fecha_constitucion'])) : 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Estado:</td><td>' . htmlspecialchars($organizacion['estado']) . '</td></tr>';
            $html .= '<tr><td>Fecha Modificación:</td><td>' . date('d/m/Y') . '</td></tr>';
            $html .= '</table>';
            $html .= '<br><p style="text-align:justify;">Por la presente se certifica que la organización mencionada ha modificado sus estatutos, los cuales han sido aprobados por la asamblea de socios y se encuentran debidamente registrados en el Sistema Municipal de Organizaciones Comunitarias, manteniendo su personalidad jurídica vigente.</p>';
            break;
            
        case 'provisorio_art6':
            $html .= '<br><p><strong>SE CERTIFICA QUE:</strong></p>';
            $html .= '<table class="datos-table">';
            $html .= '<tr><td>Nombre de la Organización:</td><td>' . htmlspecialchars($organizacion['nombre']) . '</td></tr>';
            $html .= '<tr><td>RUT:</td><td>' . htmlspecialchars($organizacion['rut']) . '</td></tr>';
            $html .= '<tr><td>Dirección:</td><td>' . htmlspecialchars($organizacion['direccion']) . '</td></tr>';
            if (!empty($organizacion['direccion_sede'])) {
                $html .= '<tr><td>Dirección Sede:</td><td>' . htmlspecialchars($organizacion['direccion_sede']) . '</td></tr>';
            }
            $html .= '<tr><td>Sector/Barrio:</td><td>' . htmlspecialchars($organizacion['sector_barrio'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Representante Legal:</td><td>' . htmlspecialchars($organizacion['representante_legal'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° de Socios:</td><td>' . htmlspecialchars($organizacion['numero_socios'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Fecha Constitución:</td><td>' . ($organizacion['fecha_constitucion'] ? date('d/m/Y', strtotime($organizacion['fecha_constitucion'])) : 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Estado:</td><td>' . htmlspecialchars($organizacion['estado']) . '</td></tr>';
            $html .= '</table>';
            $html .= '<br><p style="text-align:justify;">Se encuentra en proceso de regularización conforme al Artículo 6 de la Ley N° 19.418, contando con un plazo de 6 meses para completar su constitución legal.</p>';
            break;
            
        case 'extincion_pj':
            $html .= '<br><p><strong>SE CERTIFICA LA EXTINCIÓN DE PERSONALIDAD JURÍDICA DE:</strong></p>';
            $html .= '<table class="datos-table">';
            $html .= '<tr><td>Nombre de la Organización:</td><td>' . htmlspecialchars($organizacion['nombre']) . '</td></tr>';
            $html .= '<tr><td>RUT:</td><td>' . htmlspecialchars($organizacion['rut']) . '</td></tr>';
            $html .= '<tr><td>Dirección:</td><td>' . htmlspecialchars($organizacion['direccion']) . '</td></tr>';
            if (!empty($organizacion['direccion_sede'])) {
                $html .= '<tr><td>Dirección Sede:</td><td>' . htmlspecialchars($organizacion['direccion_sede']) . '</td></tr>';
            }
            $html .= '<tr><td>Sector/Barrio:</td><td>' . htmlspecialchars($organizacion['sector_barrio'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Representante Legal:</td><td>' . htmlspecialchars($organizacion['representante_legal'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° de Socios:</td><td>' . htmlspecialchars($organizacion['numero_socios'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>N° Decreto:</td><td>' . htmlspecialchars($organizacion['numero_decreto'] ?? 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Fecha Constitución:</td><td>' . ($organizacion['fecha_constitucion'] ? date('d/m/Y', strtotime($organizacion['fecha_constitucion'])) : 'No especificado') . '</td></tr>';
            $html .= '<tr><td>Estado Actual:</td><td>' . htmlspecialchars($organizacion['estado']) . '</td></tr>';
            $html .= '<tr><td>Fecha de Extinción:</td><td>' . date('d/m/Y') . '</td></tr>';
            $html .= '</table>';
            $html .= '<br><p style="text-align:justify;">Por la presente se certifica que la organización mencionada ha extinguido su personalidad jurídica, de conformidad con lo establecido en la Ley N° 19.418 sobre Juntas de Vecinos y demás Organizaciones Comunitarias.</p>';
            $html .= '<br><p style="text-align:justify;">Esta extinción implica la disolución de la organización y la cesación de todos sus derechos y obligaciones como persona jurídica, debiendo procederse a la liquidación de sus bienes y la cancelación de su inscripción en el registro municipal correspondiente.</p>';
            break;
            
        default:
            // Para otros tipos de certificados
            $html .= '<br><p><strong>SE CERTIFICA QUE:</strong></p>';
            $html .= '<table class="datos-table">';
            $html .= '<tr><td>Nombre de la Organización:</td><td>' . htmlspecialchars($organizacion['nombre']) . '</td></tr>';
            $html .= '<tr><td>RUT:</td><td>' . htmlspecialchars($organizacion['rut']) . '</td></tr>';
            $html .= '<tr><td>Dirección:</td><td>' . htmlspecialchars($organizacion['direccion']) . '</td></tr>';
            $html .= '<tr><td>Estado:</td><td>' . htmlspecialchars($organizacion['estado']) . '</td></tr>';
            $html .= '</table>';
            $html .= '<br><p style="text-align:justify;">Se encuentra debidamente registrada en el Sistema Municipal de Organizaciones Comunitarias.</p>';
            break;
    }
    
    $html .= '</div>';
    
    // Código de verificación
    $html .= '<div class="qr-code">';
    $html .= '<p style="margin:0;font-weight:bold;">CÓDIGO DE VERIFICACIÓN</p>';
    $html .= '<p style="margin:5px 0;font-size:16px;font-weight:bold;">' . $codigo . '</p>';
    $html .= '<p style="margin:0;font-size:11px;">Verifique en: municipalidad.pucon.cl/verificar</p>';
    $html .= '</div>';
    
    // Firmas
    $html .= '<div class="footer">';
    $html .= '<div class="signature">';
    $html .= '<p style="margin:0;border-bottom:1px solid #000;padding-bottom:5px;">&nbsp;</p>';
    $html .= '<p style="margin:5px 0;font-weight:bold;">Firma Alcalde(a)</p>';
    $html .= '<p style="margin:0;font-size:12px;">Municipalidad de Pucón</p>';
    $html .= '</div>';
    $html .= '<div class="signature">';
    $html .= '<p style="margin:0;border-bottom:1px solid #000;padding-bottom:5px;">&nbsp;</p>';
    $html .= '<p style="margin:5px 0;font-weight:bold;">Firma Director/a</p>';
    $html .= '<p style="margin:0;font-size:12px;">Dirección Desarrollo Comunitario</p>';
    $html .= '</div>';
    $html .= '<br><p style="margin:20px 0;font-weight:bold;">SELLO MUNICIPAL</p>';
    $html .= '</div>';
    
    $html .= '</body></html>';
    
    return $html;
}

function generarHistorialPDF() {
    // Implementación para generar PDF del historial de certificados
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="historial_certificados_' . date('Y-m-d') . '.pdf"');
    
    echo '<html><body><h1>Historial de Certificados</h1><p>Función en desarrollo...</p></body></html>';
}
?>
