<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['user_id'])) {
        $user_id = $_GET['user_id'];
        
        $stmt = $pdo->prepare("SELECT e.*, c.title as course_title, c.cover_image 
                               FROM enrollments e 
                               JOIN courses c ON e.course_id = c.id 
                               WHERE e.user_id = ?");
        $stmt->execute([$user_id]);
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($enrollments);
    } else {
        $stmt = $pdo->query("SELECT e.*, c.title as course_title, c.cover_image 
                             FROM enrollments e 
                             JOIN courses c ON e.course_id = c.id 
                             ORDER BY e.enrolled_at DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->user_id) && isset($data->course_id)) {
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
                http_response_code(500);
                echo json_encode(["message" => "Enrollment failed: " . $e->getMessage()]);
            }
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Missing user_id or course_id."]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
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
