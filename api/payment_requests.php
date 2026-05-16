<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $status = $_GET['status'] ?? null;
    if ($status) {
        $stmt = $pdo->prepare("SELECT * FROM payment_requests WHERE status = ? ORDER BY submitted_at DESC");
        $stmt->execute([$status]);
    } else {
        $stmt = $pdo->query("SELECT * FROM payment_requests ORDER BY submitted_at DESC");
    }
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $action = $_GET['action'] ?? 'create';

    if ($action === 'approve' || $action === 'reject') {
        $requestId = $data->request_id ?? null;
        $note = trim($data->note ?? '');
        if (!$requestId) {
            http_response_code(400);
            echo json_encode(["message" => "Solicitud requerida."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM payment_requests WHERE id = ?");
        $stmt->execute([$requestId]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$request) {
            http_response_code(404);
            echo json_encode(["message" => "Solicitud no encontrada."]);
            exit();
        }

        $pdo->beginTransaction();
        if ($action === 'approve') {
            $upd = $pdo->prepare("UPDATE payment_requests SET status = 'approved', gestor_note = ? WHERE id = ?");
            $upd->execute([$note ?: null, $requestId]);

            $enroll = $pdo->prepare("
                INSERT INTO enrollments (user_id, course_id, status, progress)
                VALUES (?, ?, 'ACTIVE', 0)
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
            ");
            $enroll->execute([$request['user_id'], $request['course_id']]);
        } else {
            $upd = $pdo->prepare("UPDATE payment_requests SET status = 'rejected', gestor_note = ? WHERE id = ?");
            $upd->execute([$note ?: null, $requestId]);

            $del = $pdo->prepare("DELETE FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'PENDING_PAYMENT'");
            $del->execute([$request['user_id'], $request['course_id']]);
        }
        $pdo->commit();

        echo json_encode(["message" => $action === 'approve' ? "Acceso aprobado." : "Solicitud rechazada."]);
        exit();
    }

    $required = ['user_id', 'course_id', 'user_name', 'user_email', 'course_title', 'payment_date'];
    foreach ($required as $field) {
        if (!isset($data->$field) || trim((string)$data->$field) === '') {
            http_response_code(400);
            echo json_encode(["message" => "Falta el campo $field."]);
            exit();
        }
    }

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("
            INSERT INTO payment_requests
                (user_id, course_id, user_name, user_email, course_title, amount, voucher_image, payment_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data->user_id,
            $data->course_id,
            trim($data->user_name),
            strtolower(trim($data->user_email)),
            trim($data->course_title),
            $data->amount ?? 0,
            $data->voucher_image ?? '',
            $data->payment_date,
        ]);

        $enroll = $pdo->prepare("
            INSERT INTO enrollments (user_id, course_id, status, progress)
            VALUES (?, ?, 'PENDING_PAYMENT', 0)
            ON CONFLICT (user_id, course_id)
            DO NOTHING
        ");
        $enroll->execute([$data->user_id, $data->course_id]);
        $pdo->commit();

        http_response_code(201);
        echo json_encode(["message" => "Comprobante registrado."]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["message" => "No se pudo registrar el comprobante."]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["message" => "Metodo no permitido."]);
?>
