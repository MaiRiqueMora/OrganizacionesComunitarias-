<?php

/**
 * Verificación de Acceso por Red Interna
 * Permite solo acceso desde redes autorizadas de la municipalidad
 */

class NetworkSecurity {
    private static $allowedNetworks = [
        // Redes locales comunes
        '127.0.0.0/8',        // localhost
        '10.0.0.0/8',         // Red privada clase A
        '172.16.0.0/12',       // Red privada clase B
        '192.168.0.0/16',     // Red privada clase C
        
        // Agregar aquí redes específicas de la municipalidad
        // '192.168.1.0/24',    // Red interna principal
        // '10.10.0.0/16',       // Red departamentos
        // '172.20.0.0/16',      // Red servidores
    ];
    
    private static $allowedIPs = [
        // IPs específicas permitidas (opcional)
        // '192.168.1.100',     // Servidor específico
        // '192.168.1.200',     // Administrador remoto
    ];
    
    /**
     * Verifica si la IP actual tiene permitido el acceso
     */
    public static function isAllowedAccess(): bool {
        $clientIP = self::getClientIP();
        
        // Permitir localhost siempre
        if (in_array($clientIP, ['127.0.0.1', '::1'])) {
            return true;
        }
        
        // Verificar IPs específicas permitidas
        if (in_array($clientIP, self::$allowedIPs)) {
            return true;
        }
        
        // Verificar redes permitidas
        foreach (self::$allowedNetworks as $network) {
            if (self::isIPInNetwork($clientIP, $network)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Obtiene la IP real del cliente
     */
    private static function getClientIP(): string {
        $headers = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                
                // Validar que sea una IP válida
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    /**
     * Verifica si una IP está en una red específica (CIDR)
     */
    private static function isIPInNetwork(string $ip, string $network): bool {
        list($network_ip, $netmask) = explode('/', $network);
        
        // Convertir IPs a formato numérico
        $ip_long = ip2long($ip);
        $network_long = ip2long($network_ip);
        
        if ($ip_long === false || $network_long === false) {
            return false;
        }
        
        // Crear máscara de red
        $mask = -1 << (32 - $netmask);
        $network_long &= $mask;
        
        return ($ip_long & $mask) === $network_long;
    }
    
    /**
     * Bloquea el acceso si no está autorizado
     */
    public static function enforceAccess(): void {
        if (!self::isAllowedAccess()) {
            // Registrar intento de acceso no autorizado
            self::logUnauthorizedAccess();
            
            // Enviar respuesta 403
            http_response_code(403);
            
            // Página de error personalizada
            include __DIR__ . '/../pages/access_denied.php';
            exit;
        }
    }
    
    /**
     * Registra intento de acceso no autorizado
     */
    private static function logUnauthorizedAccess(): void {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => self::getClientIP(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'referer' => $_SERVER['HTTP_REFERER'] ?? 'none'
        ];
        
        // Crear directorio de logs si no existe
        $logDir = __DIR__ . '/../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // Escribir log de seguridad
        $logFile = $logDir . '/security_' . date('Y-m-d') . '.log';
        $logEntry = json_encode($logData) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Obtiene información de la red actual
     */
    public static function getNetworkInfo(): array {
        return [
            'client_ip' => self::getClientIP(),
            'is_local' => in_array(self::getClientIP(), ['127.0.0.1', '::1']),
            'is_private' => self::isPrivateIP(self::getClientIP()),
            'is_allowed' => self::isAllowedAccess(),
            'allowed_networks' => self::$allowedNetworks,
            'allowed_ips' => self::$allowedIPs
        ];
    }
    
    /**
     * Verifica si una IP es privada
     */
    private static function isPrivateIP(string $ip): bool {
        return self::isIPInNetwork($ip, '10.0.0.0/8') ||
               self::isIPInNetwork($ip, '172.16.0.0/12') ||
               self::isIPInNetwork($ip, '192.168.0.0/16') ||
               $ip === '127.0.0.1';
    }
    
    /**
     * Configura redes permitidas desde .env
     */
    public static function configureFromEnv(): void {
        // Cargar redes desde variables de entorno
        $envNetworks = env('ALLOWED_NETWORKS', '');
        if (!empty($envNetworks)) {
            $networks = explode(',', $envNetworks);
            self::$allowedNetworks = array_map('trim', $networks);
        }
        
        $envIPs = env('ALLOWED_IPS', '');
        if (!empty($envIPs)) {
            $ips = explode(',', $envIPs);
            self::$allowedIPs = array_map('trim', $ips);
        }
    }
}

/**
 * Función helper para verificar acceso
 */
function requireInternalNetwork(): void {
    NetworkSecurity::configureFromEnv();
    NetworkSecurity::enforceAccess();
}
