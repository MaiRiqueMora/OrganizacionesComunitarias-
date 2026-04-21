-- Crear tabla de documentos de proyectos/subvenciones
-- Ejecutar este script en phpMyAdmin o MySQL CLI

USE sistema_municipal;

CREATE TABLE IF NOT EXISTS documentos_proyecto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    archivo_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    tamanio INT,
    uploaded_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_proyecto_id (proyecto_id),
    INDEX idx_uploaded_by (uploaded_by),
    
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;
