<?php
/**
 * Script para agregar tabla de subvenciones a la base de datos existente
 */

echo "🔧 Agregando tabla de subvenciones a la base de datos...\n";

require_once __DIR__ . '/../config/db.php';

try {
    $db = getDB();
    echo "✅ Conexión a SQLite establecida\n";
    
    // Crear tabla de subvenciones
    $sql = "CREATE TABLE IF NOT EXISTS subvenciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organizacion_id INTEGER NOT NULL,
        nombre_subvencion VARCHAR(200) NOT NULL,
        ano_postulacion INTEGER NOT NULL,
        estado ENUM('Postulada', 'Aprobada', 'Rechazada', 'En Evaluación') DEFAULT 'Postulada',
        monto_aprobado DECIMAL(15,2),
        fecha_resolucion DATE,
        observaciones TEXT,
        creado_por INTEGER,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    )";
    
    $db->exec($sql);
    echo "✅ Tabla 'subvenciones' creada exitosamente\n";
    
    // Verificar si la tabla existe y tiene datos
    $count = $db->query("SELECT COUNT(*) as count FROM subvenciones")->fetch()['count'];
    echo "📊 Registros existentes en subvenciones: {$count}\n";
    
    // Crear índices para mejor rendimiento
    $db->exec("CREATE INDEX IF NOT EXISTS idx_subvenciones_organizacion ON subvenciones(organizacion_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_subvenciones_ano ON subvenciones(ano_postulacion)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_subvenciones_estado ON subvenciones(estado)");
    echo "✅ Índices creados para mejor rendimiento\n";
    
    echo "\n🎉 Estructura de subvenciones agregada exitosamente!\n";
    echo "📋 Columnas disponibles:\n";
    echo "   • id - Identificador único\n";
    echo "   • organizacion_id - ID de la organización\n";
    echo "   • nombre_subvencion - Nombre de la subvención\n";
    echo "   • ano_postulacion - Año de postulación\n";
    echo "   • estado - Estado (Postulada, Aprobada, Rechazada, En Evaluación)\n";
    echo "   • monto_aprobado - Monto aprobado (si aplica)\n";
    echo "   • fecha_resolucion - Fecha de resolución\n";
    echo "   • observaciones - Observaciones adicionales\n";
    echo "   • creado_por - Usuario que creó el registro\n";
    echo "   • creado_en - Fecha de creación\n";
    echo "   • actualizado_en - Fecha de actualización\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🚀 Ahora puedes gestionar subvenciones en el sistema!\n";
?>
