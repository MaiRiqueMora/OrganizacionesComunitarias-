# Manual Técnico

## "Sistema Municipal de Organizaciones Comunitarias"

### Dideco

---

## Descripción del Sistema

Es una solución web diseñada para administrar y gestionar la información de las organizaciones comunitarias de la municipalidad. Permitiendo el registro, actualización y consulta de datos relacionados con las organizaciones, sus directorios, proyectos y documentos asociados, centralizando toda la información en una única plataforma accesible.

---

## Objetivo del Sistema

Centralizar y facilitar la gestión administrativa de las organizaciones comunitarias municipales, mejorando la trazabilidad, la seguridad, el acceso a la información, reduciendo errores manuales y dando un acceso rápido y controlado a los datos.

---

## Alcance del Sistema

Este sistema está orientado al uso interno de la municipalidad, principalmente por el personal administrativo y técnico (TI), donde se permite:

- La gestión completa de las organizaciones comunitarias
- La administración de los directorios
- El registro y seguimiento de sus subvenciones
- El almacenamiento y consulta de sus datos
- El control de los usuarios y sus accesos
- El respaldo y recuperación de la información mediante Backups

**Importante**: Este sistema no contempla acceso público externo y su uso está restringido a usuarios autorizados.

---

## Requisitos del Sistema

### Software

**Servidor web:** Apache 2.4 o superior  
**PHP:** Versión 8.x o superior  
**Gestor de dependencias:** Composer (recomendado)  
**Base de datos:** MySQL/MariaDB  
**Frontend:** HTML5, CSS3, JavaScript Vainilla  
**Librerías:** PHPmailer, PHPSpreadsheet  
**Servidor:** Apache (XAMPP recomendado)

### Extensiones de PHP Necesarias

- **pdo_mysql:** Conexión a base de datos MySQL/MariaDB
- **mbstring:** Manejo de caracteres especiales
- **openssl:** Seguridad y cifrado
- **fileinfo:** Validación de tipos de archivos
- **zip:** Manejo de archivos comprimidos

### Requisitos de Red

- Acceso local mediante navegador web
- Conectividad interna para usuarios autorizados (red municipal)

---

## Arquitectura del Sistema

```
Frontend (HTML/JS)
        |
        v
    API PHP (/api)
        |
        v
Base de Datos (MySQL/MariaDB)
        |
        v
  Archivos (uploads/)
```

---

## Instalación y Configuración

### 1. Requisitos Previos

```bash
# Verificar PHP versión
php --version

# Verificar Apache
apache2 -v

# Verificar extensiones
php -m | grep -E "(pdo_sqlite|mbstring|openssl|fileinfo|zip)"
```

### 2. Instalación

```bash
# 1. Clonar o copiar archivos al directorio web
cp -r sistema-municipal /xampp/htdocs/

# 2. Instalar dependencias
cd /xampp/htdocs/sistema-municipal
composer install

# 3. Configurar permisos
chmod 755 uploads/
chmod 644 uploads/*
```

### 3. Configuración Base

```php
// config/config.php - Archivo de configuración principal
define('DB_PATH', __DIR__ . '/munidb.db');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('APP_URL', 'http://localhost/sistema-municipal');
```

### 4. Base de Datos Inicial

```bash
# Crear base de datos vacía
touch config/munidb.db

# Importar estructura (si existe script)
sqlite3 config/munidb.db < database/schema.sql
```

---

## Operación del Sistema

### Inicio del Sistema

1. **Iniciar Servidor Web**
   ```bash
   # Con XAMPP
   # Iniciar Apache desde el panel de control XAMPP
   ```

2. **Acceder al Sistema**
   - URL: `http://localhost/sistema-municipal`
   - Usuario inicial: `admin`
   - Contraseña: (definida en instalación)

### Flujo Básico de Operación

1. **Crear Organización** 
   - Ingresar datos básicos (nombre, RUT, dirección)
   - Asignar tipo y contacto

2. **Asociar Directiva**
   - Crear directiva para la organización
   - Agregar directivos con roles específicos

3. **Registrar Proyectos**
   - Vincular proyectos a organizaciones
   - Subir documentación asociada

4. **Gestionar Documentos**
   - Subir certificados y documentos
   - Generar reportes

### Mantenimiento Diario

```bash
# Verificar estado del sistema
curl http://localhost/sistema-municipal/api/organizaciones.php?action=stats

# Crear backup
cd C:\xampp\htdocs\sistema-municipal\config\backups\
copy ..\munidb.db backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db

# Limpiar sesiones antiguas (opcional)
php -r "session_start(); session_destroy();"
```

---

## API Endpoints

### Formato Estándar de Respuesta

**Éxito:**
```json
{
  "ok": true,
  "data": {},
  "message": "opcional"
}
```

**Error:**
```json
{
  "ok": false,
  "error": "mensaje descriptivo"
}
```

