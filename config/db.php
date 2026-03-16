<?php

require_once __DIR__ . '/config.php';

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'sqlite:' . __DIR__ . '/../database/munidb_v2.sqlite'; // Ruta a la base de datos SQLite
        try {
            $pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error de conexión a la base de datos SQLite.']);
            exit;
        }
    }
    return $pdo;
}

/* Registra una entrada en el historial de auditoría */
function logHistorial(string $tabla, int $registroId, string $accion, string $desc, ?int $userId): void {
    try {
        $pdo = getDB();
        $pdo->prepare("INSERT INTO historial (tabla,registro_id,accion,descripcion,usuario_id) VALUES (?,?,?,?,?)")
            ->execute([$tabla, $registroId, $accion, $desc, $userId]);
    } catch (Throwable $e) { /* no interrumpir flujo por error de log */ }
}