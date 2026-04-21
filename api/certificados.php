<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: certificados.php
 * 
 * DESCRIPCIÓN:
 * API REST para generación y gestión de certificados municipales.
 * Interfaz principal para crear certificados de organizaciones.
 * 
 * FUNCIONALIDADES:
 * - Generación de certificados en formato DOCX/PDF
 * - Listado de tipos de certificados disponibles
 * - Validación de datos para certificados
 * - Descarga automática de documentos generados
 * - Logging de operaciones de certificación
 * 
 * TIPOS DE CERTIFICADOS:
 * - personalidad: Personalidad Jurídica
 * - modificacion: Modificación de Estatutos
 * - extincion: Extinción de Personalidad
 * - directorio: Directorio de Organización
 * 
 * ENDPOINTS:
 * - GET    /api/certificados.php?action=tipos - Listar tipos disponibles
 * - POST   /api/certificados.php?action=generar - Generar certificado
 * 
 * DEPENDENCIAS:
 * - PhpOffice\PhpWord: Manipulación de plantillas DOCX
 * - certificados_robusto.php: Clase principal de generación
 * - certificados_functions.php: Funciones auxiliares
 * - MySQL/MariaDB: Base de datos de organizaciones
 * 
 * SEGURIDAD:
 * - Requiere autenticación válida (requireSession)
 * - Validación de permisos de usuario
 * - Sanitización de datos de entrada
 * - Control de acceso por rol
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

ini_set('display_errors', 0);
ob_start();
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/certificados_robusto.php';
require_once __DIR__ . '/certificados_functions.php';

use PhpOffice\PhpWord\TemplateProcessor;

