<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/db.php';

try {
    $pdo = getDB();
    
    echo "<h1>Verificación de eliminación de directivos</h1>";
    
    // Verificar todos los directivos
    $stmt = $pdo->query("SELECT id, nombre, eliminada, fecha_eliminacion, eliminado_por FROM directivos ORDER BY id DESC LIMIT 10");
    $directivos = $stmt->fetchAll();
    
    echo "<h2>Últimos 10 directivos:</h2>";
    echo "<table border='1'>";
    echo "<tr><th>ID</th><th>Nombre</th><th>Eliminada</th><th>Fecha Eliminación</th><th>Eliminado Por</th></tr>";
    
    foreach ($directivos as $directivo) {
        echo "<tr>";
        echo "<td>{$directivo['id']}</td>";
        echo "<td>" . htmlspecialchars($directivo['nombre']) . "</td>";
        echo "<td>{$directivo['eliminada']}</td>";
        echo "<td>" . ($directivo['fecha_eliminacion'] ?? 'NULL') . "</td>";
        echo "<td>" . ($directivo['eliminado_por'] ?? 'NULL') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Contar eliminados
    $countEliminados = $pdo->query("SELECT COUNT(*) as total FROM directivos WHERE eliminada = 1")->fetch()['total'];
    echo "<h3>Directivos eliminados: $countEliminados</h3>";
    
    // Verificar si hay un directivo eliminado recientemente
    if ($countEliminados > 0) {
        $stmt = $pdo->query("SELECT * FROM directivos WHERE eliminada = 1 ORDER BY fecha_eliminacion DESC LIMIT 1");
        $eliminado = $stmt->fetch();
        
        echo "<h3>Último directivo eliminado:</h3>";
        echo "<p>ID: {$eliminado['id']}</p>";
        echo "<p>Nombre: " . htmlspecialchars($eliminado['nombre']) . "</p>";
        echo "<p>Fecha eliminación: {$eliminado['fecha_eliminacion']}</p>";
        echo "<p>Eliminado por: {$eliminado['eliminado_por']}</p>";
    } else {
        echo "<h3>No hay directivos eliminados</h3>";
        echo "<p>Esto significa que el proceso de eliminación no está funcionando correctamente.</p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Error:</h2>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
