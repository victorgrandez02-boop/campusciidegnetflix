<?php
require_once 'config.php';

// ============================================
// API DE CURSOS - PostgreSQL
// ============================================

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getCourses($pdo);
        break;
    case 'POST':
        createCourse($pdo);
        break;
    case 'PUT':
        updateCourse($pdo);
        break;
    case 'PATCH':
        updateCourseModules($pdo);
        break;
    case 'DELETE':
        deleteCourse($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido"]);
}

// ============================================
// FUNCIONES
// ============================================

function getCourses($pdo) {
    // Obtener un curso específico
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        
        $stmt = $pdo->prepare("SELECT * FROM courses WHERE id = ?");
        $stmt->execute([$id]);
        $course = $stmt->fetch();
        
        if (!$course) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Curso no encontrado"]);
            exit();
        }
        
        // Obtener módulos
        $modStmt = $pdo->prepare("SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC");
        $modStmt->execute([$id]);
        $modules = $modStmt->fetchAll();
        
        // Obtener lecciones y materiales para cada módulo
        foreach ($modules as &$module) {
            $lesStmt = $pdo->prepare("SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order ASC");
            $lesStmt->execute([$module['id']]);
            $lessons = $lesStmt->fetchAll();
            
            foreach ($lessons as &$lesson) {
                $matStmt = $pdo->prepare("SELECT * FROM materials WHERE lesson_id = ?");
                $matStmt->execute([$lesson['id']]);
                $lesson['materials'] = $matStmt->fetchAll();
            }
            $module['lessons'] = $lessons;
        }
        $course['modules'] = $modules;
        
        echo json_encode($course);
        
    } else {
        // Obtener todos los cursos
        $category = $_GET['category'] ?? null;
        
        if ($category) {
            $stmt = $pdo->prepare("SELECT * FROM courses WHERE category = ? ORDER BY created_at DESC");
            $stmt->execute([$category]);
        } else {
            $stmt = $pdo->query("SELECT * FROM courses ORDER BY created_at DESC");
        }
        
        $courses = $stmt->fetchAll();
        echo json_encode($courses);
    }
}

function createCourse($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['instructor'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Título e instructor son requeridos"]);
        exit();
    }
    
    try {
        if (!empty($data['is_featured'])) {
            $pdo->exec("UPDATE courses SET is_featured = FALSE");
        }

        $stmt = $pdo->prepare("
            INSERT INTO courses (title, description, cover_image, poster_image, price, duration, 
                                level, category, instructor, instructor_id, rating, is_featured) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ");
        
        $stmt->execute([
            $data['title'],
            $data['description'] ?? '',
            $data['cover_image'] ?? '',
            $data['poster_image'] ?? '',
            $data['price'] ?? 0,
            $data['duration'] ?? '',
            $data['level'] ?? 'Principiante',
            $data['category'] ?? '',
            $data['instructor'] ?? '',
            $data['instructor_id'] ?? null,
            $data['rating'] ?? 0,
            $data['is_featured'] ?? false
        ]);
        
        $courseId = $stmt->fetchColumn();
        
        echo json_encode([
            "success" => true, 
            "message" => "Curso creado exitosamente",
            "course_id" => $courseId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al crear curso: " . $e->getMessage()]);
    }
}

function updateCourse($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de curso requerido"]);
        exit();
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        if (!empty($data['is_featured'])) {
            $clearStmt = $pdo->prepare("UPDATE courses SET is_featured = FALSE WHERE id <> ?");
            $clearStmt->execute([$id]);
        }

        $stmt = $pdo->prepare("
            UPDATE courses 
            SET title = ?, description = ?, cover_image = ?, poster_image = ?, 
                price = ?, duration = ?, level = ?, category = ?, 
                instructor = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['title'],
            $data['description'],
            $data['cover_image'],
            $data['poster_image'],
            $data['price'],
            $data['duration'],
            $data['level'],
            $data['category'],
            $data['instructor'],
            $data['is_featured'],
            $id
        ]);
        
        echo json_encode(["success" => true, "message" => "Curso actualizado exitosamente"]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar curso: " . $e->getMessage()]);
    }
}

function updateCourseModules($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de curso requerido"]);
        exit();
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['modules']) || !is_array($data['modules'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Módulos requeridos"]);
        exit();
    }
    
    try {
        $pdo->beginTransaction();
        
        // Eliminar módulos existentes (cascade eliminará lecciones y materiales)
        $delStmt = $pdo->prepare("DELETE FROM modules WHERE course_id = ?");
        $delStmt->execute([$id]);
        
        // Insertar nuevos módulos
        foreach ($data['modules'] as $index => $module) {
            $modStmt = $pdo->prepare("
                INSERT INTO modules (course_id, title, sort_order) 
                VALUES (?, ?, ?) RETURNING id
            ");
            $modStmt->execute([$id, $module['title'], $index]);
            $moduleId = $modStmt->fetchColumn();
            
            // Insertar lecciones
            if (isset($module['lessons']) && is_array($module['lessons'])) {
                foreach ($module['lessons'] as $lessonIndex => $lesson) {
                    $lesStmt = $pdo->prepare("
                        INSERT INTO lessons (module_id, title, duration, youtube_id, sort_order) 
                        VALUES (?, ?, ?, ?, ?) RETURNING id
                    ");
                    $lesStmt->execute([
                        $moduleId, 
                        $lesson['title'], 
                        $lesson['duration'] ?? '', 
                        $lesson['youtubeId'] ?? '', 
                        $lessonIndex
                    ]);
                    $lessonId = $lesStmt->fetchColumn();
                    
                    // Insertar materiales si existen
                    if (isset($lesson['materials']) && is_array($lesson['materials'])) {
                        foreach ($lesson['materials'] as $material) {
                            $matStmt = $pdo->prepare("
                                INSERT INTO materials (lesson_id, title, type, url) 
                                VALUES (?, ?, ?, ?)
                            ");
                            $matStmt->execute([
                                $lessonId, 
                                $material['title'], 
                                $material['type'] ?? 'LINK', 
                                $material['url']
                            ]);
                        }
                    }
                }
            }
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Módulos actualizados exitosamente"]);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al actualizar módulos: " . $e->getMessage()]);
    }
}

function deleteCourse($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de curso requerido"]);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM courses WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(["success" => true, "message" => "Curso eliminado exitosamente"]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error al eliminar curso: " . $e->getMessage()]);
    }
}
?>
