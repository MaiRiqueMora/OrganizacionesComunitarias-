-- ============================================================
-- munidb_v2.sql — Sistema de Gestión de Organizaciones
-- Ejecutar completo desde phpMyAdmin en la base munidb
-- ============================================================

USE munidb;

-- ── Usuarios del sistema ────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(60)  NOT NULL UNIQUE,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           ENUM('administrador','funcionario','consulta') NOT NULL DEFAULT 'consulta',
    nombre_completo VARCHAR(120) NOT NULL DEFAULT '',
    activo        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla tokens recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token      VARCHAR(64)  NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used       TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tipos de organización ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_organizacion (
    id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO tipos_organizacion (nombre) VALUES
    ('Junta de Vecinos'),
    ('Club Deportivo'),
    ('Comité'),
    ('Centro de Padres'),
    ('Organización Juvenil'),
    ('Centro de Adulto Mayor'),
    ('Agrupación Cultural'),
    ('Otra');

-- ── Organizaciones comunitarias ─────────────────────────────
CREATE TABLE IF NOT EXISTS organizaciones (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- Datos generales
    nombre                  VARCHAR(200) NOT NULL,
    rut                     VARCHAR(20)  NOT NULL UNIQUE,
    tipo_id                 INT UNSIGNED NULL,
    numero_registro_mun     VARCHAR(50)  NULL,
    fecha_constitucion      DATE         NULL,
    personalidad_juridica   TINYINT(1)   NOT NULL DEFAULT 0,
    numero_decreto          VARCHAR(80)  NULL,
    numero_pj_nacional      VARCHAR(80)  NULL,
    estado                  ENUM('Activa','Inactiva','Suspendida') NOT NULL DEFAULT 'Activa',
    -- Ubicación
    direccion               VARCHAR(200) NOT NULL,
    sector_barrio           VARCHAR(100) NULL,
    comuna                  VARCHAR(80)  NOT NULL DEFAULT 'Pucón',
    region                  VARCHAR(100) NOT NULL DEFAULT 'La Araucanía',
    codigo_postal           VARCHAR(20)  NULL,
    -- Contacto
    telefono_principal      VARCHAR(20)  NULL,
    telefono_secundario     VARCHAR(20)  NULL,
    correo                  VARCHAR(120) NULL,
    redes_sociales          VARCHAR(200) NULL,
    -- Datos administrativos
    numero_socios           INT UNSIGNED NOT NULL DEFAULT 0,
    fecha_ultima_eleccion   DATE         NULL,
    fecha_vencimiento_dir   DATE         NULL,
    observaciones           TEXT         NULL,
    -- Control interno
    funcionario_encargado_id INT UNSIGNED NULL,
    habilitada_fondos       TINYINT(1)   NOT NULL DEFAULT 0,
    -- Opcionales
    nombre_banco            VARCHAR(100) NULL,
    tipo_cuenta             VARCHAR(50)  NULL,
    representante_legal     VARCHAR(150) NULL,
    area_accion             VARCHAR(100) NULL,
    -- Auditoría
    created_by              INT UNSIGNED NULL,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tipo_id)                  REFERENCES tipos_organizacion(id) ON DELETE SET NULL,
    FOREIGN KEY (funcionario_encargado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by)               REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Directivas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS directivas (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organizacion_id  INT UNSIGNED NOT NULL,
    fecha_inicio     DATE         NOT NULL,
    fecha_termino    DATE         NOT NULL,
    estado           ENUM('Vigente','Vencida') NOT NULL DEFAULT 'Vigente',
    es_actual        TINYINT(1)   NOT NULL DEFAULT 1,
    created_by       INT UNSIGNED NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by)      REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Cargos de directiva ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cargos_directiva (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    directiva_id  INT UNSIGNED NOT NULL,
    cargo         ENUM(
                    'Presidente','Presidenta',
                    'Vicepresidente','Vicepresidenta',
                    'Secretario','Secretaria',
                    'Tesorero','Tesorera',
                    '1° Director','2° Director','3° Director',
                    'Suplente'
                  ) NOT NULL,
    nombre_titular VARCHAR(150) NOT NULL,
    rut_titular    VARCHAR(20)  NULL,
    telefono       VARCHAR(20)  NULL,
    correo         VARCHAR(120) NULL,
    estado_cargo   ENUM('Activo','Vacante','Reemplazado') NOT NULL DEFAULT 'Activo',
    es_obligatorio TINYINT(1)   NOT NULL DEFAULT 0,
    FOREIGN KEY (directiva_id) REFERENCES directivas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cargos obligatorios por ley (Ley 19.418)
-- Presidente/a, Secretario/a, Tesorero/a son obligatorios

-- ── Documentos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organizacion_id  INT UNSIGNED NOT NULL,
    tipo             ENUM(
                       'Estatutos','Acta Constitución','Acta Última Elección',
                       'Certificado Vigencia','RUT Organización','Otro'
                     ) NOT NULL,
    nombre           VARCHAR(200) NOT NULL,
    ruta_archivo     VARCHAR(500) NOT NULL,
    nombre_original  VARCHAR(200) NOT NULL,
    mime_type        VARCHAR(100) NOT NULL,
    tamanio_bytes    INT UNSIGNED NOT NULL DEFAULT 0,
    uploaded_by      INT UNSIGNED NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)     REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Historial de cambios (auditoría) ────────────────────────
CREATE TABLE IF NOT EXISTS historial (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tabla            VARCHAR(60)  NOT NULL,
    registro_id      INT UNSIGNED NOT NULL,
    accion           ENUM('crear','editar','eliminar') NOT NULL,
    descripcion      TEXT         NULL,
    usuario_id       INT UNSIGNED NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuario administrador inicial 
-- Contraseña: municipalidad2025 (cambiar con generate_hash.php)
INSERT IGNORE INTO usuarios (username, email, password_hash, rol, nombre_completo) VALUES
(
    'admin',
    'admin@municipalidad.cl',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'administrador',
    'Administrador del Sistema'
);