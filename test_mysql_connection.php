<?php
require_once __DIR__ . '/config/bootstrap.php';
require_once __DIR__ . '/config/db.php';

echo "=== Diagnóstico de Conexión MySQL ===\n\n";

try {
    $pdo = getDB();
    echo "1. Conexión inicial: EXITOSA\n";
    
    // Verificar configuración de timeouts
    $stmt = $pdo->query("SHOW VARIABLES LIKE 'wait_timeout'");
    $result = $stmt->fetch();
    echo "2. wait_timeout: " . $result['Value'] . " segundos\n";
    
    $stmt = $pdo->query("SHOW VARIABLES LIKE 'interactive_timeout'");
    $result = $stmt->fetch();
    echo "3. interactive_timeout: " . $result['Value'] . " segundos\n";
    
    // Verificar estado del servidor
    $stmt = $pdo->query("SHOW STATUS LIKE 'Connections'");
    $result = $stmt->fetch();
    echo "4. Conexiones totales: " . $result['Value'] . "\n";
    
    $stmt = $pdo->query("SHOW STATUS LIKE 'Threads_connected'");
    $result = $stmt->fetch();
    echo "5. Conexiones activas: " . $result['Value'] . "\n";
    
    // Probar consulta simple
    $stmt = $pdo->query("SELECT 1 as test");
    $result = $stmt->fetch();
    echo "6. Prueba de consulta: " . ($result['test'] == 1 ? 'EXITOSA' : 'FALLÓ') . "\n";
    
    // Esperar 5 segundos y probar de nuevo
    echo "\n7. Esperando 5 segundos...\n";
    sleep(5);
    
    try {
        $stmt = $pdo->query("SELECT 2 as test");
        $result = $stmt->fetch();
        echo "8. Prueba después de espera: " . ($result['test'] == 2 ? 'EXITOSA' : 'FALLÓ') . "\n";
    } catch (PDOException $e) {
        echo "8. Error después de espera: " . $e->getMessage() . "\n";
    }
    
} catch (PDOException $e) {
    echo "ERROR DE CONEXIÓN: " . $e->getMessage() . "\n";
    echo "Código de error: " . $e->getCode() . "\n";
}

echo "\n=== Recomendaciones ===\n";
echo "Si wait_timeout es bajo (<300), aumentarlo en my.cnf:\n";
echo "[mysqld]\n";
echo "wait_timeout = 28800\n";
echo "interactive_timeout = 28800\n";
echo "max_allowed_packet = 64M\n";
?>
