# 📊 Sistema Municipal - Guía de Base de Datos

## 🗄️ **Configuración Actual**

El sistema está configurado para usar **SQLite** como base de datos por defecto:

- **Archivo**: `config/db.php`
- **Base de datos**: SQLite (`munidb_v2.sqlite`)
- **Ubicación**: `database/munidb_v2.sqlite`
- **Motor**: SQLite (autocontenido, sin servidor)

---

## 🚀 **Instalación y Configuración**

### **1. Crear Base de Datos (SQLite)**

```bash
# El archivo se crea automáticamente al primer uso
# Pero puedes inicializarlo manualmente:
php -f scripts/init_database.php
```

### **2. Estructura de Archivos**

```
sistema-municipal/
├── config/
│   ├── db.php          # Conexión SQLite
│   └── config.php      # Configuración general
├── database/
│   └── munidb_v2.sqlite  # Base de datos SQLite (se crea automáticamente)
├── scripts/
│   ├── init_database.php   # Script de inicialización
│   └── migrate_mysql.php   # Migración a MySQL (opcional)
└── uploads/             # Archivos subidos
```

---

## 🔄 **Opción 1: Usar SQLite (Recomendado para desarrollo)**

### **Ventajas:**
- ✅ **Sin instalación**: No requiere servidor de base de datos
- ✅ **Portabilidad**: Todo en un solo archivo
- ✅ **Rápido**: Ideal para desarrollo y prototipos
- ✅ **Cero configuración**: Funciona out-of-the-box

### **Desventajas:**
- ❌ **Limitado concurrencia**: Bloqueos a nivel de archivo
- ❌ **Escalabilidad**: No ideal para alto tráfico
- ❌ **Herramientas**: Menos opciones de administración

---

## 🐬 **Opción 2: Migrar a MySQL (Recomendado para producción)**

### **Ventajas:**
- ✅ **Alta concurrencia**: Múltiples usuarios simultáneos
- ✅ **Escalabilidad**: Maneja grandes volúmenes
- ✅ **Herramientas**: phpMyAdmin, MySQL Workbench, etc.
- ✅ **Rendimiento**: Optimizado para producción

### **Pasos para migrar:**

#### **1. Crear base de datos MySQL**
```sql
CREATE DATABASE munidb_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'municipal'@'localhost' IDENTIFIED BY 'tu_contraseña';
GRANT ALL PRIVILEGES ON munidb_v2.* TO 'municipal'@'localhost';
FLUSH PRIVILEGES;
```

#### **2. Actualizar configuración**
```php
// config/config.php
define('DB_HOST', 'localhost');
define('DB_NAME', 'munidb_v2');
define('DB_USER', 'municipal');
define('DB_PASS', 'tu_contraseña');
```

#### **3. Modificar conexión**
```php
// config/db.php
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Error de conexión a la base de datos MySQL.']);
            exit;
        }
    }
    return $pdo;
}
```

#### **4. Ejecutar migración**
```bash
php scripts/migrate_mysql.php
```

---

## 📋 **Tablas del Sistema**

### **Usuarios y Autenticación**
- `usuarios` - Usuarios del sistema
- `accesos` - Registro de accesos exitosos
- `accesos_fallidos` - Intentos fallidos de login

### **Organizaciones**
- `organizaciones` - Datos principales
- `directivas` - Miembros de directivas
- `documentos` - Archivos adjuntos

### **Sistema**
- `historial` - Auditoría de cambios
- `alertas` - Notificaciones del sistema

---

## 🛠️ **Scripts de Mantenimiento**

### **Inicialización de Base de Datos**
```bash
# Crear base de datos SQLite con estructura completa
php scripts/init_database.php

# Crear usuario administrador por defecto
php scripts/create_admin.php
```

### **Migración de Datos**
```bash
# Migrar de SQLite a MySQL
php scripts/migrate_mysql.php

# Exportar datos
php scripts/export_data.php

# Importar datos
php scripts/import_data.php
```

### **Backups Automáticos**
```bash
# Backup de SQLite
cp database/munidb_v2.sqlite backups/backup_$(date +%Y%m%d_%H%M%S).sqlite

# Backup de MySQL
mysqldump -u municipal -p munidb_v2 > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔍 **Verificación de Instalación**

### **1. Verificar conexión**
```php
// test_db_connection.php
<?php
require_once 'config/db.php';
try {
    $db = getDB();
    echo "✅ Conexión exitosa a la base de datos";
} catch (Exception $e) {
    echo "❌ Error de conexión: " . $e->getMessage();
}
?>
```

### **2. Verificar tablas**
```php
// test_tables.php
<?php
require_once 'config/db.php';
$db = getDB();
$tables = $db->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll();
echo "Tablas encontradas: " . implode(', ', array_column($tables, 'name'));
?>
```

---

## 📁 **Archivos de Configuración**

### **`config/db.php`** - Conexión a base de datos
- Define `getDB()` para obtener conexión PDO
- Manejo de errores de conexión
- Configuración SQLite por defecto

### **`config/config.php`** - Variables globales
- Credenciales de base de datos (para MySQL)
- Configuración SMTP
- Paths y constantes de aplicación

### **`database/`** - Directorio de base de datos
- `munidb_v2.sqlite` - Archivo de base de datos SQLite
- Se crea automáticamente al primer uso
- Permisos recomendados: 664

---

## ⚡ **Recomendaciones**

### **Para Desarrollo:**
- 🎯 **Usar SQLite**: Más simple y rápido
- 🔄 **Versionar el archivo**: Incluir en Git
- 📦 **Backup regular**: Copiar archivo `.sqlite`

### **Para Producción:**
- 🚀 **Usar MySQL**: Mejor rendimiento y escalabilidad
- 🔒 **Seguridad**: Usuario dedicado con permisos limitados
- 📊 **Monitoring**: Logs y métricas de rendimiento
- 🔄 **Backups automáticos**: Programados diariamente

### **Buenas Prácticas:**
- ✅ **No versionar**: Archivos `.sqlite` en producción
- ✅ **Permisos adecuados**: 644 para archivos, 755 para directorios
- ✅ **Backups regulares**: Automatizados y fuera del servidor
- ✅ **Monitoreo**: Logs de errores y rendimiento

---

## 🆘 **Solución de Problemas**

### **Error: "Unable to open database file"**
```bash
# Crear directorio de base de datos
mkdir -p database
chmod 755 database

# Verificar permisos de escritura
touch database/test.sqlite
```

### **Error: "SQLSTATE[HY000] [14] unable to open database file"**
```bash
# Verificar que PHP tenga permisos
chmod 755 database/
chmod 664 database/munidb_v2.sqlite
```

### **Error: "Table doesn't exist"**
```bash
# Ejecutar script de inicialización
php scripts/init_database.php
```

---

## 📞 **Soporte**

Para más ayuda o preguntas:
- Revisar logs en `logs/backup.log`
- Verificar configuración en `config/`
- Ejecutar scripts de diagnóstico en `scripts/`
