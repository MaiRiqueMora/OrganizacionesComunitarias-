<?php
require_once __DIR__ . '/db.php';
$password = 'municipalidad2025';
$hash = password_hash($password, PASSWORD_BCRYPT);
$pdo = getDB();
$pdo->prepare("UPDATE usuarios SET password_hash=? WHERE username='admin'")->execute([$hash]);
echo "<pre style='font-family:monospace;padding:20px;background:#0d1b2a;color:#f5f0e8'>";
echo "✅ Hash actualizado correctamente.\n\nUsuario: admin\nContraseña: $password\nHash: $hash\n\n⚠ ELIMINA ESTE ARCHIVO.";
echo "</pre>";
