<?php

require_once __DIR__ . '/db.php';

/**
 * Construye datos base para los diferentes tipos de reportes.
 * Devuelve [titulo, columnas, filas].
 */
function report_build(string $tipo): array {
    $pdo = getDB();

    switch ($tipo) {
        case 'organizaciones_activas':
            $titulo = 'Organizaciones Activas';
            $stmt   = $pdo->query("
                SELECT o.nombre, o.rut, t.nombre AS tipo, o.estado,
                       o.numero_socios, o.telefono_principal, o.correo,
                       o.direccion, o.comuna, o.fecha_constitucion
                FROM organizaciones o
                LEFT JOIN tipos_organizacion t ON o.tipo_id=t.id
                WHERE o.estado='Activa'
                ORDER BY o.nombre
            ");
            $cols = ['Nombre','RUT','Tipo','Estado','N° Socios','Teléfono','Correo','Dirección','Comuna','Fecha Constitución'];
            break;

        case 'directivas_vigentes':
            $titulo = 'Directivas Vigentes';
            $stmt   = $pdo->query("
                SELECT o.nombre AS organizacion, d.fecha_inicio, d.fecha_termino,
                       d.estado, DATEDIFF(d.fecha_termino,CURDATE()) AS dias_restantes
                FROM directivas d
                JOIN organizaciones o ON d.organizacion_id=o.id
                WHERE d.es_actual=1 AND d.estado='Vigente'
                ORDER BY d.fecha_termino ASC
            ");
            $cols = ['Organización','Fecha Inicio','Fecha Término','Estado','Días Restantes'];
            break;

        case 'directivas_vencidas':
            $titulo = 'Organizaciones con Directiva Vencida';
            $stmt   = $pdo->query("
                SELECT o.nombre AS organizacion, o.estado AS estado_org,
                       d.fecha_termino, ABS(DATEDIFF(CURDATE(),d.fecha_termino)) AS dias_vencida
                FROM directivas d
                JOIN organizaciones o ON d.organizacion_id=o.id
                WHERE d.es_actual=1 AND (d.estado='Vencida' OR d.fecha_termino < CURDATE())
                ORDER BY d.fecha_termino ASC
            ");
            $cols = ['Organización','Estado Organización','Fecha Vencimiento','Días Vencida'];
            break;

        case 'organizaciones_fondos':
            $titulo = 'Organizaciones Habilitadas para Fondos';
            $stmt   = $pdo->query("
                SELECT 
                    o.nombre,
                    o.rut,
                    o.estado,
                    o.numero_socios,
                    o.representante_legal,
                    o.nombre_banco,
                    o.tipo_cuenta,
                    o.comuna,
                    o.area_accion
                FROM organizaciones o
                WHERE o.habilitada_fondos = 1
                ORDER BY o.nombre
            ");
            $cols = [
                'Nombre',
                'RUT',
                'Estado',
                'N° Socios',
                'Representante Legal',
                'Banco',
                'Tipo Cuenta',
                'Comuna',
                'Área de Acción'
            ];
            break;

        case 'organizaciones_sector':
            $titulo = 'Organizaciones por Sector / Barrio';
            $stmt   = $pdo->query("
                SELECT 
                    COALESCE(NULLIF(TRIM(o.sector_barrio), ''), 'Sin sector registrado') AS sector,
                    COUNT(*) AS total_organizaciones,
                    SUM(o.estado = 'Activa')      AS activas,
                    SUM(o.estado = 'Inactiva')    AS inactivas,
                    SUM(o.estado = 'Suspendida')  AS suspendidas,
                    SUM(o.habilitada_fondos = 1)  AS habilitadas_fondos
                FROM organizaciones o
                GROUP BY sector
                ORDER BY sector ASC
            ");
            $cols = [
                'Sector / Barrio',
                'Total Organizaciones',
                'Activas',
                'Inactivas',
                'Suspendidas',
                'Habilitadas para Fondos'
            ];
            break;

        default:
            throw new InvalidArgumentException('Tipo de reporte no válido.');
    }

    $rows = $stmt->fetchAll(PDO::FETCH_NUM);
    return [$titulo, $cols, $rows];
}

