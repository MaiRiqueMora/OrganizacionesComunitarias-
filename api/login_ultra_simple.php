<?php
// Login ultra simple para test
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

try {
    // Solo verificar credenciales fijas
    if ($_POST['username'] === 'admin' && $_POST['password'] === 'admin123') {
        echo json_encode(['ok'=>true,'message'=>'Login exitoso']);
    } else {
        echo json_encode(['ok'=>false,'error'=>'Credenciales incorrectas']);
    }
} catch (Exception $e) {
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
?>
