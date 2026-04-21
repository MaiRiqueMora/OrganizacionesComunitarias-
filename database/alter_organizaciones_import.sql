-- Agregar columnas faltantes a la tabla organizaciones para soportar importación
-- Ejecutar en phpMyAdmin

USE sistema_municipal;

-- Agregar columnas si no existen
ALTER TABLE organizaciones 
ADD COLUMN IF NOT EXISTS representante_legal VARCHAR(200) AFTER rut,
ADD COLUMN IF NOT EXISTS correo VARCHAR(100) AFTER representante_legal,
ADD COLUMN IF NOT EXISTS sector_barrio VARCHAR(100) AFTER direccion,
ADD COLUMN IF NOT EXISTS comuna VARCHAR(50) DEFAULT 'Pucón' AFTER sector_barrio,
ADD COLUMN IF NOT EXISTS telefono_principal VARCHAR(50) AFTER telefono,
ADD COLUMN IF NOT EXISTS tipo_id INT AFTER tipo,
ADD COLUMN IF NOT EXISTS numero_socios INT DEFAULT 0 AFTER fecha_creacion,
ADD COLUMN IF NOT EXISTS personalidad_juridica TINYINT(1) DEFAULT 1 AFTER numero_socios,
ADD COLUMN IF NOT EXISTS numero_registro_mun VARCHAR(50) AFTER personalidad_juridica,
ADD COLUMN IF NOT EXISTS numero_decreto VARCHAR(50) AFTER numero_registro_mun,
ADD COLUMN IF NOT EXISTS numero_pj_nacional VARCHAR(50) AFTER numero_decreto,
ADD COLUMN IF NOT EXISTS fecha_vencimiento_dir DATE AFTER numero_pj_nacional,
ADD COLUMN IF NOT EXISTS fecha_vencimiento_pj DATE AFTER fecha_vencimiento_dir,
ADD COLUMN IF NOT EXISTS area_accion VARCHAR(200) AFTER fecha_vencimiento_pj,
ADD COLUMN IF NOT EXISTS import_id VARCHAR(50) AFTER area_accion,
ADD COLUMN IF NOT EXISTS created_by INT NULL AFTER import_id;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_import_id ON organizaciones(import_id);

-- Agregar foreign key si no existe (puede fallar si ya existe)
-- ALTER TABLE organizaciones 
-- ADD FOREIGN KEY IF NOT EXISTS (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;
