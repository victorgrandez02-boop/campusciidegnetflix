<?php
require_once 'config.php';

// ============================================
// API DE PERFILES DE DOCENTES - PostgreSQL
// ============================================

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getTeacherProfile($pdo);
        break;
    case 'POST':
        updateTeacherProfile($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido"]);
}

// ============================================
// FUNCIONES
// ============================================

function getTeacherProfile($pdo) {
    $userId = $_GET['user_id'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de usuario requerido"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                u.id as user_id,
                u.full_name,
                u.email,
                u.avatar,
                u.role,
                tp.bio,
                tp.specialization,
                tp.experience,
                tp.linkedin_url,
                tp.twitter_url,
                tp.website_url
            FROM users u
            LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
            WHERE u.id = ? AND u.role = 'DOCENTE'
        ");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch();
        
        if (!$profile) {
            // Verificar si el usuario existe pero no tiene perfil
            $checkStmt = $pdo->prepare("SELECT id, full_name, email, avatar, role FROM users WHERE id = ?");
            $checkStmt->execute([$userId]);
            $user = $checkStmt->fetch();
            
            if ($user) {
                if ($user['role'] !== 'DOCENTE') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "El usuario no es docente"]);
                } else {
                    // Usuario es docente pero no tiene perfil creado
                    echo json_encode([
                        "success" => true,
                        "profile" => [
                            "user_id" => $user['id'],
                            "full_name" => $user['full_name'],
                            "email" => $user['email'],
                            "avatar" => $user['avatar'],
                            "bio" => null,
                            "specialization" => null,
                            "experience" => null,
                            "linkedin_url" => null,
                            "twitter_url" => null,
                            "website_url" => null
                        ]
                    ]);
                }
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
            }
            exit();
        }
        
        echo json_encode(["success" => true, "profile" => $profile]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
}

function updateTeacherProfile($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['user_id'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de usuario requerido"]);
        exit();
    }
    
    // Verificar que el usuario es docente
    $checkStmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
    $checkStmt->execute([$userId]);
    $user = $checkStmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
        exit();
    }
    
    if ($user['role'] !== 'DOCENTE') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "El usuario no es docente"]);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Verificar si ya existe el perfil
        $checkProfileStmt = $pdo->prepare("SELECT id FROM teacher_profiles WHERE user_id = ?");
        $checkProfileStmt->execute([$userId]);
        $existingProfile = $checkProfileStmt->fetch();
        
        if ($existingProfile) {
            // Actualizar perfil existente
            $stmt = $pdo->prepare("
                UPDATE teacher_profiles 
                SET bio = ?, 
                    specialization = ?, 
                    experience = ?, 
                    linkedin_url = ?, 
                    twitter_url = ?, 
                    website_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ");
            
            $stmt->execute([
                $data['bio'] ?? null,
                $data['specialization'] ?? null,
                $data['experience'] ?? null,
                $data['socialLinks']['linkedin'] ?? null,
                $data['socialLinks']['twitter'] ?? null,
                $data['socialLinks']['website'] ?? null,
                $userId
            ]);
        } else {
            // Crear nuevo perfil
            $stmt = $pdo->prepare("
                INSERT INTO teacher_profiles (user_id, bio, specialization, experience, 
                                           linkedin_url, twitter_url, website_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $userId,
                $data['bio'] ?? null,
                $data['specialization'] ?? null,
                $data['experience'] ?? null,
                $data['socialLinks']['linkedin'] ?? null,
                $data['socialLinks']['twitter'] ?? null,
                $data['socialLinks']['website'] ?? null
            ]);
        }
        
        // También actualizar los campos en la tabla users
        $userUpdateStmt = $pdo->prepare("
            UPDATE users 
            SET bio = ?, specialization = ?, experience = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $userUpdateStmt->execute([
            $data['bio'] ?? null,
            $data['specialization'] ?? null,
            $data['experience'] ?? null,
            $userId
        ]);
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Perfil actualizado exitosamente"]);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
    }
}
?>
