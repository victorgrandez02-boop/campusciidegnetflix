<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->user_id) && isset($data->lesson_id) && isset($data->is_completed)) {
        try {
            // Check if progress entry exists
            $stmt = $pdo->prepare("SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?");
            $stmt->execute([$data->user_id, $data->lesson_id]);
            $existing = $stmt->fetch();
            
            if ($existing) {
                $updStmt = $pdo->prepare("UPDATE lesson_progress SET is_completed = ?, last_watched_at = NOW() WHERE id = ?");
                $updStmt->execute([$data->is_completed ? 1 : 0, $existing['id']]);
            } else {
                $insStmt = $pdo->prepare("INSERT INTO lesson_progress (user_id, lesson_id, is_completed, last_watched_at) VALUES (?, ?, ?, NOW())");
                $insStmt->execute([$data->user_id, $data->lesson_id, $data->is_completed ? 1 : 0]);
            }
            
            // Calculate course progress percentage here if desired...
            // For now, simple return success
            
            http_response_code(200);
            echo json_encode(["message" => "Progress updated successfully"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update progress: " . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields."]);
    }
}
?>
