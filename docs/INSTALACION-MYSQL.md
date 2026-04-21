# Guía Rápida de Instalación MySQL

## Para el Equipo Técnico

### Lo que necesitas entregar:

```
sistema-municipal/
database/
  schema_mysql_no_triggers.sql  # USAR ESTE - Estructura SIN triggers
  triggers_mysql.sql             # Ejecutar después de migración
  migrate_to_mysql.php          # Migración de datos (opcional)
  validate_migration.php        # Validación de la migración
config/
  config_mysql.php              # Configuración MySQL (renombrar a config.php)
  db_mysql.php                  # Conexión MySQL (renombrar a db.php)
README-MySQL.md                 # Guía completa
INSTALACION-MYSQL.md            # Esta guía rápida
```

## Pasos de Instalación (ORDEN EXACTO - OBLIGATORIO)

### 1. Crear Base de Datos
```sql
CREATE DATABASE sistema_municipal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Importar Estructura SIN TRIGGERS
**Opción A: phpMyAdmin (recomendado)**
1. Seleccionar base de datos `sistema_municipal`
2. Clic en "Importar"
3. Seleccionar archivo: `database/schema_mysql_no_triggers.sql`
4. Ejecutar

**Opción B: Línea de comandos**
```bash
mysql -u root -p sistema_municipal < database/schema_mysql_no_triggers.sql
```

### 3. Configurar Conexión MySQL
**Renombrar archivos manualmente:**

```
# Backup de archivos SQLite
Renombrar:
config/config.php      a config/config_sqlite.php
config/db.php          a config/db_sqlite.php

# Activar configuración MySQL
Renombrar:
config/config_mysql.php a config/config.php
config/db_mysql.php     a config/db.php
```

### 4. Configurar Credenciales
Editar `config/config.php`:
```php
define('DB_HOST', 'localhost');     // o IP del servidor
define('DB_NAME', 'sistema_municipal');
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');
```

**Verificar conexión:**
Abrir: `http://localhost/sistema-municipal/database/validate_migration.php`

### 5. (Opcional) Migrar Datos Existentes
**SOLO si existe base de datos SQLite previa**

Acceder a: `http://localhost/sistema-municipal/database/migrate_to_mysql.php`

### 6. Activar Triggers y Vistas
**Opción A: phpMyAdmin**
1. Seleccionar base de datos `sistema_municipal`
2. Clic en "Importar"
3. Seleccionar archivo: `database/triggers_mysql.sql`
4. Ejecutar

**Opción B: Línea de comandos**
```bash
mysql -u root -p sistema_municipal < database/triggers_mysql.sql
```

### 7. Validar Instalación
Acceder a: `http://localhost/sistema-municipal/database/validate_migration.php`

**Si la validación es correcta, acceder al sistema:**

## Acceso al Sistema

- **URL**: `http://localhost/sistema-municipal`
- **Usuario**: `admin`
- **Contraseña**: `admin123`

## Verificación Rápida

Ejecutar en MySQL:
```sql
-- Verificar tablas
SHOW TABLES;

-- Verificar usuario admin
SELECT * FROM usuarios WHERE rol = 'administrador';

-- Verificar datos
SELECT COUNT(*) FROM organizaciones;
SELECT COUNT(*) FROM directivos;
SELECT COUNT(*) FROM proyectos;
```

## Respaldo

```bash
# Respaldo completo
mysqldump -u usuario -p sistema_municipal > backup.sql

# Restauración
mysql -u usuario -p sistema_municipal < backup.sql
```

## Características MySQL

### Ventajas de la Migración
- **Rendimiento superior** - Consultas más rápidas
- **Concurrencia mejorada** - Múltiples usuarios simultáneos
- **Backups profesionales** - mysqldump con compresión
- **Escalabilidad** - Soporta grandes volúmenes de datos
- **Seguridad** - Usuarios y permisos granulares
- **Replicación** - Opción para servidores redundantes

### Funcionalidades Habilitadas
- **Sistema de backups automático** con ZipArchive
- **Importación masiva** Excel/CSV optimizada
- **Auditoría completa** con historial y accesos
- **Papelera de recuperación** con restauración
- **Concurrencia multiusuario** sin bloqueos
- **Búsqueda avanzada** con índices optimizados

## Roles y Permisos MySQL

### Sistema de Roles Implementado
- **Administrador**: Acceso completo a todos los módulos
- **Funcionario**: Acceso extendido (incluye historial, accesos, papelera, backups)
- **Solo Lectura**: Solo visualización de datos

### Módulos por Rol
| Módulo | Administrador | Funcionario | Solo Lectura |
|--------|---------------|-------------|--------------|
| Dashboard | | | |
| Organizaciones | | | |
| Directivos | | | |
| Proyectos | | | |
| Documentos | | | |
| Importación | | | |
| Usuarios | | | |
| Historial | | | |
| Accesos | | | |
| Backups | | | |
| Papelera | | | |

## Problemas Comunes

| Error | Solución |
|-------|----------|
| "Access denied" | Verificar usuario/contraseña MySQL |
| "Unknown database" | Crear BD primero: `CREATE DATABASE sistema_municipal` |
| "Table doesn't exist" | Ejecutar `schema_mysql_no_triggers.sql` primero |
| "Connection refused" | MySQL no está corriendo |
| "Se requiere rol administrador" | Verificar permisos del usuario actual |
| "Error al cargar" | Refrescar página (Ctrl+F5) |

## Soporte

- Diagnóstico completo: `api/diagnostico.php`
- Validación: `database/validate_migration.php`
- Guía completa: `README-MySQL.md`
- Documentación de limpieza: `docs/LIMPIEZA-PROYECTO.md`

---

**Tiempo estimado**: 5-10 minutos
**Requisitos**: MySQL/MariaDB + PHP 7.4+
**Resultado**: Sistema funcional con respaldos profesionales y permisos extendidos
**Usuarios recomendados**: admin/admin123 + funcionario_dideco (rol funcionario)
