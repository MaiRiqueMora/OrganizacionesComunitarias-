-- Crear tabla de accesos si no existe
-- Ejecutar en phpMyAdmin

USE sistema_municipal;

-- Tabla de accesos (sesiones)
CREATE TABLE IF NOT EXISTS accesos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_salida DATETIME,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_entrada (fecha_entrada),
    INDEX idx_fecha_salida (fecha_salida),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insertar registro de acceso de prueba para el usuario admin (id=1)
-- Descomenta la siguiente línea si quieres agregar un registro de prueba:
-- INSERT INTO accesos (usuario_id, ip_address, user_agent) 
-- SELECT 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
-- FROM DUAL WHERE EXISTS (SELECT 1 FROM usuarios WHERE id = 1);
