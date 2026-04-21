<?php
header('Content-Type: application/json; charset=utf-8');

$errores = [];

// Paso 1: Verificar config.php
try {
    require_once __DIR__ . '/../config/config.php';
    $errores[] = '✓ config.php cargado';
    $errores[] = '  DB_PATH: ' . DB_PATH;
    $errores[] = '  Existe DB: ' . (file_exists(DB_PATH) ? 'SÍ' : 'NO');
} catch (Exception $e) {
    $errores[] = '✗ Error en config.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
} catch (Error $e) {
    $errores[] = '✗ Error fatal en config.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
}

// Paso 2: Verificar db.php
try {
    require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../config/db.php';
    $errores[] = '✓ db.php cargado';
} catch (Exception $e) {
    $errores[] = '✗ Error en db.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
} catch (Error $e) {
    $errores[] = '✗ Error fatal en db.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
}

// Paso 3: Verificar auth_helper.php
try {
    require_once __DIR__ . '/../config/auth_helper.php';
    $errores[] = '✓ auth_helper.php cargado';
} catch (Exception $e) {
    $errores[] = '✗ Error en auth_helper.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
} catch (Error $e) {
    $errores[] = '✗ Error fatal en auth_helper.php: ' . $e->getMessage();
    echo json_encode(['ok'=>false,'errores'=>$errores]); exit;
}

// Paso 4: Verificar sesión
try {
    $user = sessionUser();
    if ($user) {
        $errores[] = '✓ Sesión activa: ' . $user['username'] . ' (rol: ' . $user['rol'] . ')';
    } else {
        $errores[] = '✗ Sin sesión activa';
    }
} catch (Exception $e) {
    $errores[] = '✗ Error en sesión: ' . $e->getMessage();
} catch (Error $e) {
    $errores[] = '✗ Error fatal en sesión: ' . $e->getMessage();
}

// Paso 5: Verificar conexión a BD
try {
    $pdo = getDB();
    $errores[] = '✓ Conexión a BD exitosa';
    
    // Verificar tabla organizaciones
    $result = $pdo->query("SELECT COUNT(*) as total FROM organizaciones");
    $count = $result->fetch()['total'];
    $errores[] = '  Total organizaciones: ' . $count;
} catch (Exception $e) {
    $errores[] = '✗ Error de conexión BD: ' . $e->getMessage();
} catch (Error $e) {
    $errores[] = '✗ Error fatal BD: ' . $e->getMessage();
}

echo json_encode(['ok'=>true,'errores'=>$errores]);
