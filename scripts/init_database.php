<?php
/**
 * Script de inicialización de base de datos SQLite
 * Crea la base de datos y todas las tablas necesarias
 */

echo "🚀 Inicializando Base de Datos del Sistema Municipal...\n";

require_once __DIR__ . '/../config/db.php';

try {
    $db = getDB();
    echo "✅ Conexión a SQLite establecida\n";
    
    // Crear tablas del sistema
    $tables = [
        // Tabla de usuarios
        "CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            rol ENUM('administrador', 'funcionario', 'consulta') DEFAULT 'consulta',
            nombre_completo VARCHAR(200) NOT NULL,
            email VARCHAR(100),
            activo BOOLEAN DEFAULT 1,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Tabla de organizaciones
        "CREATE TABLE IF NOT EXISTS organizaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre VARCHAR(200) NOT NULL,
            rut VARCHAR(20) UNIQUE NOT NULL,
            tipo_id INTEGER,
            direccion VARCHAR(300),
            telefono VARCHAR(50),
            email VARCHAR(100),
            estado ENUM('Activa', 'Inactiva', 'Suspendida') DEFAULT 'Activa',
            fecha_constitucion DATE,
            fecha_directiva DATE,
            dias_vence INTEGER,
            estado_directiva ENUM('Vigente', 'Por Vencer', 'Vencida') DEFAULT 'Vigente',
            observaciones TEXT,
            creado_por INTEGER,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tipo_id) REFERENCES tipos_organizacion(id),
            FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        )",
        
        // Tabla de tipos de organización
        "CREATE TABLE IF NOT EXISTS tipos_organizacion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre VARCHAR(100) UNIQUE NOT NULL,
            descripcion TEXT,
            activo BOOLEAN DEFAULT 1,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        // Tabla de directivas
        "CREATE TABLE IF NOT EXISTS directivas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacion_id INTEGER NOT NULL,
            nombre VARCHAR(200) NOT NULL,
            cargo VARCHAR(100) NOT NULL,
            rut VARCHAR(20) NOT NULL,
            email VARCHAR(100),
            telefono VARCHAR(50),
            inicio_periodo DATE,
            fin_periodo DATE,
            activo BOOLEAN DEFAULT 1,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE
        )",
        
        // Tabla de documentos
        "CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacion_id INTEGER NOT NULL,
            nombre_archivo VARCHAR(255) NOT NULL,
            tipo_archivo VARCHAR(100),
            tamaño INTEGER,
            ruta VARCHAR(500) NOT NULL,
            descripcion TEXT,
            subido_por INTEGER,
            subido_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (subido_por) REFERENCES usuarios(id)
        )",
        
        // Tabla de historial (auditoría)
        "CREATE TABLE IF NOT EXISTS historial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tabla VARCHAR(50) NOT NULL,
            registro_id INTEGER NOT NULL,
            accion VARCHAR(50) NOT NULL,
            descripcion TEXT,
            usuario_id INTEGER,
            ip_address VARCHAR(45),
            fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )",
        
        // Tabla de accesos (login exitoso)
        "CREATE TABLE IF NOT EXISTS accesos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            username VARCHAR(50) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            navegador VARCHAR(100),
            sistema_operativo VARCHAR(100),
            dispositivo VARCHAR(50),
            fecha_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_logout TIMESTAMP NULL,
            duracion_sesion INTEGER NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )",
        
        // Tabla de accesos fallidos
        "CREATE TABLE IF NOT EXISTS accesos_fallidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            navegador VARCHAR(100),
            sistema_operativo VARCHAR(100),
            dispositivo VARCHAR(50),
            motivo VARCHAR(200) NOT NULL,
            fecha_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_username_fecha (username, fecha_intento)
        )",
        
        // Tabla de alertas
        "CREATE TABLE IF NOT EXISTS alertas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo VARCHAR(50) NOT NULL,
            titulo VARCHAR(200) NOT NULL,
            mensaje TEXT NOT NULL,
            leida BOOLEAN DEFAULT 0,
            usuario_id INTEGER NULL,
            organizacion_id INTEGER NULL,
            creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id)
        )"
    ];
    
    // Ejecutar creación de tablas
    foreach ($tables as $sql) {
        try {
            $db->exec($sql);
            echo "✅ Tabla creada: " . substr($sql, 13, 30) . "...\n";
        } catch (Exception $e) {
            echo "⚠️  Error creando tabla: " . $e->getMessage() . "\n";
        }
    }
    
    // Insertar datos iniciales
    echo "\n📋 Insertando datos iniciales...\n";
    
    // Tipos de organización
    $tipos = [
        ['nombre' => 'Junta de Vecinos', 'descripcion' => 'Organizaciones territoriales de vecinos'],
        ['nombre' => 'Comité de Vivienda', 'descripcion' => 'Grupos enfocados en soluciones habitacionales'],
        ['nombre' => 'Asociación Cultural', 'descripcion' => 'Grupos con fines culturales y artísticos'],
        ['nombre' => 'Club Deportivo', 'descripcion' => 'Organizaciones deportivas y recreativas'],
        ['nombre' => 'Centro de Estudiantes', 'descripcion' => 'Organizaciones estudiantiles'],
        ['nombre' => 'Otra', 'descripcion' => 'Otros tipos de organizaciones']
    ];
    
    foreach ($tipos as $tipo) {
        $stmt = $db->prepare("INSERT OR IGNORE INTO tipos_organizacion (nombre, descripcion) VALUES (?, ?)");
        $stmt->execute([$tipo['nombre'], $tipo['descripcion']]);
    }
    echo "✅ Tipos de organización insertados\n";
    
    // Usuario administrador por defecto
    $adminExists = $db->query("SELECT COUNT(*) as count FROM usuarios WHERE username = 'admin'")->fetch()['count'];
    
    if ($adminExists == 0) {
        $passwordHash = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO usuarios (username, password_hash, rol, nombre_completo, email) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin', $passwordHash, 'administrador', 'Administrador del Sistema', 'admin@municipalidad.cl']);
        echo "✅ Usuario administrador creado (usuario: admin, contraseña: admin123)\n";
    } else {
        echo "ℹ️  Usuario administrador ya existe\n";
    }
    
    // Crear directorios necesarios
    $directories = [
        __DIR__ . '/../uploads',
        __DIR__ . '/../backups',
        __DIR__ . '/../logs'
    ];
    
    foreach ($directories as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
            echo "✅ Directorio creado: " . basename($dir) . "\n";
        }
    }
    
    // Crear archivo .htaccess para uploads
    $htaccess = __DIR__ . '/../uploads/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "# Denegar acceso directo\nOrder deny,allow\nDeny from all\n");
        echo "✅ Archivo .htaccess creado en uploads/\n";
    }
    
    echo "\n🎉 ¡Base de datos inicializada exitosamente!\n";
    echo "\n📝 Resumen:\n";
    echo "   • Base de datos: SQLite (munidb_v2.sqlite)\n";
    echo "   • Tablas creadas: " . count($tables) . "\n";
    echo "   • Usuario admin: admin / admin123\n";
    echo "   • Directorios: uploads/, backups/, logs/\n";
    echo "\n⚠️  Recuerda cambiar la contraseña del administrador en producción\n";
    
} catch (Exception $e) {
    echo "❌ Error durante la inicialización: " . $e->getMessage() . "\n";
    echo "\n🔍 Solución:\n";
    echo "   1. Verifica permisos del directorio database/\n";
    echo "   2. Asegura que PHP pueda escribir archivos\n";
    echo "   3. Ejecuta: chmod 755 database/\n";
}
