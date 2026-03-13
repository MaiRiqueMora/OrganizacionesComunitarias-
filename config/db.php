<?php
require_once __DIR__ . '/config.php';

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO('sqlite:' . DB_PATH, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA journal_mode = WAL');
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok'=>false,'error'=>'Error de conexión a la base de datos.']);
            exit;
        }
    }
    return $pdo;
}

function logHistorial(string $tabla, int $registroId, string $accion, string $desc, ?int $userId): void {
    try {
        $pdo = getDB();
        $pdo->prepare("INSERT INTO historial (tabla,registro_id,accion,descripcion,usuario_id) VALUES (?,?,?,?,?)")
            ->execute([$tabla, $registroId, $accion, $desc, $userId]);
    } catch (Throwable $e) { }
}
