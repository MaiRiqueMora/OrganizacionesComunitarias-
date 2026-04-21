-- Crear tabla de historial si no existe
-- Ejecutar en phpMyAdmin

USE sistema_municipal;

CREATE TABLE IF NOT EXISTS historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    registro_id INT NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT,
    usuario_id INT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_tabla (tabla),
    INDEX idx_registro_id (registro_id),
    INDEX idx_accion (accion),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha (fecha),
    INDEX idx_tabla_registro (tabla, registro_id),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;
