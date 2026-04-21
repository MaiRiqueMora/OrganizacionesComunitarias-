<?php
/**
 * reset_admin_password.php - Resetear contraseña de admin
 */
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

echo "<style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .message { padding: 20px; margin: 10px 0; border-radius: 5px; }
    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; }
</style>";

try {
    // Usar conexión MySQL del sistema
    require_once __DIR__ . '/../config/db.php';
    $pdo = getDB();

    echo "<h2>Resetear Contraseña de Admin</h2>";

    // Verificar si admin existe
    $stmt = $pdo->prepare("SELECT id, username, email FROM usuarios WHERE username = 'admin'");
    $stmt->execute();
    $user = $stmt->fetch();

    if (!$user) {
        // Crear usuario admin
        echo "<div class='message error'>✗ Usuario admin no existe. Creándolo...</div>";
        
        $new_password = 'admin123';
        $hash = password_hash($new_password, PASSWORD_BCRYPT);
        
        $pdo->prepare("
            INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        ")->execute(['admin', 'admin@municipalidad.cl', $hash, 'Administrador Sistema', 'admin']);
        
        echo "<div class='message success'>✓ Usuario admin creado</div>";
    } else {
        // Actualizar contraseña
        echo "<div class='message success'>✓ Usuario admin encontrado<br>";
        echo "  ID: " . $user['id'] . "<br>";
        echo "  Username: " . $user['username'] . "<br>";
        echo "  Email: " . $user['email'] . "</div>";
        
        $new_password = 'admin123';
        $hash = password_hash($new_password, PASSWORD_BCRYPT);
        
        $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE id = ?")
            ->execute([$hash, $user['id']]);
        
        echo "<div class='message success'>✓ Contraseña actualizada</div>";
    }

    // Verificar que funciona
    echo "<h3>Verificando...</h3>";
    $stmt = $pdo->prepare("SELECT password_hash FROM usuarios WHERE username = 'admin'");
    $stmt->execute();
    $admin = $stmt->fetch();
    
    $test = password_verify('admin123', $admin['password_hash']);
    if ($test) {
        echo "<div class='message success'>✓✓✓ ¡Contraseña verificada correctamente!</div>";
    } else {
        echo "<div class='message error'>✗ La contraseña aún no funciona</div>";
    }

    echo "<br><div class='message success'>";
    echo "<h4>Credenciales:</h4>";
    echo "Usuario: <code>admin</code><br>";
    echo "Contraseña: <code>admin123</code><br>";
    echo "<br><a href='index.html'>Ir al login</a>";
    echo "</div>";

} catch (PDOException $e) {
    echo "<div class='message error'>✗ Error: " . $e->getMessage() . "</div>";
}
?>
