<?php

/**
 * Sistema Municipal de Organizaciones
 * 
 * ARCHIVO: certificados_robusto.php
 * 
 * DESCRIPCIÓN:
 * Clase principal para la generación de certificados municipales.
 * Maneja la creación de certificados PDF/Word a partir de plantillas DOCX.
 * 
 * FUNCIONALIDADES:
 * - Generación de certificados de personalidad jurídica
 * - Certificados de modificación de estatutos  
 * - Certificados de extinción de personalidad
 * - Certificados de directorio de organizaciones
 * 
 * TECNOLOGÍA:
 * - PhpOffice\PhpWord para manipulación de plantillas DOCX
 * - Sistema de templates dinámicos
 * - Manejo robusto de errores y logging
 * 
 * USO:
 * Instanciar la clase y llamar al método generar()
 * con el tipo de certificado y datos correspondientes.
 * 
 * @author Sistema Municipal
 * @version 1.0
 * @since 2026
 */

namespace SistemaMunicipal;

use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;

class CertificadosRobusto
{
    private $templates = [
        'personalidad' => 'personalidad_template.docx',
        'modificacion' => 'modificacion.docx',
        'extincion' => 'extincion.docx',
        'directorio' => 'directorio.docx',
    ];

    public function generar($tipo, $datos)
    {
        error_log("DEBUG: Iniciando generación de certificado tipo: $tipo");
        
        if (!isset($this->templates[$tipo])) {
            throw new Exception("Tipo de certificado no valido: {$tipo}");
        }

        $templatePath = __DIR__ . '/../templates/' . $this->templates[$tipo];
        error_log("DEBUG: Ruta plantilla: $templatePath");
        if (!file_exists($templatePath)) {
            throw new Exception("Plantilla no encontrada: {$templatePath}");
        }

        error_log("DEBUG: Creando TemplateProcessor");
        Settings::setOutputEscapingEnabled(true);
        $template = new TemplateProcessor($templatePath);

        error_log("DEBUG: Obteniendo variables de plantilla");
        $variables = $template->getVariables();
        error_log("DEBUG: Variables encontradas: " . implode(', ', $variables));
        
        foreach ($variables as $var) {
            if (!array_key_exists($var, $datos)) {
                throw new Exception("Falta variable en datos: {$var}");
            }
        }

        error_log("DEBUG: Procesando " . count($datos) . " datos");
        foreach ($datos as $key => $value) {
            $processedValue = $this->procesarValor($key, $value);
            $template->setValue($key, $processedValue);
        }

        error_log("DEBUG: Guardando documento");
        return $this->guardarDocumento($template, $tipo);
    }

    private function procesarValor($key, $value)
    {
        $value = $value ?? '';
        if (!is_string($value)) {
            $value = (string) $value;
        }

        if (strlen($value) > 50 && strpos($value, "\n") !== false) {
            $value = str_replace("\n", ' ', $value);
        }

        return $this->limpiarCaracteres($value);
    }

    private function limpiarCaracteres($value)
    {
        if (!is_string($value)) {
            return (string) $value;
        }

        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = preg_replace('/[^\P{C}\t\n]/u', '', $value) ?? $value;

        if (function_exists('mb_check_encoding') && !mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }

        return $value;
    }

    private function guardarDocumento($template, $tipo)
    {
        error_log("DEBUG: Iniciando guardado de documento");
        
        $outputDir = __DIR__ . '/../output';
        error_log("DEBUG: Directorio de salida: $outputDir");
        
        if (!is_dir($outputDir)) {
            error_log("DEBUG: Creando directorio de salida");
            mkdir($outputDir, 0755, true);
        }

        $outputFile = $outputDir . '/certificado_' . $tipo . '_' . time() . '_' . uniqid() . '.docx';
        error_log("DEBUG: Archivo de salida: $outputFile");
        
        error_log("DEBUG: Guardando template con saveAs");
        $template->saveAs($outputFile);
        
        error_log("DEBUG: Verificando archivo guardado");
        if (!file_exists($outputFile)) {
            throw new Exception("No se pudo guardar el archivo en: $outputFile");
        }
        
        $fileSize = filesize($outputFile);
        error_log("DEBUG: Tamaño del archivo: $fileSize bytes");

        // Desactivado temporalmente - setImageValue() falla porque la plantilla no tiene placeholder ${logo}
        /*
        $logoPath = __DIR__ . '/../assets/logo.png';
        if (file_exists($logoPath)) {
            error_log("DEBUG: Insertando logo con setImageValue desde: $logoPath");
            $template->setImageValue('logo', [
                'path' => $logoPath,
                'width' => 120,
                'height' => 120,
                'ratio' => true
            ]);
            error_log("DEBUG: Logo insertado exitosamente con setImageValue");
        } else {
            error_log("DEBUG: No se encontró logo para insertar en: $logoPath");
            $template->setValue('logo', '');
        }
        */

        if ($fileSize < 2000) {
            throw new Exception("DOCX generado invalido (demasiado pequeño): $fileSize bytes");
        }

        error_log("DEBUG: Documento guardado exitosamente");
        return $outputFile;
    }

    private function obtenerLogoPath()
    {
        $paths = [
            __DIR__ . '/../logo.png',
            __DIR__ . '/../uploads/logo.png',
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }
}
