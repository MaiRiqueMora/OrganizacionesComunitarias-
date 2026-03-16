<?php

require_once __DIR__ . '/config/db.php';

try {
    $pdo = getDB();
    echo json_encode(['ok' => true, 'message' => 'Conexión exitosa a la base de datos.']);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}