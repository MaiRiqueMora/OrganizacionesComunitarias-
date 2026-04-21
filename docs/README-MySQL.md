# Guía de Instalación - Sistema Municipal con MySQL/MariaDB

## Overview

Esta guía explica cómo migrar el sistema municipal de SQLite a MySQL/MariaDB para permitir:
- **Respaldos profesionales** con herramientas estándar
- **Servidor de base de datos dedicado**
- **Escalabilidad y rendimiento mejorados**
- **Migración entre servidores fácilmente**

## Archivos Necesarios

En la carpeta `database/` encontrarás:
- `schema_mysql.sql` - Script de creación de base de datos
- `migrate_to_mysql.php` - Script de migración de datos
- `README-MySQL.md` - Esta guía

En la carpeta `config/`:
- `config_mysql.php` - Configuración para MySQL
- `db_mysql.php` - Funciones de conexión MySQL

## Paso 1: Preparar el Servidor MySQL

### Opción A: MySQL/MariaDB Local
```bash
# Instalar MySQL/MariaDB s
sudo apt-get install mysql-server  # Linux
# o descargar desde https://dev.mysql.com/downloads/
```

### Opción B: Servidor MySQL Remoto
- Obtener credenciales del proveedor de hosting
- Asegurar acceso remoto si es necesario
- Verificar firewall y puertos (3306)

## Paso 2: Crear Base de Datos

### Método 1: Usando phpMyAdmin
1. Acceder a phpMyAdmin
2. Crear nueva base de datos: `sistema_municipal`
3. Collation: `utf8mb4_unicode_ci`

### Método 2: Usando línea de comandos
```sql
mysql -u root -p
CREATE DATABASE sistema_municipal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sistema_user'@'localhost' IDENTIFIED BY 'tu_contraseña';
GRANT ALL PRIVILEGES ON sistema_municipal.* TO 'sistema_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Paso 3: Ejecutar Script SQL

### Método 1: phpMyAdmin
1. Seleccionar base de datos `sistema_municipal`
2. Hacer clic en "Importar"
3. Seleccionar archivo `database/schema_mysql.sql`
4. Ejecutar

### Método 2: Línea de comandos
```bash
mysql -u root -p sistema_municipal < database/schema_mysql.sql
```

## Paso 4: Configurar el Sistema

### 4.1 Actualizar Configuración
```php
// Renombrar archivos:
mv config/config.php config/config_sqlite.php  // Backup
mv config/config_mysql.php config/config.php   // Activar MySQL

mv config/db.php config/db_sqlite.php         // Backup
mv config/db_mysql.php config/db.php           // Activar MySQL
```

### 4.2 Configurar Credenciales MySQL
En `config/config.php`:
```php
define('DB_HOST', 'localhost');           // o IP del servidor
define('DB_NAME', 'sistema_municipal');   // nombre de la BD
define('DB_USER', 'sistema_user');       // usuario MySQL
define('DB_PASS', 'tu_contraseña');       // contraseña
```

## Paso 5: Migrar Datos (Opcional)

Si tienes datos existentes en SQLite:

### 5.1 Configurar Credenciales en Script
Editar `database/migrate_to_mysql.php`:
```php
define('MYSQL_HOST', 'localhost');
define('MYSQL_DB', 'sistema_municipal');
define('MYSQL_USER', 'sistema_user');
define('MYSQL_PASS', 'tu_contraseña');
```

### 5.2 Ejecutar Migración
```bash
php database/migrate_to_mysql.php
```

O acceder vía navegador:
```
http://localhost/sistema-municipal/database/migrate_to_mysql.php
```

## Paso 6: Verificar Instalación

### 6.1 Verificar Tablas
```sql
USE sistema_municipal;
SHOW TABLES;
```

### 6.2 Verificar Usuario Administrador
```sql
SELECT * FROM usuarios WHERE rol = 'administrador';
```

### 6.3 Probar Acceso al Sistema
1. Acceder a: `http://localhost/sistema-municipal`
2. Usuario: `admin`
3. Contraseña: `admin123`

## Paso 7: Configurar Respaldos

### 7.1 Respaldo Manual
```bash
mysqldump -u sistema_user -p sistema_municipal > backup_$(date +%Y%m%d).sql
```

### 7.2 Respaldo Automático (Cron)
```bash
# Agregar a crontab (ej: diario a las 2 AM)
0 2 * * * /usr/bin/mysqldump -u sistema_user -ptu_contraseña sistema_municipal > /backups/sistema_$(date +\%Y\%m\%d).sql
```

### 7.3 Respaldo desde PHP
El sistema incluye función de backup:
```php
// En api/backups.php está integrado
backupMySQLDatabase($backupPath);
```

## Ventajas de MySQL vs SQLite

| Característica | SQLite | MySQL/MariaDB |
|----------------|--------|---------------|
| **Escalabilidad** | Limitada | Alta |
| **Concurrencia** | Baja | Alta |
| **Respaldos** | Copia de archivo | Herramientas profesionales |
| **Servidor dedicado** | No | Sí |
| **Rendimiento** | Bueno para apps pequeñas | Excelente para apps grandes |
| **Migración** | Manual (copiar archivo) | Fácil (exportar/importar) |

## Solución de Problemas

### Error: "Connection refused"
- Verificar que MySQL esté corriendo
- Revisar firewall/puertos
- Verificar configuración de red

### Error: "Access denied"
- Verificar usuario/contraseña
- Revisar permisos del usuario
- Asegurar que el usuario tenga privilegios en la BD

### Error: "Unknown database"
- Crear la base de datos primero
- Verificar nombre exacto de la BD
- Revisar mayúsculas/minúsculas

### Error: "Table doesn't exist"
- Ejecutar script `schema_mysql.sql`
- Verificar que todas las tablas se crearon
- Revisar errores durante la creación

## Mantenimiento

### Limpieza de Logs
```sql
-- Limpiar intentos de login antiguos (más de 90 días)
DELETE FROM login_intentos WHERE fecha_intento < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Limpiar accesos antiguos (más de 1 año)
DELETE FROM accesos WHERE fecha_entrada < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### Optimización
```sql
-- Optimizar tablas periódicamente
OPTIMIZE TABLE usuarios;
OPTIMIZE TABLE organizaciones;
OPTIMIZE TABLE directivos;
OPTIMIZE TABLE proyectos;
```

### Monitoreo
```sql
-- Verificar tamaño de la base de datos
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'sistema_municipal'
GROUP BY table_schema;
```

## Soporte y Contacto

Para problemas técnicos:
1. Revisar logs de MySQL: `/var/log/mysql/error.log`
2. Verificar configuración PHP: `phpinfo()`
3. Ejecutar diagnóstico: `api/diagnostico.php`

---

**Importante**: Mantén siempre respaldos recientes de tu base de datos antes de realizar cambios importantes.
