<?php
// Restauración ultra simple
header('Content-Type: text/html; charset=utf-8');

$id = $_GET['id'] ?? 0;
if (!$id) {
    echo "<h2>Error: ID no proporcionado</h2>";
    echo "<p><a href='javascript:history.back()'>Volver</a></p>";
    exit;
}

try {
    // Usar conexión MySQL del sistema
    require_once __DIR__ . '/../config/db.php';
    $pdo = getDB();
    
    // Restaurar directamente
    $stmt = $pdo->prepare("UPDATE directivos SET eliminada = 0, fecha_eliminacion = NULL, eliminado_por = NULL WHERE id = ?");
    $result = $stmt->execute([$id]);
    
    if ($result) {
        echo "<h2>Directivo restaurado correctamente</h2>";
        echo "<script>
            alert('Directivo restaurado correctamente');
            window.location.href = '/sistema-municipal/pages/dashboard.html#papelera';
        </script>";
    } else {
        echo "<h2>Error al restaurar</h2>";
        echo "<p><a href='javascript:history.back()'>Volver</a></p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Error: " . htmlspecialchars($e->getMessage()) . "</h2>";
    echo "<p><a href='javascript:history.back()'>Volver</a></p>";
}
?>
