<?php
/**
 * login.php — Endpoint de autenticación
 * Campus Virtual CIIDEG
 */
require_once 'config.php';

// config.php ya maneja OPTIONS (preflight), CORS y Content-Type: application/json

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido."]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "JSON inválido en la solicitud."]);
    exit();
}

$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/ciideg_auth_' . md5($clientIp) . '.json';
$rate = file_exists($rateFile) ? json_decode(file_get_contents($rateFile), true) : ['failures' => 0, 'blocked_until' => 0];

if (($rate['blocked_until'] ?? 0) > time()) {
    http_response_code(429);
    echo json_encode(["success" => false, "message" => "Demasiados intentos fallidos. Intenta nuevamente en 15 minutos."]);
    exit();
}

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Correo y contrasena son requeridos."]);
    exit();
}

if (empty(trim($data->email)) || empty(trim($data->password))) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Correo y contrasena no pueden estar vacios."]);
    exit();
}

$email = strtolower(trim($data->email));

try {
    $stmt = $pdo->prepare("SELECT id, full_name, email, phone, password_hash, role, avatar, must_change_password FROM users WHERE LOWER(email) = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log('[Campus Login] DB error: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(["success" => false, "message" => "Error en el servidor. Intenta nuevamente."]);
    exit();
}

if (!$user || !password_verify($data->password, $user['password_hash'])) {
    $rate['failures'] = ($rate['failures'] ?? 0) + 1;
    if ($rate['failures'] > 5) {
        $rate['blocked_until'] = time() + (15 * 60);
    }
    file_put_contents($rateFile, json_encode($rate));
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Correo o contrasena invalidos."]);
    exit();
}

// Login exitoso — limpiar rate limiting
if (file_exists($rateFile)) {
    unlink($rateFile);
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Login successful",
    "user" => [
        "id"                 => (string)$user['id'],
        "fullName"           => $user['full_name'],
        "email"              => $user['email'],
        "phone"              => $user['phone'] ?? '',
        "role"               => $user['role'],
        "avatar"             => $user['avatar'] ?? '',
        "mustChangePassword" => (bool)$user['must_change_password']
    ]
]);
?>
