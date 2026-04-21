<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Instalación de Base de Datos MySQL</h1>";

require_once __DIR__ . '/config/config.php';

try {
    // Conectar sin seleccionar base de datos
    $dsn = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 30,
    ]);
    
    // Crear base de datos
    echo "<h2>1. Creando base de datos...</h2>";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Base de datos creada/existente<br>";
    
    // Seleccionar base de datos
    $pdo->exec("USE " . DB_NAME);
    
    // Crear tabla usuarios mínima
    echo "<h2>2. Creando tabla usuarios...</h2>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'funcionario',
        activo TINYINT(1) DEFAULT 1,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
    ) ENGINE=InnoDB");
    echo "Tabla usuarios creada<br>";
    
    // Insertar usuario admin
    echo "<h2>3. Creando usuario admin...</h2>";
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    
    // Verificar si ya existe admin
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = 'admin'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $stmt = $pdo->prepare("INSERT INTO usuarios (username, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin', 'admin@sistema.local', $hash, 'administrador', 1]);
        echo "Usuario admin creado con contraseña: admin123<br>";
    } else {
        echo "Usuario admin ya existe, actualizando contraseña...<br>";
        $stmt = $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE username = 'admin'");
        $stmt->execute([$hash]);
        echo "Contraseña actualizada a: admin123<br>";
    }
    
    echo "<h2 style='color:green'>Instalación completada</h2>";
    echo "<p><a href='index.html'>Ir al login</a></p>";
    echo "<p>Usuario: <strong>admin</strong><br>Contraseña: <strong>admin123</strong></p>";
    
} catch (PDOException $e) {
    echo "<h2 style='color:red'>Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