### Uso del Parámetro action

La mayoría de endpoints utilizan el parámetro `action` para definir la operación:

**Ejemplos:**
- `?action=list` - Listar elementos
- `?action=stats` - Obtener estadísticas  
- `?action=create` - Crear nuevo elemento
- `?action=delete` - Eliminar elemento

**IMPORTANTE:**
- Si no se envía `action` válido retorna "Acción no válida"
- Siempre validar `action` en backend antes de procesar

### Endpoints Principales

#### Autenticación
- `POST /api/login.php` - Iniciar sesión
- `POST /api/logout.php` - Cerrar sesión

#### Organizaciones
- `GET /api/organizaciones.php?action=list` - Listar organizaciones
- `POST /api/organizaciones.php?action=create` - Crear organización
- `PUT /api/organizaciones.php?action=update` - Actualizar organización
- `DELETE /api/organizaciones.php?action=delete` - Eliminar organización

#### Directivas y Directivos
- `GET /api/directivas.php?organizacion_id=X` - Listar directivas
- `POST /api/directivas.php?action=create` - Crear directiva
- `GET /api/directivos.php?directiva_id=X` - Listar directivos

#### Proyectos y Documentos
- `GET /api/proyectos.php?organizacion_id=X` - Listar proyectos
- `POST /api/documentos.php?action=upload` - Subir documento
- `GET /api/certificados.php?action=generate` - Generar certificado

#### Papelera
- `GET /api/papelera.php?action=list` - Ver elementos eliminados
- `POST /api/papelera.php?action=restore` - Restaurar elemento
- `DELETE /api/papelera.php?action=permanent_delete` - Eliminar permanentemente

---

## Base de Datos

### Estructura Principal

**organizaciones**
- `id` (INTEGER PRIMARY KEY)
- `nombre` (TEXT)
- `rut` (TEXT UNIQUE)
- `direccion` (TEXT)
- `telefono` (TEXT)
- `email` (TEXT)
- `tipo` (TEXT)
- `eliminada` (INTEGER DEFAULT 0)
- `fecha_eliminacion` (TEXT)
- `eliminado_por` (INTEGER)

**directivas**
- `id` (INTEGER PRIMARY KEY)
- `organizacion_id` (INTEGER)
- `nombre` (TEXT)
- `periodo` (TEXT)
- `eliminada` (INTEGER DEFAULT 0)

**directivos**
- `id` (INTEGER PRIMARY KEY)
- `directiva_id` (INTEGER)
- `nombre` (TEXT)
- `rut` (TEXT)
- `cargo` (TEXT)
- `contacto` (TEXT)
- `eliminado` (INTEGER DEFAULT 0)

**proyectos**
- `id` (INTEGER PRIMARY KEY)
- `organizacion_id` (INTEGER)
- `nombre` (TEXT)
- `descripcion` (TEXT)
- `estado` (TEXT)
- `eliminado` (INTEGER DEFAULT 0)

**usuarios**
- `id` (INTEGER PRIMARY KEY)
- `username` (TEXT UNIQUE)
- `password_hash` (TEXT)
- `rol` (TEXT)
- `activo` (INTEGER DEFAULT 1)

---

## Lógica de Eliminación

### Sistema de Eliminación Lógica

El sistema NO elimina registros directamente. Implementa eliminación lógica (soft delete):

**Campos de eliminación:**
- `eliminada` (INTEGER): 0 = activo, 1 = eliminado
- `fecha_eliminacion` (TEXT): Timestamp de eliminación
- `eliminado_por` (INTEGER): ID del usuario que eliminó

**Flujo de eliminación:**
1. Marcar registro como eliminado
2. Registrar en historial
3. Ocultar de vistas normales
4. Mantener en papelera para posible restauración

**Consultas con filtro:**
```sql
-- Activos
SELECT * FROM organizaciones WHERE eliminada = 0;

-- Eliminados (papelera)
SELECT * FROM organizaciones WHERE eliminada = 1;
```

---

## Seguridad

### Medidas Implementadas

- **Autenticación**: Contraseñas hasheadas con `password_hash()`
- **Sesiones**: Tokens con expiración
- **Roles**: Verificación por endpoint
- **Uploads**: Validación de tipos de archivo
- **SQL**: Prepared statements contra inyección

### Archivos Sensibles Protegidos

**`.htaccess` en carpetas críticas:**
```apache
# config/
<Directory "config">
    Require all denied
</Directory>

# uploads/
<Files "*.php">
    Require all denied
</Files>
```

### Buenas Prácticas

- No exponer `config/config.php` públicamente
- Usar HTTPS en producción
- Mantener PHP actualizado
- Rotar contraseñas periódicamente

---

## Backups y Recuperación

### Backup Automático

```php
// api/backups.php?action=create
// Genera backup con timestamp
$backup_file = 'backup_' . date('Y-m-d_H-i-s') . '.db';
copy(DB_PATH, BACKUP_DIR . $backup_file);
```

