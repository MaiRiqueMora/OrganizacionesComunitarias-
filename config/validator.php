function required($value) {
    return isset($value) && trim($value) !== '';
}

function maxLength($value, $length) {
    return strlen($value) <= $length;
}

function email($value) {
    return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
}

function rut($value) {
    // Validación básica de RUT chileno
    $value = preg_replace('/[^0-9kK]/', '', $value);
    if (strlen($value) < 8 || strlen($value) > 9) return false;
    
    $dv = substr($value, -1);
    $numero = substr($value, 0, -1);
    
    $i = 2;
    $suma = 0;
    foreach (array_reverse(str_split($numero)) as $digit) {
        $suma += $digit * $i;
        $i = $i == 7 ? 2 : $i + 1;
    }
    
    $dv_calculado = 11 - ($suma % 11);
    $dv_calculado = $dv_calculado == 11 ? 0 : ($dv_calculado == 10 ? 'K' : $dv_calculado);
    
    return strtoupper($dv) == strtoupper($dv_calculado);
}

/* ============================================================
   Limitador de intentos de login
   ============================================================ */

/**
 * Verifica si el usuario ha excedido el límite de intentos de login
 * @param string $username Nombre de usuario
 * @param int $maxAttempts Máximo de intentos permitidos (default: 3)
 * @param int $lockTime Tiempo de bloqueo en segundos (default: 15 minutos)
 * @return array ['blocked' => bool, 'attempts' => int, 'remaining_time' => int]
 */
function checkLoginAttempts($username, $maxAttempts = 3, $lockTime = 900) {
    $cacheKey = 'login_attempts_' . md5(strtolower($username));
    
    // Obtener intentos almacenados
    $attempts = getLoginAttempts($username);
    
    // Si está bloqueado, verificar tiempo restante
    if (isset($attempts['blocked_until']) && time() < $attempts['blocked_until']) {
        return [
            'blocked' => true,
            'attempts' => $attempts['count'],
            'remaining_time' => $attempts['blocked_until'] - time(),
            'message' => 'Demasiados intentos fallidos. Por favor espere ' . ceil(($attempts['blocked_until'] - time()) / 60) . ' minutos.'
        ];
    }
    
    // Si el tiempo de bloqueo expiró, reiniciar contador
    if (isset($attempts['blocked_until']) && time() >= $attempts['blocked_until']) {
        clearLoginAttempts($username);
        $attempts = ['count' => 0];
    }
    
    return [
        'blocked' => false,
        'attempts' => $attempts['count'] ?? 0,
        'remaining_attempts' => $maxAttempts - ($attempts['count'] ?? 0),
        'message' => ''
    ];
}

/**
 * Registra un intento de login fallido
 * @param string $username Nombre de usuario
 * @param int $maxAttempts Máximo de intentos permitidos
 * @param int $lockTime Tiempo de bloqueo en segundos
 * @return array Estado actualizado
 */
function recordFailedLogin($username, $maxAttempts = 3, $lockTime = 900) {
    $cacheKey = 'login_attempts_' . md5(strtolower($username));
    $attempts = getLoginAttempts($username);
    
    // Incrementar contador
    $attempts['count'] = ($attempts['count'] ?? 0) + 1;
    $attempts['last_attempt'] = time();
    
    // Si alcanzó el límite, establecer bloqueo
    if ($attempts['count'] >= $maxAttempts) {
        $attempts['blocked_until'] = time() + $lockTime;
    }
    
    // Guardar en sesión
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION[$cacheKey] = $attempts;
    
    return checkLoginAttempts($username, $maxAttempts, $lockTime);
}

/**
 * Limpia los intentos de login fallidos (llamar al login exitoso)
 * @param string $username Nombre de usuario
 */
function clearLoginAttempts($username) {
    $cacheKey = 'login_attempts_' . md5(strtolower($username));
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    unset($_SESSION[$cacheKey]);
}

/**
 * Obtiene los intentos actuales de login
 * @param string $username Nombre de usuario
 * @return array Datos de intentos
 */
function getLoginAttempts($username) {
    $cacheKey = 'login_attempts_' . md5(strtolower($username));
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return $_SESSION[$cacheKey] ?? ['count' => 0];
}

/**
 * Genera un mensaje informativo sobre intentos restantes
 * @param array $attemptInfo Información de checkLoginAttempts
 * @return string Mensaje formateado
 */
function getLoginAttemptsMessage($attemptInfo) {
    if ($attemptInfo['blocked']) {
        return $attemptInfo['message'];
    }
    
    if ($attemptInfo['attempts'] > 0) {
        $remaining = $attemptInfo['remaining_attempts'];
        return "Intentos restantes: {$remaining}";
    }
    
    return '';
}

/* ============================================================
   Registro de accesos (Auditoría)
   ============================================================ */

