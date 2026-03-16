<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/auth_helper.php';
$u = sessionUser();
if ($u) echo json_encode(['ok'=>true,'username'=>$u['username'],'rol'=>$u['rol'],'nombre'=>$u['nombre']]);
else    echo json_encode(['ok'=>false]);
