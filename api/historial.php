<?php

ini_set('display_errors', 0);
ob_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth_helper.php';

requireRol('administrador');

$pdo = getDB();

$page     = max(1, (int)($_GET['page']     ?? 1));
$perPage  = min(100, max(10, (int)($_GET['per_page'] ?? 50)));
$tabla    = trim($_GET['tabla']      ?? '');
$accion   = trim($_GET['accion']     ?? '');
$userId   = (int)($_GET['usuario_id'] ?? 0);
$desde    = trim($_GET['desde']      ?? '');
$hasta    = trim($_GET['hasta']      ?? '');

$where  = [];
$params = [];

if ($tabla)  { $where[] = 'h.tabla = ?';      $params[] = $tabla; }
if ($accion) { $where[] = 'h.accion = ?';     $params[] = $accion; }
if ($userId) { $where[] = 'h.usuario_id = ?'; $params[] = $userId; }
if ($desde)  { $where[] = "date(h.created_at) >= ?"; $params[] = $desde; }
if ($hasta)  { $where[] = "date(h.created_at) <= ?"; $params[] = $hasta; }

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Total
$total = $pdo->prepare("SELECT COUNT(*) FROM historial h $whereSQL");
$total->execute($params);
$totalRows = (int)$total->fetchColumn();

// Datos
$offset = ($page - 1) * $perPage;
$stmt   = $pdo->prepare("
    SELECT h.id, h.tabla, h.registro_id, h.accion, h.descripcion,
           h.created_at,
           u.nombre_completo AS usuario_nombre,
           u.username        AS usuario_username
    FROM historial h
    LEFT JOIN usuarios u ON u.id = h.usuario_id
    $whereSQL
    ORDER BY h.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([...$params, $perPage, $offset]);
$rows = $stmt->fetchAll();

// Lista de usuarios para filtro
$usuarios = $pdo->query("
    SELECT DISTINCT u.id, u.nombre_completo, u.username
    FROM historial h
    JOIN usuarios u ON u.id = h.usuario_id
    ORDER BY u.nombre_completo
")->fetchAll();

ob_end_clean();
echo json_encode([
    'ok'       => true,
    'data'     => $rows,
    'total'    => $totalRows,
    'page'     => $page,
    'per_page' => $perPage,
    'pages'    => (int)ceil($totalRows / $perPage),
    'usuarios' => $usuarios,
]);
