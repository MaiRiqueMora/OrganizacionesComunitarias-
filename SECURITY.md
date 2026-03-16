# 🔒 Guía de Seguridad para Producción

## ⚠️ **Archivos Eliminados/Movidos por Seguridad**

### **❌ Archivos Eliminados:**
- `test_db_connection.php` - **Eliminado** (expone datos sensibles)

### **✅ Archivos Movidos a `scripts/`:**
- `scripts/diagnose_database.php` - Versión segura (solo CLI)
- `scripts/init_database.php` - Inicialización (solo CLI)
- `scripts/migrate_mysql.php` - Migración (solo CLI)

---

## 🛡️ **Medidas de Seguridad Implementadas**

### **1. Bloqueo de Acceso Web (`.htaccess`)**
```apache
# Bloquea directorios sensibles
<FilesMatch "^(config|scripts|logs|database|backups|test_|diagnose_|init_|migrate_)">
    Order allow,deny
    Deny from all
</FilesMatch>

# Bloquea archivos PHP específicos
<FilesMatch "^test_.*\.php$">
    Order allow,deny
    Deny from all
</FilesMatch>
```

### **2. Scripts Solo CLI**
```php
// Verificación en scripts de diagnóstico
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die('Acceso denegado. Este script solo puede ejecutarse desde línea de comandos.');
}
```

### **3. Directorios Protegidos**
- 🔒 `config/` - Configuración sensible
- 🔒 `scripts/` - Scripts de mantenimiento
- 🔒 `logs/` - Logs del sistema
- 🔒 `database/` - Archivos de base de datos
- 🔒 `backups/` - Backups del sistema

---

## ✅ **Uso Correcto de Scripts**

### **Para Diagnóstico de Base de Datos:**
```bash
# ✅ Forma correcta (CLI)
php scripts/diagnose_database.php

# ❌ Forma incorrecta (web - bloqueada)
http://localhost/sistema-municipal/scripts/diagnose_database.php
# Resultado: 403 Forbidden
```

### **Para Inicialización:**
```bash
# ✅ Forma correcta (CLI)
php scripts/init_database.php

# ❌ Forma incorrecta (web - bloqueada)
http://localhost/sistema-municipal/scripts/init_database.php
# Resultado: 403 Forbidden
```

### **Para Migración:**
```bash
# ✅ Forma correcta (CLI)
php scripts/migrate_mysql.php

# ❌ Forma incorrecta (web - bloqueada)
http://localhost/sistema-municipal/scripts/migrate_mysql.php
# Resultado: 403 Forbidden
```

---

## 🚀 **Comandos de Mantenimiento Seguros**

### **Inicialización del Sistema:**
```bash
# Crear base de datos y tablas
php scripts/init_database.php

# Verificar conexión y estado
php scripts/diagnose_database.php
```

### **Migración a MySQL:**
```bash
# Migrar datos de SQLite a MySQL
php scripts/migrate_mysql.php
```

### **Backups Automáticos:**
```bash
# Los backups se gestionan desde el dashboard
# O manualmente desde CLI (si es necesario)
```

---

## 📋 **Checklist de Seguridad para Producción**

### **✅ Antes de Desplegar:**

#### **1. Eliminar Archivos de Desarrollo:**
- [ ] `test_db_connection.php` ❌ **Eliminado**
- [ ] Cualquier archivo `test_*.php` ❌ **Eliminado**
- [ ] Archivos de debug ❌ **Eliminados**

#### **2. Verificar Permisos:**
```bash
# Directorios (755)
find . -type d -exec chmod 755 {} \;

# Archivos (644)
find . -type f -exec chmod 644 {} \;

# Scripts ejecutables (755)
chmod 755 scripts/*.php
```

#### **3. Configurar `.htaccess`:**
- [ ] Bloqueo de directorios sensibles ✅
- [ ] Prevenir listado de directorios ✅
- [ ] Headers de seguridad ✅

