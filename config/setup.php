<?php
require_once __DIR__ . '/config.php';

$log   = [];
$error = false;

function ok(string $msg)  { global $log; $log[] = ['ok',   $msg]; }
function warn(string $msg){ global $log; $log[] = ['warn', $msg]; }
function err(string $msg) { global $log, $error; $log[] = ['err', $msg]; $error = true; }

try {
    // Verificar directorio de la BD
    $dir = dirname(DB_PATH);
    if (!is_dir($dir))       { err("El directorio <code>$dir</code> no existe. Créalo manualmente."); }
    elseif (!is_writable($dir)) { err("Sin permisos de escritura en <code>$dir</code>."); }

    if ($error) goto render;

    $pdo = new PDO('sqlite:' . DB_PATH, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');

    // Ccolumnas de tablas
    $getColumns = fn(string $tabla) => array_column(
        $pdo->query("PRAGMA table_info($tabla)")->fetchAll(PDO::FETCH_ASSOC), 'name'
    );
    $tableExists = fn(string $tabla) => (bool)$pdo->query(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='$tabla'"
    )->fetchColumn();

    // Tablas principales
    $tables = [

        'usuarios' => "CREATE TABLE IF NOT EXISTS usuarios (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT NOT NULL UNIQUE,
            email           TEXT NOT NULL UNIQUE,
            password_hash   TEXT NOT NULL,
            rol             TEXT NOT NULL DEFAULT 'consulta',
            nombre_completo TEXT NOT NULL DEFAULT '',
            activo          INTEGER NOT NULL DEFAULT 1,
            created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )",

        'password_resets' => "CREATE TABLE IF NOT EXISTS password_resets (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used       INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )",

        'tipos_organizacion' => "CREATE TABLE IF NOT EXISTS tipos_organizacion (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        )",

        'organizaciones' => "CREATE TABLE IF NOT EXISTS organizaciones (
            id                       INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre                   TEXT NOT NULL,
            rut                      TEXT NOT NULL UNIQUE,
            tipo_id                  INTEGER,
            numero_registro_mun      TEXT,
            fecha_constitucion       TEXT,
            personalidad_juridica    INTEGER NOT NULL DEFAULT 0,
            numero_decreto           TEXT,
            numero_pj_nacional       TEXT,
            fecha_vencimiento_pj     TEXT,
            estado                   TEXT NOT NULL DEFAULT 'Activa',
            direccion                TEXT NOT NULL,
            sector_barrio            TEXT,
            comuna                   TEXT NOT NULL DEFAULT 'Pucón',
            region                   TEXT NOT NULL DEFAULT 'La Araucanía',
            codigo_postal            TEXT,
            telefono_principal       TEXT,
            telefono_secundario      TEXT,
            correo                   TEXT,
            redes_sociales           TEXT,
            numero_socios            INTEGER NOT NULL DEFAULT 0,
            fecha_ultima_eleccion    TEXT,
            fecha_vencimiento_dir    TEXT,
            observaciones            TEXT,
            funcionario_encargado_id INTEGER,
            habilitada_fondos        INTEGER NOT NULL DEFAULT 0,
            nombre_banco             TEXT,
            tipo_cuenta              TEXT,
            representante_legal      TEXT,
            area_accion              TEXT,
            created_by               INTEGER,
            created_at               TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at               TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (tipo_id)                  REFERENCES tipos_organizacion(id) ON DELETE SET NULL,
            FOREIGN KEY (funcionario_encargado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by)               REFERENCES usuarios(id) ON DELETE SET NULL
        )",

        'directivas' => "CREATE TABLE IF NOT EXISTS directivas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacion_id INTEGER NOT NULL,
            fecha_inicio    TEXT NOT NULL,
            fecha_termino   TEXT NOT NULL,
            estado          TEXT NOT NULL DEFAULT 'Vigente',
            es_actual       INTEGER NOT NULL DEFAULT 1,
            created_by      INTEGER,
            created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by)      REFERENCES usuarios(id) ON DELETE SET NULL
        )",

        'cargos_directiva' => "CREATE TABLE IF NOT EXISTS cargos_directiva (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            directiva_id   INTEGER NOT NULL,
            cargo          TEXT NOT NULL,
            nombre_titular TEXT NOT NULL,
            rut_titular    TEXT,
            telefono       TEXT,
            correo         TEXT,
            estado_cargo   TEXT NOT NULL DEFAULT 'Activo',
            es_obligatorio INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (directiva_id) REFERENCES directivas(id) ON DELETE CASCADE
        )",

        'documentos' => "CREATE TABLE IF NOT EXISTS documentos (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacion_id INTEGER NOT NULL,
            tipo            TEXT NOT NULL,
            nombre          TEXT NOT NULL,
            ruta_archivo    TEXT NOT NULL,
            nombre_original TEXT NOT NULL,
            mime_type       TEXT NOT NULL,
            tamanio_bytes   INTEGER NOT NULL DEFAULT 0,
            uploaded_by     INTEGER,
            created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by)     REFERENCES usuarios(id) ON DELETE SET NULL
        )",

        'proyectos' => "CREATE TABLE IF NOT EXISTS proyectos (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            organizacion_id  INTEGER NOT NULL,
            nombre           TEXT NOT NULL,
            descripcion      TEXT,
            fondo_programa   TEXT,
            monto_solicitado REAL,
            monto_aprobado   REAL,
            estado           TEXT NOT NULL DEFAULT 'postulando',
            fecha_postulacion TEXT,
            fecha_resolucion  TEXT,
            observaciones    TEXT,
            created_by       INTEGER,
            created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by)      REFERENCES usuarios(id) ON DELETE SET NULL
        )",

        'documentos_proyecto' => "CREATE TABLE IF NOT EXISTS documentos_proyecto (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            proyecto_id     INTEGER NOT NULL,
            tipo            TEXT NOT NULL,
            nombre          TEXT NOT NULL,
            ruta_archivo    TEXT NOT NULL,
            nombre_original TEXT NOT NULL,
            mime_type       TEXT NOT NULL,
            tamanio_bytes   INTEGER NOT NULL DEFAULT 0,
            uploaded_by     INTEGER,
            created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES usuarios(id) ON DELETE SET NULL
        )",

        'historial' => "CREATE TABLE IF NOT EXISTS historial (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            tabla       TEXT NOT NULL,
            registro_id INTEGER NOT NULL,
            accion      TEXT NOT NULL,
            descripcion TEXT,
            usuario_id  INTEGER,
            created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )",
    ];

    foreach ($tables as $nombre => $sql) {
        $existia = $tableExists($nombre);
        $pdo->exec($sql);
        ok($existia ? "Tabla <code>$nombre</code> — ya existía, sin cambios." : "Tabla <code>$nombre</code> — creada.");
    }

    // Columnas nuevas (migraciones)
    $migraciones = [
        ['organizaciones', 'fecha_vencimiento_pj', "ALTER TABLE organizaciones ADD COLUMN fecha_vencimiento_pj TEXT"],
    ];

    foreach ($migraciones as [$tabla, $columna, $sql]) {
        if (!in_array($columna, $getColumns($tabla))) {
            $pdo->exec($sql);
            ok("Columna <code>$tabla.$columna</code> — agregada.");
        } else {
            ok("Columna <code>$tabla.$columna</code> — ya existía, sin cambios.");
        }
    }

    // Datos iniciales
    $tipos = ['Junta de Vecinos','Club Deportivo','Comité','Centro de Padres',
              'Organización Juvenil','Centro de Adulto Mayor','Agrupación Cultural','Otra'];
    foreach ($tipos as $t) {
        $pdo->prepare("INSERT OR IGNORE INTO tipos_organizacion (nombre) VALUES (?)")->execute([$t]);
    }
    ok("Tipos de organización — verificados.");

    // Usuario admin
    $admin = $pdo->query("SELECT id, password_hash FROM usuarios WHERE username = 'admin'")->fetch();
    if (!$admin) {
        $hash = password_hash('municipalidad2025', PASSWORD_BCRYPT);
        $pdo->prepare("INSERT INTO usuarios (username, email, password_hash, rol, nombre_completo)
                       VALUES ('admin','admin@municipalidad.cl',?,'administrador','Administrador del Sistema')")
            ->execute([$hash]);
        ok("Usuario <strong>admin</strong> creado. Contraseña inicial: <strong>municipalidad2025</strong>");
    } else {
        ok("Usuario <strong>admin</strong> — ya existe, sin cambios.");
    }

    // El archivo de setup se elimina a sí mismo
    @unlink(__FILE__);
    $eliminado = !file_exists(__FILE__);

} catch (Throwable $e) {
    err("Error inesperado: " . $e->getMessage());
}

