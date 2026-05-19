<?php
require_once 'config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $auth = require_auth();
    if (isset($_GET['user_id'])) {
        $user_id = $_GET['user_id'];
        if ((string)$auth['sub'] !== (string)$user_id && !in_array($auth['role'], ['ADMIN', 'GESTOR'], true)) {
            http_response_code(403);
            echo json_encode(["message" => "No tienes permisos para ver estas inscripciones."]);
            exit();
        }
        
        $stmt = $pdo->prepare("SELECT e.*, c.title as course_title, c.cover_image 
                               FROM enrollments e 
                               JOIN courses c ON e.course_id = c.id 
                               WHERE e.user_id = ?");
        $stmt->execute([$user_id]);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($enrollments);
    } else {
        require_roles(['ADMIN', 'GESTOR']);
        $stmt = $pdo->query("SELECT e.*, c.title as course_title, c.cover_image 
                             FROM enrollments e 
                             JOIN courses c ON e.course_id = c.id 
                             ORDER BY e.enrolled_at DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $auth = require_auth();
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->user_id) && isset($data->course_id)) {
        if ((string)$auth['sub'] !== (string)$data->user_id && !in_array($auth['role'], ['ADMIN', 'GESTOR'], true)) {
            http_response_code(403);
            echo json_encode(["message" => "No tienes permisos para crear esta inscripcion."]);
            exit();
        }
        // Enforce uniqueness logic here or rely on unique constraint?
        // Let's rely on constraint and handle error gracefully.
        
        try {
            $stmt = $pdo->prepare("INSERT INTO enrollments (user_id, course_id, status, progress) VALUES (?, ?, 'PENDING', 0)");
            $stmt->execute([$data->user_id, $data->course_id]);
            
            http_response_code(201);
            echo json_encode(["message" => "Enrolled successfully", "enrollment_id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                http_response_code(409);
                echo json_encode(["message" => "Already enrolled."]);
            } else {
                error_log('[Campus Enrollments] create error: ' . $e->getMessage());
                http_response_code(500);
                echo json_encode(["message" => "No se pudo registrar la inscripcion."]);
            }
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Missing user_id or course_id."]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    require_roles(['ADMIN', 'GESTOR']);
    $data = json_decode(file_get_contents("php://input"));
    $id = $_GET['id'] ?? null;
    $status = $data->status ?? null;
    $allowed = ['PENDING', 'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'LOCKED'];

    if (!$id || !in_array($status, $allowed, true)) {
        http_response_code(400);
        echo json_encode(["message" => "ID y estado valido son requeridos."]);
        exit();
    }

    $stmt = $pdo->prepare("UPDATE enrollments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$status, $id]);
    echo json_encode(["message" => "Inscripcion actualizada."]);
}
?>
