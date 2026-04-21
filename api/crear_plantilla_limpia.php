<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;

/**
 * Crear plantilla de personalidad jurídica completamente nueva y limpia
 */

echo "Creando plantilla limpia para personalidad jurídica...\n";

$phpWord = new PhpWord();
$phpWord->setDefaultFontName('Times New Roman');
$phpWord->setDefaultFontSize(12);

$section = $phpWord->addSection([
    'marginTop' => 1440,
    'marginRight' => 1440,
    'marginBottom' => 1440,
    'marginLeft' => 1440
]);

// Encabezado - simple y limpio
$section->addText('MUNICIPALIDAD DE PUCON', ['size' => 18, 'bold' => true], ['alignment' => 'center']);
$section->addText('DIREC. DESAR COMUNITARIO', ['size' => 18, 'bold' => true, 'underline' => 'single'], ['alignment' => 'center']);
$section->addTextBreak(2);

// Título - placeholder simple
$section->addText('CERTIFICADO DE PERSONALIDAD JURIDICA N° ${numero_cert}-', ['size' => 24, 'bold' => true, 'underline' => 'single'], ['alignment' => 'center']);
$section->addTextBreak(2);

// Contenido principal - placeholders individuales y limpios
$section->addText('${nombre_firmante}, ${cargo_firmante} de la Municipalidad de Pucón, que suscribe, certifica que la Organización denominada "${nombre_org}", ha sido inscrita en el Registro Nacional de Personas Jurídicas bajo el N° 988, con fecha ${fecha_inscripcion}, según consta en Asamblea Constituyente realizada el día ${fecha_asamblea} a las ${hora_asamblea} hrs., en ${direccion_asamblea} de esta ciudad, conforme a lo dispuesto en la Ley N° 19.418, Decreto Exento N° 249 de fecha ${fecha_decreto_fe}, del Ministerio Secretaría General de Gobierno.', ['size' => 12], ['alignment' => 'both', 'spaceAfter' => 200]);

// Directiva - placeholders separados
$section->addText('Directiva Provisoria vigente hasta ${fecha_vigencia_dir}:', ['bold' => true], ['alignment' => 'left', 'spaceAfter' => 120]);
$section->addText('PRESIDENTE/A: ${nombre_presidenta}, RUT. ${rut_presidenta}', ['size' => 12], ['alignment' => 'left', 'spaceAfter' => 120]);
$section->addText('SECRETARIO/A: ${nombre_secretaria}, RUT. ${rut_secretaria}', ['size' => 12], ['alignment' => 'left', 'spaceAfter' => 120]);
$section->addText('TESORERO/A: ${nombre_tesorera}, RUT. ${rut_tesorera}', ['size' => 12], ['alignment' => 'left', 'spaceAfter' => 120]);

// Autorización
$section->addText('Se autoriza a ${nombre_deposito}, RUT. ${rut_deposito}, para que realice trámites de inscripción y obtención de personería jurídica ante el Servicio de Registro Civil e Identificación.', ['size' => 12], ['alignment' => 'both', 'spaceAfter' => 200]);

// Firma
$section->addTextBreak(2);
$section->addText('Dado en ${comuna_deposito}, a 04 de noviembre del año dos mil veinticinco.', ['size' => 12], ['alignment' => 'center', 'spaceAfter' => 200]);
$section->addText('GMP/dch.-', ['bold' => true], ['alignment' => 'center']);

// Guardar plantilla limpia
$outputDir = __DIR__ . '/../templates';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

$objWriter = IOFactory::createWriter($phpWord, 'Word2007');
$objWriter->save($outputDir . '/personalidad_template.docx');

echo "Plantilla limpia creada: " . $outputDir . '/personalidad_template.docx' . "\n";
echo "Placeholders usados:\n";
echo "- numero_cert\n";
echo "- nombre_firmante\n";
echo "- cargo_firmante\n";
echo "- nombre_org\n";
echo "- fecha_inscripcion\n";
echo "- fecha_asamblea\n";
echo "- hora_asamblea\n";
echo "- direccion_asamblea\n";
echo "- fecha_decreto_fe\n";
echo "- nombre_presidenta\n";
echo "- rut_presidenta\n";
echo "- nombre_secretaria\n";
echo "- rut_secretaria\n";
echo "- nombre_tesorera\n";
echo "- rut_tesorera\n";
echo "- nombre_deposito\n";
echo "- rut_deposito\n";
echo "- comuna_deposito\n";
echo "- fecha_vigencia_dir\n";
?>