/**
 * Registra un acceso exitoso al sistema
 * @param int $userId ID del usuario
 * @param string $username Nombre de usuario
 * @param array $additionalInfo Información adicional (IP, user agent, etc.)
 * @return bool True si se registró correctamente
 */
function logAcceso($userId, $username, $additionalInfo = []) {
    try {
        $pdo = getDB();
        
        $ip = $additionalInfo['ip'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $userAgent = $additionalInfo['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
        $navegador = extractBrowser($userAgent);
        $so = extractOS($userAgent);
        $dispositivo = detectDevice($userAgent);
        
        $stmt = $pdo->prepare("
            INSERT INTO accesos (
                usuario_id, username, ip_address, user_agent, 
                navegador, sistema_operativo, dispositivo, 
                fecha_acceso, session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ");
        
        $sessionId = session_id() ?: '';
        
        return $stmt->execute([
            $userId,
            $username,
            $ip,
            $userAgent,
            $navegador,
            $so,
            $dispositivo,
            $sessionId
        ]);
        
    } catch (Exception $e) {
        // Log error pero no interrumpir el login
        error_log("Error al registrar acceso: " . $e->getMessage());
        return false;
    }
}

/**
 * Registra un intento de login fallido
 * @param string $username Nombre de usuario (puede no existir)
 * @param string $reason Razón del fallo
 * @param array $additionalInfo Información adicional
 * @return bool True si se registró correctamente
 */
function logAccesoFallido($username, $reason = 'Credenciales incorrectas', $additionalInfo = []) {
    try {
        $pdo = getDB();
        
        $ip = $additionalInfo['ip'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $userAgent = $additionalInfo['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        $stmt = $pdo->prepare("
            INSERT INTO accesos_fallidos (
                username, ip_address, user_agent, 
                razon_fallo, fecha_intento
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        
        return $stmt->execute([
            $username,
            $ip,
            $userAgent,
            $reason
        ]);
        
    } catch (Exception $e) {
        error_log("Error al registrar acceso fallido: " . $e->getMessage());
        return false;
    }
}

/**
 * Registra el cierre de sesión
 * @param int $userId ID del usuario
 * @param string $username Nombre de usuario
 * @param int $sessionDuration Duración de la sesión en segundos
 * @return bool True si se registró correctamente
 */
function logLogout($userId, $username, $sessionDuration = null) {
    try {
        $pdo = getDB();
        
        $stmt = $pdo->prepare("
            UPDATE accesos 
            SET fecha_logout = CURRENT_TIMESTAMP,
                duracion_sesion = ?,
                logout_reason = 'Cierre manual'
            WHERE usuario_id = ? 
            AND fecha_logout IS NULL
            ORDER BY fecha_acceso DESC 
            LIMIT 1
        ");
        
        return $stmt->execute([$sessionDuration, $userId]);
        
    } catch (Exception $e) {
        error_log("Error al registrar logout: " . $e->getMessage());
        return false;
    }
}

/**
 * Extrae el nombre del navegador desde User Agent
 * @param string $userAgent
 * @return string
 */
function extractBrowser($userAgent) {
    $browsers = [
        'Chrome' => 'Chrome',
        'Firefox' => 'Firefox',
        'Safari' => 'Safari',
        'Edge' => 'Edge',
        'Opera' => 'Opera',
        'MSIE' => 'Internet Explorer'
    ];
    
    foreach ($browsers as $pattern => $name) {
        if (preg_match("/$pattern/i", $userAgent)) {
            return $name;
        }
    }
    
    return 'Desconocido';
}

/**
 * Extrae el sistema operativo desde User Agent
 * @param string $userAgent
 * @return string
 */
function extractOS($userAgent) {
    $oses = [
        'Windows' => 'Windows',
        'Mac' => 'macOS',
        'Linux' => 'Linux',
        'Android' => 'Android',
        'iOS' => 'iOS',
        'Ubuntu' => 'Ubuntu'
    ];
    
    foreach ($oses as $pattern => $name) {
        if (preg_match("/$pattern/i", $userAgent)) {
            return $name;
        }
    }
    
    return 'Desconocido';
}

/**
 * Detecta el tipo de dispositivo
 * @param string $userAgent
 * @return string
 */
function detectDevice($userAgent) {
    if (preg_match('/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i', $userAgent)) {
        if (preg_match('/iPad/i', $userAgent)) {
            return 'Tablet';
        }
        return 'Móvil';
    }
    
    return 'Desktop';
}

/**
 * Obtiene el historial de accesos de un usuario
 * @param int $userId ID del usuario
 * @param int $limit Límite de registros
 * @return array
 */
function getAccesosUsuario($userId, $limit = 50) {
    try {
        $pdo = getDB();
        
        $stmt = $pdo->prepare("
            SELECT * FROM accesos 
            WHERE usuario_id = ? 
            ORDER BY fecha_acceso DESC 
            LIMIT ?
        ");
        
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
        
    } catch (Exception $e) {
        error_log("Error al obtener accesos: " . $e->getMessage());
        return [];
    }
}