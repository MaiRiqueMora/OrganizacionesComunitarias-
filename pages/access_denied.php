<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Denegado - Sistema Municipal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a2e47 0%, #0d1b2a 100%);
            color: #f5f0e8;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            max-width: 600px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
            color: #e74c3c;
        }
        
        h1 {
            font-size: 28px;
            margin-bottom: 15px;
            color: #e74c3c;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 25px;
            color: #ecf0f1;
        }
        
        .details {
            background: rgba(231, 76, 60, 0.1);
            border: 1px solid rgba(231, 76, 60, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: left;
        }
        
        .details h3 {
            color: #e74c3c;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .details p {
            margin-bottom: 8px;
        }
        
        .contact {
            font-size: 14px;
            color: #bdc3c7;
            margin-top: 20px;
        }
        
        .contact strong {
            color: #f5f0e8;
        }
        
        .emblem {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 20px;
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .icon {
                font-size: 48px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emblem">🏛️</div>
        <div class="icon">🔒</div>
        <h1>Acceso Denegado</h1>
        
        <div class="message">
            Este sistema es de uso exclusivo para la red interna de la Municipalidad de Pucón.
            El acceso desde redes externas no está permitido por motivos de seguridad.
        </div>
        
        <div class="details">
            <h3>📍 Información del Intento de Acceso:</h3>
            <p><strong>Tu IP:</strong> <?php echo $_SERVER['REMOTE_ADDR'] ?? 'Desconocida'; ?></p>
            <p><strong>Fecha y Hora:</strong> <?php echo date('d/m/Y H:i:s'); ?></p>
            <p><strong>Página Solicitada:</strong> <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'Desconocida'); ?></p>
        </div>
        
        <div class="contact">
            <p>Si eres personal autorizado y necesitas acceso remoto,</p>
            <p>contacta con el <strong>Departamento de TI</strong> de la Municipalidad.</p>
            <p>Teléfono: <strong>+56 45 244 1000</strong></p>
        </div>
    </div>
    
    <!-- Registrar intento de acceso -->
    <?php
    // Log adicional para auditoría
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'blocked' => true
    ];
    
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/security_' . date('Y-m-d') . '.log';
    $logEntry = json_encode($logData) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    ?>
</body>
</html>