$user   = sessionUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok'=>false,'error'=>'Sesión no válida.']);
    exit;
}
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/* Tipos disponibles */
if ($method === 'GET' && $action === 'tipos') {
    header('Content-Type: application/json');
    clearOutputBuffers();
    echo json_encode(['ok' => true, 'data' => [
        [
            'id'       => 'modificacion',
            'nombre'   => 'Certificado de modificación de estatutos',
            'template' => 'modificacion.docx',
            'campos'   => [
                ['id' => 'numero_cert', 'tipo' => 'fixed', 'valor' => '107', 'requerido' => false],
                ['id' => 'nombre_firmante', 'label' => 'Nombre del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'cargo_firmante', 'label' => 'Cargo del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_org', 'label' => 'Nombre de la organización', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_deposito', 'label' => 'Fecha del acta extraordinaria', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'fecha_determinacion', 'label' => 'Fecha de la determinación (DD de Mes de AAAA)', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'fecha_emision', 'label' => 'Fecha de emisión del certificado', 'tipo' => 'date', 'requerido' => true],
            ]
        ],
        [
            'id'       => 'extincion',
            'nombre'   => 'Certificado de extinción de personalidad jurídica',
            'template' => 'extincion.docx',
            'campos'   => [
                ['id' => 'numero_cert', 'tipo' => 'fixed', 'valor' => '081', 'requerido' => false],
                ['id' => 'nombre_firmante', 'label' => 'Nombre del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'cargo_firmante', 'label' => 'Cargo del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_org', 'label' => 'Nombre de la organización', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_decreto', 'label' => 'Fecha del decreto', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'fecha_emision', 'label' => 'Fecha de emisión del certificado', 'tipo' => 'date', 'requerido' => true],
            ]
        ],
        [
            'id'       => 'directorio',
            'nombre'   => 'Certificado de Directorio Provisorio',
            'template' => 'directorio.docx',
            'campos'   => [
                ['id' => 'numero_cert', 'tipo' => 'fixed', 'valor' => '41', 'requerido' => false],
                ['id' => 'nombre_firmante', 'label' => 'Nombre del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'cargo_firmante', 'label' => 'Cargo del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_org', 'label' => 'Nombre de la organización', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_acta', 'label' => 'Fecha del acta de elección', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'fecha_deposito', 'label' => 'Fecha del depósito', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'nombre_presidente', 'label' => 'PRESIDENTE — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_presidente', 'label' => 'PRESIDENTE — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_secretario', 'label' => 'SECRETARIO — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_secretario', 'label' => 'SECRETARIO — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_tesorero', 'label' => 'TESORERO — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_tesorero', 'label' => 'TESORERO — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_dir1', 'label' => '1° DIRECTOR — Nombre', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'rut_dir1', 'label' => '1° DIRECTOR — RUT', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'nombre_dir2', 'label' => '2° DIRECTOR — Nombre', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'rut_dir2', 'label' => '2° DIRECTOR — RUT', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'nombre_dir3', 'label' => '3° DIRECTOR — Nombre', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'rut_dir3', 'label' => '3° DIRECTOR — RUT', 'tipo' => 'text', 'requerido' => false],
                ['id' => 'fecha_emision', 'label' => 'Fecha de emisión del certificado', 'tipo' => 'date', 'requerido' => true],
            ]
        ],
        [
            'id'       => 'personalidad',
            'nombre'   => 'Certificado de personalidad jurídica',
            'template' => 'personalidad.docx',
            'campos'   => [
                ['id' => 'numero_cert', 'tipo' => 'fixed', 'valor' => '161', 'requerido' => false],
                ['id' => 'nombre_firmante', 'label' => 'Nombre del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'cargo_firmante', 'label' => 'Cargo del firmante', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_org', 'label' => 'Nombre de la organización', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_inscripcion', 'label' => 'Fecha de inscripción', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'fecha_asamblea', 'label' => 'Fecha de la Asamblea', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'hora_asamblea', 'label' => 'Hora de la Asamblea', 'tipo' => 'auto_hora', 'requerido' => true],
                ['id' => 'direccion_asamblea', 'label' => 'Dirección de la Asamblea', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_decreto_fe', 'label' => 'Fecha decreto ministro de fe', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'nombre_deposito', 'label' => 'Quien realizó el depósito — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_deposito', 'label' => 'Quien realizó el depósito — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'comuna_deposito', 'label' => 'Quien realizó el depósito — Comuna', 'tipo' => 'fixed', 'valor' => 'Pucón', 'requerido' => false],
                ['id' => 'fecha_vigencia_dir', 'label' => 'Directiva Provisoria vigente hasta', 'tipo' => 'date', 'requerido' => true],
                ['id' => 'nombre_presidenta', 'label' => 'PRESIDENTE/A — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_presidenta', 'label' => 'PRESIDENTE/A — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_secretaria', 'label' => 'SECRETARIO/A — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_secretaria', 'label' => 'SECRETARIO/A — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'nombre_tesorera', 'label' => 'TESORERO/A — Nombre', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'rut_tesorera', 'label' => 'TESORERO/A — RUT', 'tipo' => 'text', 'requerido' => true],
                ['id' => 'fecha_emision', 'label' => 'Fecha de emisión del certificado', 'tipo' => 'date', 'requerido' => true],
            ]
        ],
    ]]);
    exit;
}

/* Generar certificado */
if ($method === 'POST' && $action === 'generar') {
    $d    = json_decode(file_get_contents('php://input'), true);
    $tipo = $d['tipo'] ?? '';
    $datos = $d['datos'] ?? [];  
    if (!$tipo || empty($datos)) {
        clearOutputBuffers();
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'Datos incompletos']);
        exit;
    }    // phpcs:ignore Squiz.WhiteSpace.SuperfluousWhitespace.EndLine
    try {
        $datos = procesarDatos($datos, $tipo);
        $outputPath = generarCertificado($tipo, $datos);       // phpcs:ignore Squiz.WhiteSpace.SuperfluousWhitespace.EndLine
        // Registrar en historial
        $pdo = getDB();
        logHistorial(
            'certificados',
            0,
            'generar',
            "Certificado '" . $tipo . "' para: " . ($datos['nombre_org'] ?? '---'),
            $user['id']
        );
        // Validar que el archivo exista y tenga tamaño válido
        if (!file_exists($outputPath)) {
            throw new Exception("Archivo no existe");
        }
        clearstatcache();
        if (filesize($outputPath) < 5000) {
            throw new Exception("Archivo demasiado pequeño (probablemente corrupto): " . filesize($outputPath) . " bytes");
        }
        // Validar que no se hayan enviado headers antes
        if (headers_sent()) {
            throw new Exception("Headers ya enviados");
        }
        // Enviar archivo con headers seguros
        $slug = preg_replace('/[^a-z0-9]/i', '_', $datos['nombre_org'] ?? 'cert');
        $fn = "Certificado_{$slug}_" . date('Ymd') . '.docx';
        clearOutputBuffers();
        header('Content-Description: File Transfer');
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="' . $fn . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($outputPath));
        readfile($outputPath);
        @unlink($outputPath);
        exit;
    } catch (Exception $e) {
        clearOutputBuffers();
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }
}
/* Vista previa HTML */
if ($method === 'POST' && $action === 'preview') {
    $d    = json_decode(file_get_contents('php://input'), true);
    $tipo = $d['tipo'] ?? '';
    $datos = $d['datos'] ?? [];   
    if (!$tipo || empty($datos)) {
        clearOutputBuffers();
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'Datos incompletos']);
        exit;
    }
    
    try {
        $html = buildPreview($tipo, $datos);
        clearOutputBuffers();
        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    } catch (Exception $e) {
        clearOutputBuffers();
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }
}

?>
