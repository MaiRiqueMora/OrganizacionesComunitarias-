<?php

require_once __DIR__ . '/config.php';

/**
 * Sistema Municipal de Organizaciones
 *
 * ARCHIVO: db.php
 * 
 * DESCRIPCIÓN:
 * Funciones de base de datos para el sistema municipal.
 * Centraliza la conexión y operaciones comunes con MySQL/MariaDB.
 * 
 * FUNCIONES PRINCIPALES:
 * - getDB(): Obtiene conexión a la base de datos (singleton)
 * - getMySQLConnection(): Crea nueva conexión MySQL/MariaDB
 * - logHistorial(): Registra auditoría de cambios
 * 
 * DEPENDENCIAS:
 * - config.php: Define constantes DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET
 * 
 * @author Sistema Municipal
 * @version 2.0 (MySQL)
 * @since 2026
 */

/**
 * Obtiene conexión a la base de datos MySQL/MariaDB
 * 
 * Implementa patrón singleton para mantener una única conexión
 * durante toda la ejecución del script. Configura el modo SQL
 * estricto para mayor seguridad y consistencia.
 * 
 * @return PDO Conexión a la base de datos
 * @throws PDOException Si no puede conectar
 */
function getDB(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            // Cargar configuración
            require_once __DIR__ . '/config.php';
            
            // Usar conexión MySQL
            $pdo = getMySQLConnection();
            
            // Configuración adicional para MySQL - Modo estricto
            $pdo->exec("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error de conexión a la base de datos MySQL.']);
            exit;
        }
    }
    return $pdo;
}

/**
 * Crea nueva conexión a MySQL/MariaDB
 * 
 * Función interna que establece la conexión con el servidor
 * MySQL/MariaDB usando las credenciales definidas en config.php.
 * Configura PDO para seguridad y rendimiento óptimos.
 * 
 * @return PDO Nueva conexión a MySQL/MariaDB
 * @throws PDOException Si las credenciales son incorrectas
 */
function getMySQLConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            // Cargar configuración
            require_once __DIR__ . '/config.php';

            // Construir DSN de conexión MySQL/MariaDB
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

            // Crear conexión con opciones optimizadas para evitar "server has gone away"
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,    // Excepciones en errores
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,          // Arrays asociativos
                PDO::ATTR_EMULATE_PREPARES   => false,                      // Preparados reales
                PDO::ATTR_TIMEOUT            => 30,                        // Timeout de conexión 30s
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci, SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
                PDO::MYSQL_ATTR_COMPRESS     => true,                      // Compresión para mejor rendimiento
                PDO::MYSQL_ATTR_FOUND_ROWS   => true,                      // Devolver filas encontradas, no afectadas
            ]);

            // Prueba rápida para verificar que la conexión está viva
            $pdo->query('SELECT 1');

        } catch (PDOException $e) {
            throw new PDOException('Error conectando a MySQL: ' . $e->getMessage());
        }
    }
    return $pdo;
}

/**
 * Registra entrada en el historial de auditoría
 * 
 * Función crítica para trazabilidad de cambios en el sistema.
 * Registra automáticamente quién modificó qué, cuándo y cómo.
 * No interrumpe el flujo principal si falla el registro.
 * 
 * @param string $tabla Nombre de la tabla afectada
 * @param int $registroId ID del registro modificado
 * @param string $accion Tipo de acción (insertar, actualizar, eliminar)
 * @param string $desc Descripción detallada del cambio
 * @param int|null $userId ID del usuario que realiza la acción
 * @return void
 */
function logHistorial(string $tabla, int $registroId, string $accion, string $desc, ?int $userId): void
{
    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("INSERT INTO historial (tabla,registro_id,accion,descripcion,usuario_id) VALUES (?,?,?,?,?)");
        $stmt->execute([$tabla, $registroId, $accion, $desc, $userId]);
    } catch (Throwable $e) {
        // Silencioso: no interrumpir flujo principal por errores de auditoría
        error_log("Error en auditoría: " . $e->getMessage());
    }
}

?>