#### **4. Variables de Entorno:**
```php
// config/config.php
define('DB_HOST', 'localhost');           // Cambiar a producción
define('DB_USER', 'usuario_seguro');      // No usar 'root'
define('DB_PASS', 'contraseña_segura');    // Contraseña fuerte
define('APP_URL', 'https://dominio.com'); // HTTPS obligatorio
```

#### **5. Base de Datos:**
- [ ] Usuario dedicado (no 'root')
- [ ] Contraseña fuerte
- [ ] Privilegios mínimos necesarios
- [ ] Backup automático configurado

### **✅ En Producción:**

#### **1. Verificar Acceso Bloqueado:**
```bash
# Probar acceso a archivos sensibles
curl -I http://dominio.com/scripts/
curl -I http://dominio.com/config/
curl -I http://dominio.com/database/
# Expected: 403 Forbidden
```

#### **2. Verificar Funcionalidad:**
- [ ] Login funciona correctamente
- [ ] Redirección automática funciona
- [ ] Dashboard carga sin errores
- [ ] Backups automáticos funcionan

#### **3. Monitoreo:**
- [ ] Logs de errores revisados
- [ ] Logs de accesos monitoreados
- [ ] Backups verificándose
- [ ] Actualizaciones de seguridad

---

## 🔍 **Riesgos de Seguridad Eliminados**

### **❌ Antes (Inseguro):**
- `test_db_connection.php` accesible vía web
- Información de base de datos expuesta
- Scripts de mantenimiento accesibles
- Directorios sensibles listables

### **✅ Después (Seguro):**
- Scripts solo ejecutables via CLI
- Bloqueo de acceso a directorios sensibles
- Verificación de entorno en scripts
- Headers de seguridad configurados

---

## 🚨 **Qué NO Hacer en Producción**

### **❌ Nunca exponer:**
- Archivos de configuración
- Scripts de diagnóstico
- Directorios de logs
- Archivos de base de datos
- Scripts de mantenimiento

### **❌ Nunca permitir:**
- Acceso web a `scripts/`
- Listado de directorios
- Ejecución de scripts vía web
- Acceso a archivos `.sql`

### **❌ Nunca usar:**
- Credenciales por defecto
- Usuario 'root' en producción
- Contraseñas débiles
- HTTP sin HTTPS

---

## 🛠️ **Herramientas de Verificación**

### **1. Verificar Archivos Bloqueados:**
```bash
# Test de acceso a scripts
curl -s -o /dev/null -w "%{http_code}" http://localhost/sistema-municipal/scripts/
# Expected: 403

# Test de acceso a config
curl -s -o /dev/null -w "%{http_code}" http://localhost/sistema-municipal/config/
# Expected: 403
```

### **2. Verificar Permisos:**
```bash
# Verificar permisos de directorios
ls -la scripts/ config/ logs/ database/
# Expected: drwxr-xr-x (755)

# Verificar permisos de archivos
ls -la *.php
# Expected: -rw-r--r-- (644)
```

### **3. Verificar Configuración:**
```bash
# Ejecutar diagnóstico seguro
php scripts/diagnose_database.php
# Expected: Información completa sin exposición web
```

---

## 📞 **Soporte de Seguridad**

### **Si encuentras problemas:**
1. **Verifica logs** en `logs/`
2. **Ejecuta diagnóstico** via CLI
3. **Revisa permisos** de archivos
4. **Verifica configuración** `.htaccess`

### **Para reportes de seguridad:**
- No exponer información sensible
- Usar canales privados
- Incluir detalles del entorno

---

## 🎯 **Resumen**

✅ **Seguro**: Scripts solo via CLI, acceso web bloqueado  
✅ **Mantenible**: Comandos claros para administración  
✅ **Monitoreable**: Logs y diagnósticos disponibles  
✅ **Escalable**: Configuración para producción lista  

**El sistema ahora es seguro para producción con todas las protecciones necesarias implementadas.**