render:
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Setup — Sistema Municipal</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#0d1b2a;color:#f5f0e8;padding:48px 24px;min-height:100vh}
    .card{max-width:680px;margin:0 auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:36px}
    h2{color:#c9a84c;font-size:1.4rem;margin-bottom:6px}
    .sub{color:rgba(245,240,232,.5);font-size:.85rem;margin-bottom:28px}
    .row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.875rem;line-height:1.5}
    .row:last-child{border-bottom:none}
    .ico{flex-shrink:0;margin-top:1px}
    .ok  .ico::before{content:'✅'}
    .warn .ico::before{content:'⚠️'}
    .err .ico::before{content:'❌'}
    code{background:rgba(255,255,255,.08);padding:1px 6px;border-radius:4px;font-size:.8rem}
    strong{color:#c9a84c}
    .footer{margin-top:28px;padding:18px 20px;border-radius:10px;font-size:.85rem;line-height:1.8}
    .footer.success{background:rgba(39,174,96,.1);border:1px solid rgba(39,174,96,.25);color:#6fcf97}
    .footer.fail{background:rgba(192,57,43,.1);border:1px solid rgba(192,57,43,.25);color:#e57373}
    a{color:#c9a84c;font-weight:600}
  </style>
</head>
<body>
<div class="card">
  <h2>🏛️ Setup — Sistema Municipal</h2>
  <p class="sub">Instalación y migración de base de datos SQLite</p>

  <?php foreach ($log as [$tipo, $msg]): ?>
    <div class="row <?= $tipo ?>"><span class="ico"></span><span><?= $msg ?></span></div>
  <?php endforeach; ?>

  <?php if (!$error): ?>
    <div class="footer success">
      <?php if (!empty($eliminado)): ?>
        🗑️ Este archivo se eliminó automáticamente.<br>
      <?php else: ?>
        ⚠️ No se pudo eliminar este archivo. <strong>Elimínalo manualmente</strong> antes de continuar.<br>
      <?php endif; ?>
      ✅ Base de datos lista. <a href="../index.html">→ Ir al login</a>
    </div>
  <?php else: ?>
    <div class="footer fail">
      ❌ Hubo errores. Revisa los mensajes anteriores y vuelve a ejecutar.
    </div>
  <?php endif; ?>
</div>
</body>
</html>