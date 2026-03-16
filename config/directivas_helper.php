<?php

/**
 * Valida datos básicos de una directiva.
 * Devuelve cadena vacía si es válida, o mensaje de error si no.
 */
function validateDirectiva(array $d): string {
    if (empty($d['organizacion_id'])) {
        return 'organizacion_id requerido.';
    }
    if (empty($d['fecha_inicio'])) {
        return 'Fecha de inicio requerida.';
    }
    if (empty($d['fecha_termino'])) {
        return 'Fecha de término requerida.';
    }
    return '';
}

/**
 * Valida datos de un cargo de directiva.
 */
function validateCargo(array $d): string {
    $cargosValidos = ['Presidente','Presidenta','Vicepresidente','Vicepresidenta',
        'Secretario','Secretaria','Tesorero','Tesorera',
        '1° Director','2° Director','3° Director','Suplente'];

    if (empty($d['directiva_id'])) {
        return 'directiva_id requerido.';
    }
    if (empty($d['cargo']) || !in_array($d['cargo'], $cargosValidos, true)) {
        return 'Cargo inválido.';
    }
    if (empty($d['nombre_titular'])) {
        return 'Nombre del titular requerido.';
    }
    return '';
}

