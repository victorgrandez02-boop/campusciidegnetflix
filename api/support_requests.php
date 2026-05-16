<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT sr.*, u.full_name AS user_name
        FROM support_requests sr
        LEFT JOIN users u ON u.id = sr.user_id
        ORDER BY sr.created_at DESC
    ");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $action = $_GET['action'] ?? 'create';

    if ($action === 'reset-temporary') {
        $requestId = $data->request_id ?? null;
        $attendedBy = $data->attended_by ?? null;
        if (!$requestId) {
            http_response_code(400);
            echo json_encode(["message" => "Solicitud requerida."]);
            exit();
        }

        $stmt = $pdo->prepare("
            SELECT sr.id, sr.email, COALESCE(sr.user_id, u.id) AS user_id
            FROM support_requests sr
            LEFT JOIN users u ON LOWER(u.email) = LOWER(sr.email)
            WHERE sr.id = ?
        ");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request || !$request['user_id']) {
            http_response_code(404);
            echo json_encode(["message" => "Alumno no encontrado."]);
            exit();
        }

        $pdo->beginTransaction();
        $reset = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ? AND role = 'ALUMNO'");
        $reset->execute([password_hash('Temporal123', PASSWORD_DEFAULT), $request['user_id']]);
        $mark = $pdo->prepare("UPDATE support_requests SET user_id = ?, status = 'attended', attended_at = CURRENT_TIMESTAMP, attended_by = ? WHERE id = ?");
        $mark->execute([$request['user_id'], $attendedBy, $requestId]);
        $pdo->commit();

        echo json_encode(["message" => "Clave temporal asignada."]);
        exit();
    }

    $email = strtolower(trim($data->email ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["message" => "Correo invalido."]);
        exit();
    }

    $userStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1");
    $userStmt->execute([$email]);
    $userId = $userStmt->fetchColumn() ?: null;

    $stmt = $pdo->prepare("INSERT INTO support_requests (email, user_id) VALUES (?, ?)");
    $stmt->execute([$email, $userId]);
    http_response_code(201);
    echo json_encode(["message" => "Solicitud registrada."]);
    exit();
}

http_response_code(405);
echo json_encode(["message" => "Metodo no permitido."]);
?>
