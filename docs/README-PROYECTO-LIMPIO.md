# Sistema Municipal de Organizaciones - Versión Final Limpia

## Estado del Proyecto
- **Versión**: 2.0 (MySQL)
- **Estado**: 100% funcional y limpio
- **Última actualización**: Abril 2026

## Características Principales

### Módulos Implementados
- **Dashboard** - Vista general con estadísticas
- **Organizaciones** - Gestión completa de organizaciones comunitarias
- **Directivos** - Administración de directivas y cargos
- **Proyectos** - Gestión de proyectos y subvenciones
- **Usuarios** - Sistema de usuarios con roles (Admin, Funcionario, Consulta)
- **Historial** - Auditoría completa de acciones
- **Accesos** - Registro de accesos al sistema
- **Backups** - Sistema de backups automáticos
- **Papelera** - Recuperación de elementos eliminados

### Funcionalidades Técnicas
- **Base de datos**: MySQL/MariaDB
- **Autenticación**: Sesiones seguras con roles
- **APIs REST**: Completas con manejo de errores
- **Importación**: Excel/CSV para organizaciones y directivos
- **Paginación**: En todas las listas
- **Búsqueda**: Filtros avanzados
- **Responsive**: Diseño móvil-first

## Requisitos del Sistema

### Servidor
- **PHP**: 8.0 o superior
- **MySQL**: 5.7 o superior / MariaDB 10.2+
- **Apache**: 2.4+ (con mod_rewrite)
- **Extensiones PHP**: PDO, PDO_MySQL, Zip, JSON, mbstring

### Opcional
- **mysqldump**: Para backups optimizados
- **SMTP**: Para recuperación de contraseña

## Instalación Rápida

### 1. Base de Datos
```sql
CREATE DATABASE sistema_municipal;
USE sistema_municipal;
-- Ejecutar: database/schema_mysql_no_triggers.sql
```

### 2. Configuración
Editar `config/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sistema_municipal');
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');
```

### 3. Permisos
```bash
chmod 755 uploads/
chmod 755 backups/
```

### 4. Acceso
- URL: `http://localhost/sistema-municipal`
- Usuario admin: `admin` / `admin123`

## Estructura del Proyecto

```
sistema-municipal/
  api/                    # APIs REST (32 archivos)
  assets/                 # Logo y recursos estáticos
  css/                    # Hojas de estilo (4 archivos)
  config/                 # Configuración (4 archivos)
  database/              # Scripts SQL (10 archivos)
  docs/                  # Documentación completa
  js/                    # JavaScript principal
  pages/                 # Páginas del sistema
  php/                   # Funciones PHP auxiliares
  templates/             # Plantillas HTML
  uploads/              # Archivos subidos
  vendor/               # Dependencias Composer
```

## APIs Disponibles

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/organizaciones.php` | GET/POST/PUT/DELETE | CRUD organizaciones |
| `/api/directivos.php` | GET/POST/PUT/DELETE | CRUD directivos |
| `/api/proyectos.php` | GET/POST/PUT/DELETE | CRUD proyectos |
| `/api/usuarios.php` | GET/POST/PUT/DELETE | CRUD usuarios |
| `/api/historial.php` | GET | Auditoría |
| `/api/accesos.php` | GET | Registro de accesos |
| `/api/backups.php` | GET/POST/DELETE | Sistema de backups |
| `/api/importar_json.php` | POST | Importación masiva |
| `/api/login.php` | POST | Autenticación |

## Seguridad Implementada

- **Autenticación por roles**: Admin, Funcionario, Solo Lectura
- **Validación de inputs**: Sanitización completa
- **Prepared statements**: Contra SQL injection
- **CSRF protection**: Tokens en formularios
- **Session security**: HttpOnly, SameSite
- **File upload validation**: Tipos y tamaños permitidos
- **Error handling**: Sin exposición de datos sensibles

## Mantenimiento

### Backups Automáticos
- **Frecuencia**: Al crear manualmente
- **Ubicación**: `backups/`
- **Formato**: ZIP con SQL y archivos
- **Retención**: Últimos 10 backups

### Logs
- **Errores**: `error_log` de PHP
- **Auditoría**: Tabla `historial`
- **Accesos**: Tabla `accesos`

## Soporte y Documentación

- **Guía de instalación**: `docs/INSTALACION-MYSQL.md`
- **Documentación API**: En cada archivo API
- **Limpieza realizada**: `docs/LIMPIEZA-PROYECTO.md`

## Licencia

Sistema Municipal de Organizaciones - Software interno para uso gubernamental.

---

**Estado**: Producción listo | **Version**: 2.0 | **Tested**: 100% funcional
