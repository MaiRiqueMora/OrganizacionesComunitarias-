-- Sistema Municipal - Base de Datos MySQL/MariaDB (SIN TRIGGERS)
-- Versión para migración desde SQLite
-- Compatible con MySQL 5.7+ y MariaDB 10.2+

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS sistema_municipal 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE sistema_municipal;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'funcionario',
    activo TINYINT(1) DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
) ENGINE=InnoDB;

-- Tabla de organizaciones
CREATE TABLE organizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200),
    rut VARCHAR(20),
    representante_legal VARCHAR(200),
    correo VARCHAR(100),
    direccion TEXT,
    sector_barrio VARCHAR(100),
    comuna VARCHAR(50) DEFAULT 'Pucón',
    telefono VARCHAR(50),
    telefono_principal VARCHAR(50),
    email VARCHAR(100),
    web VARCHAR(200),
    tipo VARCHAR(50),
    tipo_id INT,
    estado VARCHAR(20) DEFAULT 'activo',
    descripcion TEXT,
    fecha_creacion DATE,
    numero_socios INT DEFAULT 0,
    personalidad_juridica TINYINT(1) DEFAULT 1,
    numero_registro_mun VARCHAR(50),
    numero_decreto VARCHAR(50),
    numero_pj_nacional VARCHAR(50),
    fecha_vencimiento_dir DATE,
    fecha_vencimiento_pj DATE,
    area_accion VARCHAR(200),
    import_id VARCHAR(50),
    eliminada TINYINT(1) DEFAULT 0,
    fecha_eliminacion DATETIME,
    eliminado_por INT NULL,
    created_by INT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_estado (estado),
    INDEX idx_tipo (tipo),
    INDEX idx_eliminada (eliminada),
    INDEX idx_fecha_eliminacion (fecha_eliminacion),
    INDEX idx_import_id (import_id),
    
    FOREIGN KEY (eliminado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de directivos
CREATE TABLE directivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    cargo VARCHAR(100),
    organizacion_id INT NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(50),
    fecha_inicio DATE,
    fecha_termino DATE,
    estado VARCHAR(20) DEFAULT 'Activo',
    observaciones TEXT,
    eliminada TINYINT(1) DEFAULT 0,
    fecha_eliminacion DATETIME,
    eliminado_por INT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_organizacion_id (organizacion_id),
    INDEX idx_estado (estado),
    INDEX idx_eliminada (eliminada),
    INDEX idx_fecha_eliminacion (fecha_eliminacion),
    
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (eliminado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de proyectos (subvenciones)
CREATE TABLE proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    organizacion_id INT NOT NULL,
    descripcion TEXT,
    monto_subvencion DECIMAL(15,2),
    anio_obtuvo_subvencion INT,
    estado VARCHAR(20) DEFAULT 'activo',
    fecha_inicio DATE,
    fecha_termino DATE,
    eliminada TINYINT(1) DEFAULT 0,
    fecha_eliminacion DATETIME,
    eliminado_por INT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nombre (nombre),
    INDEX idx_organizacion_id (organizacion_id),
    INDEX idx_estado (estado),
    INDEX idx_anio_subvencion (anio_obtuvo_subvencion),
    INDEX idx_eliminada (eliminada),
    INDEX idx_fecha_eliminacion (fecha_eliminacion),
    
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (eliminado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de documentos de proyectos/subvenciones
CREATE TABLE documentos_proyecto (
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

-- Tabla de documentos
CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizacion_id INT NOT NULL,
    tipo VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    archivo_original VARCHAR(200),
    mime_type VARCHAR(100),
    tamanio INT,
    subido_por INT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_organizacion_id (organizacion_id),
    INDEX idx_tipo (tipo),
    INDEX idx_nombre (nombre),
    INDEX idx_subido_por (subido_por),
    
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de directivas
CREATE TABLE directivas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizacion_id INT NOT NULL,
    directivo_id INT NOT NULL,
    cargo VARCHAR(100),
    fecha_inicio DATE,
    fecha_termino DATE,
    estado VARCHAR(20) DEFAULT 'activo',
    eliminada TINYINT(1) DEFAULT 0,
    fecha_eliminacion DATETIME,
    eliminado_por INT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_organizacion_id (organizacion_id),
    INDEX idx_directivo_id (directivo_id),
    INDEX idx_estado (estado),
    INDEX idx_eliminada (eliminada),
    INDEX idx_fecha_eliminacion (fecha_eliminacion),
    
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (directivo_id) REFERENCES directivos(id) ON DELETE CASCADE,
    FOREIGN KEY (eliminado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_directiva (organizacion_id, directivo_id, fecha_inicio)
) ENGINE=InnoDB;

-- Tabla de historial (auditoría)
CREATE TABLE historial (
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

-- Tabla de accesos (sesiones)
CREATE TABLE accesos (
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

-- Tabla de intentos de login
CREATE TABLE login_intentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    fecha_intento DATETIME DEFAULT CURRENT_TIMESTAMP,
    exitoso TINYINT(1) DEFAULT 0,
    
    INDEX idx_username (username),
    INDEX idx_ip_address (ip_address),
    INDEX idx_fecha_intento (fecha_intento),
    INDEX idx_exitoso (exitoso)
) ENGINE=InnoDB;

-- Insertar usuario administrador por defecto
-- Contraseña: admin123
INSERT INTO usuarios (username, email, password_hash, rol) 
VALUES ('admin', 'admin@municipalidad.cl', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrador');

-- Comentarios de las tablas
ALTER TABLE usuarios COMMENT 'Usuarios del sistema municipal';
ALTER TABLE organizaciones COMMENT 'Organizaciones registradas en el sistema';
ALTER TABLE directivos COMMENT 'Directivos de las organizaciones';
ALTER TABLE proyectos COMMENT 'Proyectos y subvenciones de las organizaciones';
ALTER TABLE documentos COMMENT 'Documentos adjuntos de las organizaciones';
ALTER TABLE directivas COMMENT 'Directivas y relaciones organizacionales';
ALTER TABLE historial COMMENT 'Historial de auditoría del sistema';
ALTER TABLE accesos COMMENT 'Registro de accesos al sistema';
ALTER TABLE login_intentos COMMENT 'Intentos de inicio de sesión';

-- Finalización
SELECT 'Base de datos creada exitosamente (sin triggers)' as mensaje;
