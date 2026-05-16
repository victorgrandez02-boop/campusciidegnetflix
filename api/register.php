<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Metodo no permitido."]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/ciideg_auth_' . md5($clientIp) . '.json';
$rate = file_exists($rateFile) ? json_decode(file_get_contents($rateFile), true) : ['failures' => 0, 'blocked_until' => 0];

if (($rate['blocked_until'] ?? 0) > time()) {
    http_response_code(429);
    echo json_encode(["message" => "Demasiados intentos fallidos. Intenta nuevamente en 15 minutos."]);
    exit();
}

if (!empty($data->website ?? '')) {
    http_response_code(202);
    echo json_encode(["message" => "Solicitud recibida."]);
    exit();
}

$startedAt = intval($data->form_started_at ?? 0);
if ($startedAt <= 0 || (time() * 1000 - $startedAt) < 4000) {
    $rate['failures'] = ($rate['failures'] ?? 0) + 1;
    if ($rate['failures'] > 5) {
        $rate['blocked_until'] = time() + (15 * 60);
    }
    file_put_contents($rateFile, json_encode($rate));
    http_response_code(400);
    echo json_encode(["message" => "El registro fue enviado demasiado rapido."]);
    exit();
}

$fullName = trim($data->full_name ?? '');
$email = strtolower(trim($data->email ?? ''));
$phone = trim($data->phone ?? '');
$password = $data->password ?? '';

if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^9[0-9]{8}$/', $phone) || strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["message" => "Datos de registro invalidos."]);
    exit();
}

try {
    $avatar = 'https://ui-avatars.com/api/?name=' . urlencode($fullName) . '&background=0D1117&color=ffffff&bold=true';
    if ($DB_TYPE === 'postgresql') {
        $stmt = $pdo->prepare("
            INSERT INTO users (full_name, email, phone, password_hash, role, avatar)
            VALUES (?, ?, ?, ?, 'ALUMNO', ?)
            RETURNING id, full_name, email, phone, role, avatar, must_change_password
        ");
        $stmt->execute([$fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $avatar]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, avatar) VALUES (?, ?, ?, ?, 'ALUMNO', ?)");
        $stmt->execute([$fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $avatar]);
        $userStmt = $pdo->prepare("SELECT id, full_name, email, phone, role, avatar, must_change_password FROM users WHERE id = ?");
        $userStmt->execute([$pdo->lastInsertId()]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    }
    if (file_exists($rateFile)) unlink($rateFile);

    http_response_code(201);
    echo json_encode([
        "message" => "Cuenta creada.",
        "user" => [
            "id" => (string)$user['id'],
            "fullName" => $user['full_name'],
            "email" => $user['email'],
            "phone" => $user['phone'],
            "role" => $user['role'],
            "avatar" => $user['avatar'],
            "mustChangePassword" => (bool)$user['must_change_password']
        ]
    ]);
} catch (PDOException $e) {
    http_response_code($e->getCode() === '23505' ? 409 : 500);
    echo json_encode(["message" => "No fue posible crear la cuenta."]);
}
?>
