<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Basic security check: in production, verify admin token here
    
    $stmt = $pdo->query("SELECT id, full_name, email, phone, role, must_change_password, created_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Transform keys to match frontend expectation if needed, or handle in frontend
    $mappedUsers = array_map(function($u) {
        return [
            "id" => (string)$u['id'],
            "fullName" => $u['full_name'],
            "email" => $u['email'],
            "phone" => $u['phone'],
            "role" => $u['role'],
            "mustChangePassword" => (bool)$u['must_change_password'],
            "joinedAt" => $u['created_at']
        ];
    }, $users);

    echo json_encode($mappedUsers);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $action = $_GET['action'] ?? '';

    if ($action === 'reset-password') {
        $userId = $data->user_id ?? null;
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["message" => "ID de usuario requerido."]);
            exit();
        }
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ? AND role = 'ALUMNO'");
        $stmt->execute([password_hash('Temporal123', PASSWORD_DEFAULT), $userId]);
        echo json_encode(["message" => "Clave temporal asignada."]);
        exit();
    }

    if ($action === 'change-password') {
        $userId = $data->user_id ?? null;
        $currentPassword = $data->current_password ?? '';
        $newPassword = $data->new_password ?? '';
        if (!$userId || strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(["message" => "Datos de contrasena invalidos."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(["message" => "La contrasena actual no es correcta."]);
            exit();
        }

        $update = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?");
        $update->execute([password_hash($newPassword, PASSWORD_DEFAULT), $userId]);
        echo json_encode(["message" => "Contrasena actualizada."]);
        exit();
    }

    $fullName = trim($data->fullName ?? $data->full_name ?? '');
    $email = strtolower(trim($data->email ?? ''));
    $phone = trim($data->phone ?? '');
    $password = $data->password ?? '';
    $role = $data->role ?? 'ALUMNO';

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^9[0-9]{8}$/', $phone) || strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(["message" => "Datos de usuario invalidos."]);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?, ?)");
    $avatar = 'https://ui-avatars.com/api/?name=' . urlencode($fullName) . '&background=0D1117&color=ffffff&bold=true';
    $stmt->execute([$fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $role, $avatar]);
    http_response_code(201);
    echo json_encode(["message" => "Usuario creado."]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["message" => "ID de usuario requerido."]);
        exit();
    }

    $fullName = trim($data->fullName ?? $data->full_name ?? '');
    $email = strtolower(trim($data->email ?? ''));
    $phone = trim($data->phone ?? '');
    $role = $data->role ?? 'ALUMNO';
    $mustChange = !empty($data->mustChangePassword ?? $data->must_change_password ?? false);

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^9[0-9]{8}$/', $phone)) {
        http_response_code(400);
        echo json_encode(["message" => "Datos de usuario invalidos."]);
        exit();
    }

    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, must_change_password = ? WHERE id = ?");
    $stmt->execute([$fullName, $email, $phone, $role, $mustChange, $userId]);
    echo json_encode(["message" => "Usuario actualizado."]);
}
?>
