<?php
/**
 * ============================================
 * config.php — Configuración segura para PRODUCCIÓN
 * Campus Virtual CIIDEG
 * ============================================
 */

// ============================================
// 1. DETECCIÓN DE ENTORNO
// ============================================
$appEnv = getenv('APP_ENV') ?: 'production';
$isDev  = $appEnv === 'development';

// ============================================
// 2. CORS — crítico para que el frontend pueda hacer fetch a la API
// ============================================
$allowedOrigin = getenv('CORS_ALLOWED_ORIGIN') ?: '';

// En desarrollo se permite localhost
if ($isDev && empty($allowedOrigin)) {
    $allowedOrigin = 'http://localhost:3000';
}

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Si el origen de la solicitud coincide con el permitido, habilitamos CORS
if (!empty($allowedOrigin) && ($allowedOrigin === '*' || $requestOrigin === $allowedOrigin)) {
    header("Access-Control-Allow-Origin: $requestOrigin");
    header("Vary: Origin");
} elseif (empty($allowedOrigin) && $isDev) {
    // Sin restricción de origen configurada — permitir cualquiera (SOLO para dev local sin Docker)
    header("Access-Control-Allow-Origin: *");
} elseif (empty($allowedOrigin)) {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'Servicio no disponible. Falta configurar CORS_ALLOWED_ORIGIN.']);
    exit();
} else {
    // Origen no permitido — no enviamos el header ACAO
    // El navegador bloqueará la respuesta automáticamente
}

header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: false");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// ============================================
// 3. HEADERS DE SEGURIDAD HTTP
// ============================================
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");

// ============================================
// 4. MANEJAR PREFLIGHT OPTIONS
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// ============================================
// 5. RATE LIMITING BÁSICO (requiere APCu)
// ============================================
if (function_exists('apcu_fetch') && !$isDev) {
    $clientIp  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateKey   = 'rate_' . md5($clientIp);
    $limit     = 200;   // máx. requests por ventana
    $window    = 60;    // ventana en segundos

    $count = apcu_fetch($rateKey, $success);
    if (!$success) {
        apcu_store($rateKey, 1, $window);
    } elseif ($count >= $limit) {
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'Too many requests. Intenta mas tarde.']);
        exit();
    } else {
        apcu_inc($rateKey);
    }
}

// ============================================
// 6. CONFIGURACIÓN DE BASE DE DATOS (solo env vars)
// ============================================
$DB_TYPE = getenv('DB_TYPE') ?: 'postgresql';

// PostgreSQL (preferido)
$PG_HOST     = getenv('PG_HOST');
$PG_PORT     = getenv('PG_PORT')     ?: '5432';
$PG_DB_NAME  = getenv('PG_DB_NAME');
$PG_USERNAME = getenv('PG_USERNAME');
$PG_PASSWORD = getenv('PG_PASSWORD');

// MySQL (alternativo)
$MYSQL_HOST     = getenv('MYSQL_HOST');
$MYSQL_DB_NAME  = getenv('MYSQL_DB_NAME');
$MYSQL_USERNAME = getenv('MYSQL_USERNAME');
$MYSQL_PASSWORD = getenv('MYSQL_PASSWORD');

// Validación: asegurarse de que las variables críticas están definidas
if ($DB_TYPE === 'postgresql') {
    if (empty($PG_HOST) || empty($PG_DB_NAME) || empty($PG_USERNAME)) {
        error_log('[Campus] Faltan variables de entorno de PostgreSQL. PG_HOST=' . $PG_HOST . ' PG_DB_NAME=' . $PG_DB_NAME . ' PG_USERNAME=' . $PG_USERNAME);
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Servicio no disponible. Verifica la configuracion del servidor.']);
        exit();
    }
} else {
    if (empty($MYSQL_HOST) || empty($MYSQL_DB_NAME) || empty($MYSQL_USERNAME)) {
        error_log('[Campus] Faltan variables de entorno de MySQL.');
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Servicio no disponible. Verifica la configuracion del servidor.']);
        exit();
    }
}

// ============================================
// 7. CONEXIÓN A LA BASE DE DATOS
// ============================================
try {
    if ($DB_TYPE === 'postgresql') {
        $dsn = "pgsql:host=$PG_HOST;port=$PG_PORT;dbname=$PG_DB_NAME;";
        $pdo = new PDO($dsn, $PG_USERNAME, $PG_PASSWORD);
    } else {
        $dsn = "mysql:host=$MYSQL_HOST;dbname=$MYSQL_DB_NAME;charset=utf8mb4";
        $pdo = new PDO($dsn, $MYSQL_USERNAME, $MYSQL_PASSWORD);
    }

    // Opciones de seguridad PDO
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

} catch (PDOException $exception) {
    // Loguear detalle en el servidor — nunca exponer al cliente
    error_log('[Campus] Database connection error: ' . $exception->getMessage());
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo conectar a la base de datos. Contacta al administrador.',
    ]);
    exit();
}
?>
