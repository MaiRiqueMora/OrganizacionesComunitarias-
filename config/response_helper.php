<?php

/**
 * Envía una respuesta JSON estándar y termina la ejecución.
 */
function json_out(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

