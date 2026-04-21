<?php

require_once __DIR__ . '/certificados_robusto.php';

/**
 * Clear all output buffers
 */
function clearOutputBuffers()
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
}

/**
 * Generar certificado usando sistema robusto unificado
 */
function generarCertificado($tipo, $datos)
{
    $generator = new SistemaMunicipal\CertificadosRobusto();
    return $generator->generar($tipo, $datos);
}

/**
 * Procesar datos para el certificado
 */
function procesarDatos($datos, $tipo)
{
    $procesados = [];

    // Procesar campos comunes
    foreach ($datos as $key => $value) {
        if (strpos($key, 'fecha_') === 0) {
            // Formatear fechas
            $procesados[$key] = formatearFecha($value);
        } else {
            $procesados[$key] = $value;
        }
    }

    // Procesar campos específicos según tipo
    switch ($tipo) {
        case 'directorio':
            $procesados = procesarDirectorio($procesados);
            break;
        case 'personalidad':
            $procesados = procesarPersonalidad($procesados);
            break;
    }

    return $procesados;
}

/**
 * Procesar datos para certificado de directorio
 */
function procesarDirectorio($datos)
{
    $cargos = [
        'presidente' => ['nombre' => 'nombre_presidente', 'rut' => 'rut_presidente'],
        'secretario' => ['nombre' => 'nombre_secretario', 'rut' => 'rut_secretario'],
        'tesorero' => ['nombre' => 'nombre_tesorero', 'rut' => 'rut_tesorero'],
        'director1' => ['nombre' => 'nombre_dir1', 'rut' => 'rut_dir1'],
        'director2' => ['nombre' => 'nombre_dir2', 'rut' => 'rut_dir2'],
        'director3' => ['nombre' => 'nombre_dir3', 'rut' => 'rut_dir3'],
    ];

    foreach ($cargos as $cargo => $campos) {
        $nombre = $datos[$campos['nombre']] ?? '';
        $rut = $datos[$campos['rut']] ?? '';

        if (!empty($nombre) || !empty($rut)) {
            $datos[$cargo . '_texto'] = $nombre . ', RUT. ' . $rut;
        } else {
            $datos[$cargo . '_texto'] = '';
        }
    }

    return $datos;
}

/**
 * Procesar datos para certificado de personalidad jurídica
 */
function procesarPersonalidad($datos)
{
    // No procesar nada, dejar los datos como vienen
    // El template usa las variables individuales, no combinadas con _texto
    return $datos;
}

/**
 * Formatear fecha a formato legible
 */
function formatearFecha($fecha)
{
    if (empty($fecha)) {
        return '';
    }

    $timestamp = strtotime($fecha);
    if (!$timestamp) {
        return $fecha;
    }

    $meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
              'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    $dia = date('d', $timestamp);
    $mes = $meses[date('n', $timestamp) - 1];
    $anio = date('Y', $timestamp);

    return "$dia de $mes de $anio";
}

/**
 * Generar vista previa HTML
 */
function buildPreview($tipo, $datos)
{
    $tipos = [
        'modificacion' => 'Modificación de estatutos',
        'extincion' => 'Extinción de personalidad jurídica',
        'directorio' => 'Directorio Provisorio',
        'personalidad' => 'Personalidad jurídica'
    ];

    $titulo = $tipos[$tipo] ?? 'Certificado';
    $json = json_encode($datos, JSON_UNESCAPED_UNICODE);

    $body = '<div style="font-family: Times New Roman; padding: 40px; line-height: 1.6;">';
    $body .= '<h2 style="text-align: center;">' . $titulo . '</h2>';
    $body .= '<p><strong>Organización:</strong> ' . htmlspecialchars($datos['nombre_org'] ?? '') . '</p>';
    $body .= '<p><strong>Firmante:</strong> ' . htmlspecialchars($datos['nombre_firmante'] ?? '') . '</p>';
    $body .= '<p><strong>Cargo:</strong> ' . htmlspecialchars($datos['cargo_firmante'] ?? '') . '</p>';
    
    if (!empty($datos['fecha_emision'])) {
        $body .= '<p><strong>Fecha de emisión:</strong> ' . formatearFecha($datos['fecha_emision']) . '</p>';
    }
    
    $body .= '</div>';
    
    return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Vista previa - {$titulo}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .no-print { position: fixed; top: 10px; right: 10px; }
        .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="btn btn-primary" onclick="descargar()">Descargar .docx</button>
        <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
    </div>
    {$body}
    <script>
        const _d = {$json};
        const _t = '{$tipo}';
        
        async function descargar() {
            const btn = document.querySelector('.btn-primary');
            btn.disabled = true;
            btn.textContent = 'Generando';
            
            try {
                const base = (window.opener && window.opener._certApiBase) || location.href.replace(/\/pages\/.*/, '') + '/api/certificados.php';
                const response = await fetch(base + '?action=generar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo: _t, datos: _d })
                });

                const contentType = response.headers.get('content-type') || '';
                if (!response.ok || contentType.includes('application/json')) {
                    const txt = await response.text();
                    let msg = 'Error al generar certificado';
                    try { msg = JSON.parse(txt).error || msg; } catch (e) {}
                    throw new Error(msg);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Certificado_' + (_d.nombre_org || 'cert').replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.docx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Descargar .docx';
            }
        }
    </script>
</body>
</html>
HTML;
}
