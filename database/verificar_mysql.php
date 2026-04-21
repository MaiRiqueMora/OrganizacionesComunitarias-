<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Verificación de MySQL</h1>";

// 1. Verificar si el puerto 3306 está abierto
echo "<h2>1. Verificando puerto 3306...</h2>";
$connection = @fsockopen('127.0.0.1', 3306, $errno, $errstr, 2);
if ($connection) {
    echo "Puerto 3306 está ABIERTO (MySQL está corriendo)<br>";
    fclose($connection);
} else {
    echo "<span style='color:red'>Puerto 3306 está CERRADO</span><br>";
    echo "Error: $errstr (código $errno)<br>";
}

// 2. Intentar conexión PDO
echo "<h2>2. Intentando conexión PDO...</h2>";
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    echo "<span style='color:green'>Conexión PDO exitosa!</span><br>";
    $version = $pdo->query('SELECT VERSION()')->fetchColumn();
    echo "Versión MySQL: $version<br>";
} catch (PDOException $e) {
    echo "<span style='color:red'>Error PDO: " . $e->getMessage() . "</span><br>";
}

// 3. Soluciones
echo "<h2>3. Soluciones</h2>";
echo "<ol>";
echo "<li><strong>Verificar XAMPP Control Panel:</strong><br>";
echo "Abre XAMPP Control Panel y verifica que el servicio <strong>MySQL</strong> esté corriendo (en verde)<br>";
echo "Si no está corriendo, haz clic en 'Start' al lado de MySQL</li>";
echo "<br><br>";
echo "<li><strong>Cambiar a localhost en lugar de 127.0.0.1:</strong><br>";
echo "Algunas configuraciones de MySQL solo aceptan 'localhost' en lugar de '127.0.0.1'</li>";
echo "<br><br>";
echo "<li><strong>Verificar puerto de MySQL:</strong><br>";
echo "En XAMPP, MySQL puede estar usando un puerto diferente (3307, 3308)<br>";
echo "Revisa el puerto en XAMPP Control Panel -> MySQL -> Config</li>";
echo "<br><br>";
echo "<li><strong>Si usas MariaDB separado:</strong><br>";
echo "Verifica que el servicio esté iniciado en los Servicios de Windows</li>";
echo "</ol>";

echo "<h2>4. Prueba alternativa</h2>";
echo "<p>Intenta cambiar en config.php:</p>";
echo "<code>define('DB_HOST', '127.0.0.1');</code> en lugar de 'localhost'<br>";
echo "O si MySQL usa otro puerto:<br>";
echo "<code>define('DB_HOST', '127.0.0.1:3307');</code>";
