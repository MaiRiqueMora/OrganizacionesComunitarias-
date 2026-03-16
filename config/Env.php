<?php

/**
 * Gestor de Variables de Entorno
 * Carga y proporciona acceso seguro a las variables del archivo .env
 */

class Env {
    private static $loaded = false;
    private static $variables = [];
    
    /**
     * Carga las variables desde el archivo .env
     */
    public static function load(string $path = null): void {
        if (self::$loaded) {
            return;
        }
        
        $envFile = $path ?: __DIR__ . '/../.env';
        
        if (!file_exists($envFile)) {
            // Si no existe .env, usar .env.example como referencia
            $exampleFile = __DIR__ . '/../.env.example';
            if (file_exists($exampleFile)) {
                self::loadFromFile($exampleFile);
            }
            return;
        }
        
        self::loadFromFile($envFile);
        self::$loaded = true;
        
        // Establecer variables en $_ENV y $_SERVER
        foreach (self::$variables as $key => $value) {
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
    
    /**
     * Carga variables desde un archivo específico
     */
    private static function loadFromFile(string $file): void {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Ignorar comentarios y líneas vacías
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }
            
            // Parsear línea KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remover comillas si existen
                $value = trim($value, '"\'');
                
                // Procesar valores especiales
                $value = self::processValue($value);
                
                self::$variables[$key] = $value;
            }
        }
    }
    
    /**
     * Procesa valores especiales (booleanos, null, números)
     */
    private static function processValue(string $value): string {
        // Booleanos
        if (strtolower($value) === 'true') return '1';
        if (strtolower($value) === 'false') return '0';
        
        // Null
        if (strtolower($value) === 'null') return '';
        
        // Números (mantener como string para compatibilidad)
        if (is_numeric($value)) {
            return $value;
        }
        
        return $value;
    }
    
    /**
     * Obtiene una variable de entorno
     */
    public static function get(string $key, $default = null): ?string {
        self::load();
        
        return self::$variables[$key] ?? $default;
    }
    
    /**
     * Obtiene una variable como booleano
     */
    public static function getBool(string $key, bool $default = false): bool {
        $value = self::get($key);
        
        if ($value === null) {
            return $default;
        }
        
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
    
    /**
     * Obtiene una variable como entero
     */
    public static function getInt(string $key, int $default = 0): int {
        $value = self::get($key);
        
        if ($value === null) {
            return $default;
        }
        
        return (int) $value;
    }
    
    /**
     * Obtiene una variable como float
     */
    public static function getFloat(string $key, float $default = 0.0): float {
        $value = self::get($key);
        
        if ($value === null) {
            return $default;
        }
        
        return (float) $value;
    }
    
    /**
     * Verifica si existe una variable
     */
    public static function has(string $key): bool {
        self::load();
        
        return array_key_exists($key, self::$variables);
    }
    
    /**
     * Establece una variable (para testing)
     */
    public static function set(string $key, string $value): void {
        self::load();
        self::$variables[$key] = $value;
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
    
    /**
     * Obtiene todas las variables cargadas
     */
    public static function all(): array {
        self::load();
        
        return self::$variables;
    }
    
    /**
     * Verifica si estamos en modo desarrollo
     */
    public static function isDevelopment(): bool {
        return self::get('APP_ENV', 'development') === 'development';
    }
    
    /**
     * Verifica si estamos en modo producción
     */
    public static function isProduction(): bool {
        return self::get('APP_ENV', 'development') === 'production';
    }
    
    /**
     * Verifica si el debug está activado
     */
    public static function isDebug(): bool {
        return self::getBool('DEBUG', false);
    }
}

/**
 * Funciones helper para acceso rápido
 */
function env(string $key, $default = null): ?string {
    return Env::get($key, $default);
}

function env_bool(string $key, bool $default = false): bool {
    return Env::getBool($key, $default);
}

function env_int(string $key, int $default = 0): int {
    return Env::getInt($key, $default);
}

function env_float(string $key, float $default = 0.0): float {
    return Env::getFloat($key, $default);
}
