<?php
require_once 'config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $auth = require_auth();
    $userId = $_GET['user_id'] ?? null;
    $courseId = $_GET['course_id'] ?? null;
    if (!$userId || !$courseId || (string)$auth['sub'] !== (string)$userId) {
        http_response_code(403);
        echo json_encode(["message" => "No tienes permisos para ver este progreso."]);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT lp.*
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        JOIN modules m ON m.id = l.module_id
        WHERE lp.user_id = ? AND m.course_id = ?
    ");
    $stmt->execute([$userId, $courseId]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $auth = require_auth();
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->user_id) && isset($data->lesson_id) && isset($data->is_completed)) {
        if ((string)$auth['sub'] !== (string)$data->user_id) {
            http_response_code(403);
            echo json_encode(["message" => "No tienes permisos para actualizar este progreso."]);
            exit();
        }
        try {
            // Check if progress entry exists
            $stmt = $pdo->prepare("SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?");
            $stmt->execute([$data->user_id, $data->lesson_id]);
            $existing = $stmt->fetch();
            
            if ($existing) {
                $updStmt = $pdo->prepare("UPDATE lesson_progress SET is_completed = ?, watched_seconds = ?, last_watched_at = NOW() WHERE id = ?");
                $updStmt->execute([$data->is_completed ? 1 : 0, intval($data->watched_seconds ?? 0), $existing['id']]);
            } else {
                $insStmt = $pdo->prepare("INSERT INTO lesson_progress (user_id, lesson_id, is_completed, watched_seconds, last_watched_at) VALUES (?, ?, ?, ?, NOW())");
                $insStmt->execute([$data->user_id, $data->lesson_id, $data->is_completed ? 1 : 0, intval($data->watched_seconds ?? 0)]);
            }
            
            // Calculate course progress percentage here if desired...
            // For now, simple return success
            
            http_response_code(200);
            echo json_encode(["message" => "Progress updated successfully"]);
        } catch (PDOException $e) {
            error_log('[Campus Progress] update error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(["message" => "No se pudo actualizar el progreso."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields."]);
    }
}
?>
