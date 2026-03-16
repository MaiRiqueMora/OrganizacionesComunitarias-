-- ============================================================
-- accesos.sql — Tablas para registro de accesos y auditoría
-- Ejecutar después de munidb_v2.sql
-- ============================================================

USE munidb_v2;

-- ── Tabla de accesos exitosos ───────────────────────────────────
CREATE TABLE IF NOT EXISTS accesos (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id       INT UNSIGNED NOT NULL,
    username         VARCHAR(60) NOT NULL,
    ip_address       VARCHAR(45) NOT NULL,
    user_agent       TEXT NULL,
    navegador        VARCHAR(50) NULL,
    sistema_operativo VARCHAR(50) NULL,
    dispositivo      VARCHAR(20) NULL,
    fecha_acceso     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_logout     DATETIME NULL,
    duracion_sesion INT UNSIGNED NULL, -- en segundos
    session_id       VARCHAR(255) NULL,
    logout_reason    VARCHAR(100) NULL,
    
    INDEX idx_usuario_acceso (usuario_id, fecha_acceso DESC),
    INDEX idx_fecha_acceso (fecha_acceso DESC),
    INDEX idx_ip_address (ip_address),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabla de accesos fallidos ───────────────────────────────
CREATE TABLE IF NOT EXISTS accesos_fallidos (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(60) NOT NULL,
    ip_address       VARCHAR(45) NOT NULL,
    user_agent       TEXT NULL,
    razon_fallo      VARCHAR(200) NOT NULL DEFAULT 'Credenciales incorrectas',
    fecha_intento    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_username_fallo (username, fecha_intento DESC),
    INDEX idx_ip_fallo (ip_address, fecha_intento DESC),
    INDEX idx_fecha_intento (fecha_intento DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Vista para reportes de accesos ───────────────────────────────
CREATE OR REPLACE VIEW vw_accesos_recientes AS
SELECT 
    a.id,
    a.username,
    a.ip_address,
    a.navegador,
    a.sistema_operativo,
    a.dispositivo,
    a.fecha_acceso,
    a.fecha_logout,
    a.duracion_sesion,
    CASE 
        WHEN a.duracion_sesion IS NULL THEN 'Activa'
        WHEN a.duracion_sesion < 60 THEN CONCAT(a.duracion_sesion, ' seg')
        WHEN a.duracion_sesion < 3600 THEN CONCAT(FLOOR(a.duracion_sesion/60), ' min')
        ELSE CONCAT(FLOOR(a.duracion_sesion/3600), ' h ', FLOOR((a.duracion_sesion%3600)/60), ' min')
    END as duracion_formateada,
    u.nombre_completo,
    u.rol
FROM accesos a
LEFT JOIN usuarios u ON a.usuario_id = u.id
ORDER BY a.fecha_acceso DESC;

-- ── Vista para estadísticas de accesos ───────────────────────────
CREATE OR REPLACE VIEW vw_estadisticas_accesos AS
SELECT 
    DATE(fecha_acceso) as fecha,
    COUNT(*) as total_accesos,
    COUNT(DISTINCT usuario_id) as usuarios_unicos,
    COUNT(DISTINCT ip_address) as ips_unicas,
    SUM(CASE WHEN dispositivo = 'Móvil' THEN 1 ELSE 0 END) as accesos_movil,
    SUM(CASE WHEN dispositivo = 'Desktop' THEN 1 ELSE 0 END) as accesos_desktop,
    SUM(CASE WHEN dispositivo = 'Tablet' THEN 1 ELSE 0 END) as accesos_tablet
FROM accesos
GROUP BY DATE(fecha_acceso)
ORDER BY fecha DESC;
