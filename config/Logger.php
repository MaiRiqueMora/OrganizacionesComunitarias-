<?php

/**
 * Sistema de Logging Estructurado
 * Proporciona logging flexible y configurable para el sistema
 */

class Logger {
    private static $instance = null;
    private $logFile;
    private $logLevel;
    private $context = [];
    
    // Niveles de log
    const EMERGENCY = 'emergency';
    const ALERT     = 'alert';
    const CRITICAL  = 'critical';
    const ERROR     = 'error';
    const WARNING   = 'warning';
    const NOTICE    = 'notice';
    const INFO      = 'info';
    const DEBUG     = 'debug';
    
    // Prioridades para filtrado
    private static $priorities = [
        self::EMERGENCY => 0,
        self::ALERT     => 1,
        self::CRITICAL  => 2,
        self::ERROR     => 3,
        self::WARNING   => 4,
        self::NOTICE    => 5,
        self::INFO      => 6,
        self::DEBUG     => 7
    ];
    
    /**
     * Constructor privado (Singleton)
     */
    private function __construct() {
        $this->logFile = $this->getLogFile();
        $this->logLevel = $this->getLogLevel();
        $this->context = $this->getDefaultContext();
        
        // Crear directorio de logs si no existe
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Obtener instancia singleton
     */
    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Obtener ruta del archivo de log
     */
    private function getLogFile(): string {
        $logDir = defined('LOGS_DIR') ? LOGS_DIR : __DIR__ . '/../logs';
        $date = date('Y-m-d');
        return $logDir . '/app_' . $date . '.log';
    }
    
    /**
     * Obtener nivel de log desde configuración
     */
    private function getLogLevel(): string {
        if (defined('LOG_LEVEL')) {
            return LOG_LEVEL;
        }
        
        // En producción, solo logs de error y superiores
        if (defined('APP_ENV') && APP_ENV === 'production') {
            return self::ERROR;
        }
        
        // En desarrollo, todos los niveles
        return self::DEBUG;
    }
    
    /**
     * Obtener contexto por defecto
     */
    private function getDefaultContext(): array {
        return [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'cli',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'cli',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'cli',
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'CLI',
            'user_id' => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'app_env' => defined('APP_ENV') ? APP_ENV : 'unknown'
        ];
    }
    
    /**
     * Escribir entrada de log
     */
    public function log(string $level, string $message, array $context = []): void {
        // Verificar si el nivel está permitido
        if (!$this->shouldLog($level)) {
            return;
        }
        
        $entry = $this->formatLogEntry($level, $message, $context);
        
        // Escribir al archivo
        file_put_contents($this->logFile, $entry, FILE_APPEND | LOCK_EX);
        
        // En caso de error crítico, también enviar a error_log de PHP
        if (in_array($level, [self::EMERGENCY, self::ALERT, self::CRITICAL])) {
            error_log("[SISTEMA] $message");
        }
    }
    
    /**
     * Verificar si se debe loguear según el nivel
     */
    private function shouldLog(string $level): bool {
        $currentPriority = self::$priorities[$this->logLevel] ?? 7;
        $messagePriority = self::$priorities[$level] ?? 7;
        
        return $messagePriority <= $currentPriority;
    }
    
    /**
     * Formatear entrada de log
     */
    private function formatLogEntry(string $level, string $message, array $context = []): string {
        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => strtoupper($level),
            'message' => $message,
            'context' => array_merge($this->context, $context)
        ];
        
        // Formato JSON para análisis estructurado
        return json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
    }
    
    /**
     * Métodos de conveniencia para cada nivel
     */
    public function emergency(string $message, array $context = []): void {
        $this->log(self::EMERGENCY, $message, $context);
    }
    
    public function alert(string $message, array $context = []): void {
        $this->log(self::ALERT, $message, $context);
    }
    
    public function critical(string $message, array $context = []): void {
        $this->log(self::CRITICAL, $message, $context);
    }
    
    public function error(string $message, array $context = []): void {
        $this->log(self::ERROR, $message, $context);
    }
    
    public function warning(string $message, array $context = []): void {
        $this->log(self::WARNING, $message, $context);
    }
    
