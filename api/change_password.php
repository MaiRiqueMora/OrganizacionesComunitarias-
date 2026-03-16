<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';
if ($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit;}
$u = requireSession();
$d = json_decode(file_get_contents('php://input'),true);
$current=$d['current']??''; $new=$d['password']??''; $confirm=$d['confirm']??'';
if(!$current||!$new||!$confirm){echo json_encode(['ok'=>false,'error'=>'Todos los campos son requeridos.']);exit;}
if(strlen($new)<8){echo json_encode(['ok'=>false,'error'=>'Mínimo 8 caracteres.']);exit;}
if($new!==$confirm){echo json_encode(['ok'=>false,'error'=>'Las contraseñas no coinciden.']);exit;}
$pdo=getDB();
$row=$pdo->prepare("SELECT password_hash FROM usuarios WHERE id=?");
$row->execute([$u['id']]); $row=$row->fetch();
if(!$row||!password_verify($current,$row['password_hash'])){echo json_encode(['ok'=>false,'error'=>'Contraseña actual incorrecta.']);exit;}
$pdo->prepare("UPDATE usuarios SET password_hash=? WHERE id=?")->execute([password_hash($new,PASSWORD_BCRYPT),$u['id']]);
echo json_encode(['ok'=>true]);
