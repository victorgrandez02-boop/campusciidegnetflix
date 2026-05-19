<?php
require_once 'config.php';
require_once 'auth.php';
require_once 'sanitize.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function map_user(array $u): array {
    return [
        "id" => (string)$u['id'],
        "fullName" => $u['full_name'],
        "email" => $u['email'],
        "phone" => $u['phone'] ?? '',
        "role" => $u['role'],
        "avatar" => $u['avatar'] ?? '',
        "mustChangePassword" => (bool)$u['must_change_password'],
        "createdAt" => $u['created_at'] ?? null,
        "updatedAt" => $u['updated_at'] ?? null,
    ];
}

if ($method === 'GET' && $action === 'me') {
    $auth = require_auth();
    $stmt = $pdo->prepare("SELECT id, full_name, email, phone, role, avatar, must_change_password, created_at, updated_at FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(404);
        echo json_encode(["message" => "Usuario no encontrado."]);
        exit();
    }
    echo json_encode(map_user($user));
    exit();
}

if ($method === 'GET') {
    require_roles(['ADMIN', 'GESTOR']);
    $stmt = $pdo->query("SELECT id, full_name, email, phone, role, avatar, must_change_password, created_at, updated_at FROM users ORDER BY created_at DESC");
    echo json_encode(array_map('map_user', $stmt->fetchAll(PDO::FETCH_ASSOC)));
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["message" => "JSON invalido."]);
        exit();
    }

    if ($action === 'reset-password') {
        require_roles(['ADMIN', 'GESTOR']);
        $userId = $data->user_id ?? null;
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["message" => "ID de usuario requerido."]);
            exit();
        }
        $temporary = $data->temporary_password ?? (bin2hex(random_bytes(6)) . '!');
        if (strlen($temporary) < 6) {
            http_response_code(400);
            echo json_encode(["message" => "Clave temporal invalida."]);
            exit();
        }
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ? AND role = 'ALUMNO'");
        $stmt->execute([password_hash($temporary, PASSWORD_DEFAULT), $userId]);
        echo json_encode(["message" => "Clave temporal asignada.", "temporary_password" => $temporary]);
        exit();
    }

    if ($action === 'change-password') {
        $auth = require_auth();
        $userId = (string)($data->user_id ?? '');
        $currentPassword = $data->current_password ?? '';
        $newPassword = $data->new_password ?? '';
        if ($userId !== (string)$auth['sub'] || strlen($newPassword) < 6) {
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

    require_roles(['ADMIN', 'GESTOR']);
    $fullName = sanitize_plain_text($data->fullName ?? $data->full_name ?? '', 100);
    $email = strtolower(trim($data->email ?? ''));
    $phone = trim($data->phone ?? '');
    $password = $data->password ?? '';
    $role = $data->role ?? 'ALUMNO';
    $allowedRoles = ['ADMIN', 'GESTOR', 'DOCENTE', 'ALUMNO'];

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^9[0-9]{8}$/', $phone) || strlen($password) < 6 || !in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(["message" => "Datos de usuario invalidos."]);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?, ?)");
    $avatar = 'https://ui-avatars.com/api/?name=' . urlencode($fullName) . '&background=0D1117&color=ffffff&bold=true';
    $stmt->execute([$fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $role, $avatar]);
    http_response_code(201);
    echo json_encode(["message" => "Usuario creado."]);
    exit();
}

if ($method === 'PUT') {
    $auth = require_auth();
    $data = json_decode(file_get_contents("php://input"));
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["message" => "ID de usuario requerido."]);
        exit();
    }

    $canManageUsers = in_array($auth['role'], ['ADMIN', 'GESTOR'], true);
    if (!$canManageUsers && (string)$auth['sub'] !== (string)$userId) {
        http_response_code(403);
        echo json_encode(["message" => "No tienes permisos para actualizar este usuario."]);
        exit();
    }

    $fullName = sanitize_plain_text($data->fullName ?? $data->full_name ?? '', 100);
    $email = strtolower(trim($data->email ?? ''));
    $phone = trim($data->phone ?? '');
    $role = $canManageUsers ? ($data->role ?? 'ALUMNO') : $auth['role'];
    $mustChange = $canManageUsers ? !empty($data->mustChangePassword ?? $data->must_change_password ?? false) : false;
    $allowedRoles = ['ADMIN', 'GESTOR', 'DOCENTE', 'ALUMNO'];

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^9[0-9]{8}$/', $phone) || !in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(["message" => "Datos de usuario invalidos."]);
        exit();
    }

    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, must_change_password = ? WHERE id = ?");
    $stmt->execute([$fullName, $email, $phone, $role, $mustChange, $userId]);
    echo json_encode(["message" => "Usuario actualizado."]);
    exit();
}

http_response_code(405);
echo json_encode(["message" => "Metodo no permitido."]);
?>