### Recuperación ante Fallos

#### 1. Caída Total del Sistema
```bash
# 1. Verificar Apache
sc query Apache2.4

# 2. Reiniciar si es necesario
net stop Apache2.4
net start Apache2.4

# 3. Si no responde, restaurar último backup
cd C:\xampp\htdocs\sistema-municipal\config\backups\
# Seleccionar backup más reciente manualmente
copy backup_20261213_120000.db C:\xampp\htdocs\sistema-municipal\config\munidb.db
```

#### 2. Corrupción de Base de Datos
```bash
# 1. Identificar backup más reciente
dir C:\xampp\htdocs\sistema-municipal\config\backups\backup_*.db

# 2. Detener Apache
net stop Apache2.4

# 3. Reemplazar base de datos
copy backup_mas_reciente.db C:\xampp\htdocs\sistema-municipal\config\munidb.db

# 4. Optimizar base de datos
sqlite3 munidb.db "VACUUM;"

# 5. Reiniciar Apache
net start Apache2.4
```

#### 3. Pérdida de Archivos
```bash
# Restaurar desde backup externo (si existe)
# O recuperar de papelera del sistema
```

---

## Mantenimiento

### Tareas Diarias

- **Monitoreo**: Verificar que el sistema responda
- **Backups**: Generar backup diario
- **Logs**: Revisar errores en Apache

### Tareas Semanales

- **Limpieza**: Eliminar backups antiguos (> 30 días)
- **Actualizaciones**: Verificar actualizaciones de seguridad
- **Optimización**: Optimizar base de datos

### Tareas Mensuales

- **Auditoría**: Revisar accesos y logs
- **Capacidad**: Verificar espacio en disco
- **Pruebas**: Probar restauración de backup

---

## Control de Versiones

### Sistema Git

**Flujo básico:**
```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

### .gitignore Esencial
```gitignore
# Archivos sensibles
config/config.php
config/munidb.db
*.log

# Archivos temporales
temp/
uploads/

# Dependencias
vendor/
```

---

## Pruebas del Sistema

### Pruebas Funcionales Clave

```bash
# 1. API responde
curl http://localhost/sistema-municipal/api/organizaciones.php?action=stats

# 2. Login funciona
curl -X POST "http://localhost/sistema-municipal/api/login.php" \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password"}'

# 3. CRUD organizaciones
curl -X GET "http://localhost/sistema-municipal/api/organizaciones.php?action=list"
```

### Pruebas de Error

```bash
# Sin action (debe retornar error)
curl -X POST "http://localhost/sistema-municipal/api/organizaciones.php" \
     -d '{"nombre":"test"}'

# Datos inválidos (debe retornar error)
curl -X POST "http://localhost/sistema-municipal/api/organizaciones.php" \
     -H "Content-Type: application/json" \
     -d '{"action":"create","nombre":""}'
```

---

## Troubleshooting

### Problemas Comunes

#### 1. Error de Conexión a Base de Datos
**Síntomas**: "Could not open database"
**Solución**: Verificar ruta y permisos de `config/munidb.db`

#### 2. JSON Inválido en Respuesta
**Síntomas**: Error "JSON.parse: unexpected character"
**Solución**: Eliminar cualquier salida antes del JSON

#### 3. Sesión No Funciona
**Síntomas**: Redirección constante a login
**Solución**: Verificar `session_start()` en todos los endpoints

#### 4. Archivos No Se Suben
**Síntomas**: `$_FILES` vacío
**Solución**: Verificar `enctype="multipart/form-data"` en formulario

---

## Limitaciones del Sistema

### Limitaciones Técnicas

- **Concurrencia**: SQLite no soporta múltiples usuarios editando simultáneamente
- **Escalabilidad**: No óptimo para >100,000 registros
- **Dependencia**: Requiere servidor local (XAMPP)

### Limitaciones Funcionales

- **Usuarios**: Diseñado para <10 usuarios concurrentes
- **Almacenamiento**: Archivos locales sin redundancia
- **Reportes**: Sistema básico sin analítica avanzada

### Plan de Mejora

**Corto plazo (3-6 meses):**
- Implementar HTTPS completo
- Agregar 2FA en autenticación
- Mejorar sistema de reportes

**Mediano plazo (6-12 meses):**
- Migrar a PostgreSQL si volumen > 50k registros
- Implementar almacenamiento en la nube
- Agregar sistema de caché

---

## Contacto de Soporte

Para problemas no resueltos:

1. **Documentación**: Revisar este manual
2. **Logs**: Verificar logs de Apache y PHP
3. **Equipo TI**: Contactar al administrador del sistema

---

*Manual Técnico - Sistema Municipal de Organizaciones Comunitarias*  
*Versión 1.0 - Última actualización: Abril 2026*