    public function notice(string $message, array $context = []): void {
        $this->log(self::NOTICE, $message, $context);
    }
    
    public function info(string $message, array $context = []): void {
        $this->log(self::INFO, $message, $context);
    }
    
    public function debug(string $message, array $context = []): void {
        $this->log(self::DEBUG, $message, $context);
    }
    
    /**
     * Log de acceso de usuario
     */
    public function logAccess(string $action, array $data = []): void {
        $this->info("Acceso de usuario: $action", array_merge([
            'action_type' => 'access',
            'module' => 'auth'
        ], $data));
    }
    
    /**
     * Log de error de base de datos
     */
    public function logDatabaseError(string $query, string $error, array $params = []): void {
        $this->error("Error de base de datos", [
            'query' => $query,
            'error' => $error,
            'params' => $params,
            'module' => 'database'
        ]);
    }
    
    /**
     * Log de operación CRUD
     */
    public function logCrud(string $action, string $table, int $id, array $data = []): void {
        $this->info("Operación CRUD: $action", array_merge([
            'crud_action' => $action,
            'table' => $table,
            'record_id' => $id,
            'module' => 'crud'
        ], $data));
    }
    
    /**
     * Log de evento de seguridad
     */
    public function logSecurity(string $event, array $data = []): void {
        $this->warning("Evento de seguridad: $event", array_merge([
            'security_event' => $event,
            'module' => 'security'
        ], $data));
    }
    
    /**
     * Log de backup
     */
    public function logBackup(string $type, string $result, array $data = []): void {
        $level = $result === 'success' ? 'info' : 'error';
        $this->$level("Backup $type: $result", array_merge([
            'backup_type' => $type,
            'module' => 'backup'
        ], $data));
    }
    
    /**
     * Limpiar logs antiguos
     */
    public function cleanup(int $days = 30): void {
        $logDir = dirname($this->logFile);
        $files = glob($logDir . '/app_*.log');
        
        foreach ($files as $file) {
            if (filemtime($file) < strtotime("-$days days")) {
                unlink($file);
                $this->info("Log antiguo eliminado: " . basename($file));
            }
        }
    }
    
    /**
     * Obtener estadísticas de logs
     */
    public function getStats(): array {
        $logDir = dirname($this->logFile);
        $files = glob($logDir . '/app_*.log');
        
        $stats = [
            'total_files' => count($files),
            'total_size' => 0,
            'latest_file' => null,
            'levels' => []
        ];
        
        foreach ($files as $file) {
            $stats['total_size'] += filesize($file);
            
            if ($stats['latest_file'] === null || filemtime($file) > filemtime($stats['latest_file'])) {
                $stats['latest_file'] = basename($file);
            }
            
            // Contar niveles en el archivo más reciente
            if ($file === $stats['latest_file']) {
                $content = file_get_contents($file);
                $lines = explode("\n", trim($content));
                
                foreach ($lines as $line) {
                    if (empty($line)) continue;
                    
                    $entry = json_decode($line, true);
                    if ($entry && isset($entry['level'])) {
                        $level = strtolower($entry['level']);
                        $stats['levels'][$level] = ($stats['levels'][$level] ?? 0) + 1;
                    }
                }
            }
        }
        
        return $stats;
    }
}

/**
 * Funciones helper globales para logging
 */
function logger(): Logger {
    return Logger::getInstance();
}

function log_emergency(string $message, array $context = []): void {
    logger()->emergency($message, $context);
}

function log_alert(string $message, array $context = []): void {
    logger()->alert($message, $context);
}

function log_critical(string $message, array $context = []): void {
    logger()->critical($message, $context);
}

function log_error(string $message, array $context = []): void {
    logger()->error($message, $context);
}

function log_warning(string $message, array $context = []): void {
    logger()->warning($message, $context);
}

function log_notice(string $message, array $context = []): void {
    logger()->notice($message, $context);
}

function log_info(string $message, array $context = []): void {
    logger()->info($message, $context);
}

function log_debug(string $message, array $context = []): void {
    logger()->debug($message, $context);
}
