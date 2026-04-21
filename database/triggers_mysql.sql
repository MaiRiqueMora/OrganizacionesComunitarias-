-- Sistema Municipal - Triggers para MySQL/MariaDB
-- Ejecutar DESPUÉS de la migración de datos

USE sistema_municipal;

-- Trigger para historial de organizaciones
DELIMITER //
CREATE TRIGGER tr_organizaciones_insert
AFTER INSERT ON organizaciones
FOR EACH ROW
BEGIN
    INSERT INTO historial (tabla, registro_id, accion, descripcion, usuario_id)
    VALUES ('organizaciones', NEW.id, 'crear', CONCAT('Organización creada: ', NEW.nombre), NULL);
END //
DELIMITER ;

-- Trigger para historial de directivos
DELIMITER //
CREATE TRIGGER tr_directivos_insert
AFTER INSERT ON directivos
FOR EACH ROW
BEGIN
    INSERT INTO historial (tabla, registro_id, accion, descripcion, usuario_id)
    VALUES ('directivos', NEW.id, 'crear', CONCAT('Directivo creado: ', NEW.nombre), NULL);
END //
DELIMITER ;

-- Trigger para historial de proyectos
DELIMITER //
CREATE TRIGGER tr_proyectos_insert
AFTER INSERT ON proyectos
FOR EACH ROW
BEGIN
    INSERT INTO historial (tabla, registro_id, accion, descripcion, usuario_id)
    VALUES ('proyectos', NEW.id, 'crear', CONCAT('Proyecto creado: ', NEW.nombre), NULL);
END //
DELIMITER ;

-- Trigger para historial de documentos
DELIMITER //
CREATE TRIGGER tr_documentos_insert
AFTER INSERT ON documentos
FOR EACH ROW
BEGIN
    INSERT INTO historial (tabla, registro_id, accion, descripcion, usuario_id)
    VALUES ('documentos', NEW.id, 'crear', CONCAT('Documento subido: ', NEW.nombre), NEW.subido_por);
END //
DELIMITER ;

-- Crear vistas para consultas comunes
CREATE VIEW v_organizaciones_activas AS
SELECT 
    id, nombre, razon_social, rut, direccion, telefono, email, web, 
    tipo, estado, descripcion, fecha_creacion, creado_en, actualizado_en
FROM organizaciones 
WHERE eliminada = 0 AND estado = 'activo';

CREATE VIEW v_directivos_activos AS
SELECT 
    d.id, d.nombre, d.cargo, d.organizacion_id, d.email, d.telefono,
    d.fecha_inicio, d.fecha_termino, d.estado, d.observaciones,
    d.creado_en, d.actualizado_en,
    o.nombre as organizacion_nombre
FROM directivos d
JOIN organizaciones o ON d.organizacion_id = o.id
WHERE d.eliminada = 0 AND d.estado = 'Activo' AND o.eliminada = 0;

CREATE VIEW v_proyectos_activos AS
SELECT 
    p.id, p.nombre, p.organizacion_id, p.descripcion, p.monto_subvencion,
    p.anio_obtuvo_subvencion, p.estado, p.fecha_inicio, p.fecha_termino,
    p.creado_en, p.actualizado_en,
    o.nombre as organizacion_nombre
FROM proyectos p
JOIN organizaciones o ON p.organizacion_id = o.id
WHERE p.eliminada = 0 AND o.eliminada = 0;

-- Procedimientos almacenados
DELIMITER //
CREATE PROCEDURE sp_limpiar_login_intentos(IN dias INT)
BEGIN
    DELETE FROM login_intentos 
    WHERE fecha_intento < DATE_SUB(NOW(), INTERVAL dias DAY);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_estadisticas_generales()
BEGIN
    SELECT 
        'organizaciones' as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN eliminada = 0 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN eliminada = 1 THEN 1 ELSE 0 END) as eliminados
    FROM organizaciones
    
    UNION ALL
    
    SELECT 
        'directivos' as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN eliminada = 0 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN eliminada = 1 THEN 1 ELSE 0 END) as eliminados
    FROM directivos
    
    UNION ALL
    
    SELECT 
        'proyectos' as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN eliminada = 0 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN eliminada = 1 THEN 1 ELSE 0 END) as eliminados
    FROM proyectos;
END //
DELIMITER ;

SELECT 'Triggers y procedimientos creados exitosamente' as mensaje;
