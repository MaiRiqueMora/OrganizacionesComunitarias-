<?php

/**
 * Valida los datos básicos de una organización.
 * Devuelve cadena vacía si todo está correcto, o un mensaje de error en caso contrario.
 */
function validateOrg(array $d): string {
    if (empty($d['nombre']))   return 'El nombre es requerido.';
    if (empty($d['rut']))      return 'El RUT es requerido.';
    if (empty($d['direccion'])) return 'La dirección es requerida.';

    $estados = ['Activa','Inactiva','Suspendida'];
    if (!empty($d['estado']) && !in_array($d['estado'], $estados, true)) {
        return 'Estado inválido.';
    }

    return '';
}

