<?php

/* ============================================================
   session_secure.php — Gestión de sesiones seguras con cookies
   ============================================================ */

/**
 * Inicia una sesión segura con cookies HTTPOnly y SameSite
 * @param array $options Opciones adicionales
 * @return bool
 */
function sessionStartSecure($options = []) {
    // Configuración segura de cookies
    $defaultOptions = [
        'lifetime' => 3600, // 1 hora
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Strict' // Previene CSRF
    ];
    
    $options = array_merge($defaultOptions, $options);
    
    // Establecer parámetros de cookie antes de iniciar sesión
    ini_set('session.cookie_lifetime', $options['lifetime']);
    ini_set('session.cookie_path', $options['path']);
    ini_set('session.cookie_domain', $options['domain']);
    ini_set('session.cookie_secure', $options['secure']);
    ini_set('session.cookie_httponly', $options['httponly']);
    ini_set('session.cookie_samesite', $options['samesite']);
    
    // Iniciar sesión
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Regenerar ID para prevención de fixation
    if (!isset($_SESSION['initiated'])) {
        session_regenerate_id(true);
        $_SESSION['initiated'] = true;
    }
    
    return true;
}

/**
 * Verifica la validez de la sesión actual
 * @return array
 */
function validateSession() {
    if (session_status() === PHP_SESSION_NONE) {
        return ['valid' => false, 'reason' => 'No hay sesión activa'];
    }
    
    // Verificar que la sesión fue iniciada correctamente
    if (!isset($_SESSION['initiated'])) {
        return ['valid' => false, 'reason' => 'Sesión no iniciada correctamente'];
    }
    
    // Verificar tiempo de expiración
    $maxLifetime = ini_get('session.cookie_lifetime');
    if ($maxLifetime && isset($_SESSION['last_activity'])) {
        $inactiveTime = time() - $_SESSION['last_activity'];
        if ($inactiveTime > $maxLifetime) {
            sessionDestroySecure();
            return ['valid' => false, 'reason' => 'Sesión expirada por inactividad'];
        }
    }
    
    // Verificar IP del cliente (opcional, más estricto)
    if (isset($_SESSION['client_ip']) && $_SESSION['client_ip'] !== getClientIP()) {
        sessionDestroySecure();
        return ['valid' => false, 'reason' => 'Cambio de IP detectado'];
    }
    
    // Verificar User Agent (opcional, más estricto)
    if (isset($_SESSION['user_agent']) && $_SESSION['user_agent'] !== $_SERVER['HTTP_USER_AGENT']) {
        sessionDestroySecure();
        return ['valid' => false, 'reason' => 'Cambio de navegador detectado'];
    }
    
    // Actualizar última actividad
    $_SESSION['last_activity'] = time();
    
    return ['valid' => true, 'reason' => 'Sesión válida'];
}

/**
 * Destruye la sesión de forma segura
 * @return bool
 */
function sessionDestroySecure() {
    // Limpiar variables de sesión
    $_SESSION = [];
    
    // Destruir cookie de sesión
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite']
            ]
        );
    }
    
    // Destruir sesión
    session_destroy();
    
    return true;
}

/**
 * Obtiene la IP real del cliente considerando proxies
 * @return string
 */
function getClientIP() {
    $ipKeys = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];
    
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            $ip = $_SERVER[$key];
            if (strpos($ip, ',') !== false) {
                $ip = explode(',', $ip)[0];
            }
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Genera un token CSRF seguro
 * @return string
 */
function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_time'] = time();
    
    return $token;
}

/**
 * Verifica un token CSRF
 * @param string $token Token a verificar
 * @param int $maxAge Tiempo máximo de validez en segundos (default: 1 hora)
 * @return bool
 */
function validateCSRFToken($token, $maxAge = 3600) {
    if (session_status() === PHP_SESSION_NONE) {
        return false;
    }
    
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
        return false;
    }
    
    // Verificar que el token coincida
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        return false;
    }
    
    // Verificar que no haya expirado
    if (time() - $_SESSION['csrf_token_time'] > $maxAge) {
        unset($_SESSION['csrf_token']);
        unset($_SESSION['csrf_token_time']);
        return false;
    }
    
    return true;
}

/**
 * Establece headers de seguridad adicionales
 * @return void
 */
function setSecurityHeaders() {
    // Prevenir clickjacking
    header('X-Frame-Options: SAMEORIGIN');
    
    // Prevenir MIME-type sniffing
    header('X-Content-Type-Options: nosniff');
    
    // Habilitar XSS Protection (navegadores antiguos)
    header('X-XSS-Protection: 1; mode=block');
    
    // Política de seguridad de contenido
    header('Content-Security-Policy: default-src \'self\'');
    
    // Strict Transport Security (solo HTTPS)
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        $maxAge = 31536000; // 1 año
        header("Strict-Transport-Security: max-age=$maxAge; includeSubDomains; preload");
    }
    
    // Referrer Policy
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

/**
 * Crea una cookie segura adicional
 * @param string $name Nombre de la cookie
 * @param string $value Valor de la cookie
 * @param array $options Opciones adicionales
 * @return bool
 */
function setSecureCookie($name, $value, $options = []) {
    $defaultOptions = [
        'expires' => time() + 86400, // 1 día
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Strict'
    ];
    
    $options = array_merge($defaultOptions, $options);
    
    return setcookie($name, $value, $options);
}

/**
 * Obtiene una cookie segura
 * @param string $name Nombre de la cookie
 * @return string|null
 */
function getSecureCookie($name) {
    return $_COOKIE[$name] ?? null;
}

/**
 * Elimina una cookie segura
 * @param string $name Nombre de la cookie
 * @return bool
 */
function deleteSecureCookie($name) {
    return setcookie($name, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
}
