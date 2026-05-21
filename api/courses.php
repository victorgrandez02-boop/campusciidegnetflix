<?php
require_once 'config.php';
require_once 'auth.php';
require_once 'sanitize.php';

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
    $auth = require_roles(['ADMIN', 'GESTOR', 'DOCENTE']);
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['title']) || !isset($data['instructor'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Título e instructor son requeridos"]);
        exit();
    }
    
    try {
        $isFeatured = !empty($data['is_featured']) ? 'true' : 'false';

        if ($isFeatured === 'true') {
            $pdo->exec("UPDATE courses SET is_featured = FALSE");
        }

        $instructorId = $auth['role'] === 'DOCENTE' ? $auth['sub'] : ($data['instructor_id'] ?? null);

        $stmt = $pdo->prepare("
            INSERT INTO courses (title, description, cover_image, poster_image, price, duration, 
                                level, category, instructor, instructor_id, rating, is_featured) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ");
        
        $stmt->execute([
            sanitize_plain_text($data['title'], 150),
            sanitize_plain_text($data['description'] ?? '', 5000),
            trim($data['cover_image'] ?? ''),
            trim($data['poster_image'] ?? ''),
            $data['price'] ?? 0,
            sanitize_plain_text($data['duration'] ?? '', 50),
            $data['level'] ?? 'Principiante',
            sanitize_plain_text($data['category'] ?? '', 50),
            sanitize_plain_text($data['instructor'] ?? '', 100),
            $instructorId,
            $data['rating'] ?? 0,
            $isFeatured
        ]);
        
        $courseId = $stmt->fetchColumn();
        
        echo json_encode([
            "success" => true, 
            "message" => "Curso creado exitosamente",
            "course_id" => $courseId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('[Campus Courses] create error: ' . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Error al crear curso."]);
    }
}

function updateCourse($pdo) {
    $auth = require_roles(['ADMIN', 'GESTOR', 'DOCENTE']);
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de curso requerido"]);
        exit();
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        if ($auth['role'] === 'DOCENTE') {
            $ownerStmt = $pdo->prepare("SELECT instructor_id FROM courses WHERE id = ?");
            $ownerStmt->execute([$id]);
            if ((string)$ownerStmt->fetchColumn() !== (string)$auth['sub']) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "No tienes permisos para editar este curso."]);
                exit();
            }
        }

        $isFeatured = !empty($data['is_featured']) ? 'true' : 'false';

        if ($isFeatured === 'true') {
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
            sanitize_plain_text($data['title'], 150),
            sanitize_plain_text($data['description'], 5000),
            trim($data['cover_image']),
            trim($data['poster_image']),
            $data['price'],
            sanitize_plain_text($data['duration'], 50),
            $data['level'],
            sanitize_plain_text($data['category'], 50),
            sanitize_plain_text($data['instructor'], 100),
            $isFeatured,
            $id
        ]);
        
        echo json_encode(["success" => true, "message" => "Curso actualizado exitosamente"]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('[Campus Courses] update error: ' . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Error al actualizar curso."]);
    }
}

function updateCourseModules($pdo) {
    $auth = require_roles(['ADMIN', 'GESTOR', 'DOCENTE']);
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID de curso requerido"]);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['modules']) || !is_array($data['modules'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Modulos requeridos"]);
        exit();
    }

    try {
        // Verificar que el curso existe antes de operar
        $checkStmt = $pdo->prepare("SELECT id FROM courses WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Curso no encontrado"]);
            exit();
        }

        if ($auth['role'] === 'DOCENTE') {
            $ownerStmt = $pdo->prepare("SELECT instructor_id FROM courses WHERE id = ?");
            $ownerStmt->execute([$id]);
            if ((string)$ownerStmt->fetchColumn() !== (string)$auth['sub']) {
                http_response_code(403);
                echo json_encode(["success" => false, "message" => "No tienes permisos para editar este curso."]);
                exit();
            }
        }

        $pdo->beginTransaction();

        // Eliminar módulos existentes (cascade eliminará lecciones y materiales)
        $delStmt = $pdo->prepare("DELETE FROM modules WHERE course_id = ?");
        $delStmt->execute([$id]);

        // Insertar nuevos módulos
        foreach ($data['modules'] as $index => $module) {
            if (empty(trim($module['title'] ?? ''))) continue; // Ignorar módulos sin título

            $modStmt = $pdo->prepare("
                INSERT INTO modules (course_id, title, sort_order)
                VALUES (?, ?, ?) RETURNING id
            ");
            $modStmt->execute([$id, sanitize_plain_text($module['title'] ?? '', 150), $index]);
            $moduleId = $modStmt->fetchColumn();

            // Insertar lecciones
            if (isset($module['lessons']) && is_array($module['lessons'])) {
                foreach ($module['lessons'] as $lessonIndex => $lesson) {
                    if (empty(trim($lesson['title'] ?? ''))) continue; // Ignorar lecciones sin título

                    $youtubeId = sanitize_plain_text(
                        $lesson['youtubeId'] ?? $lesson['youtube_id'] ?? '',
                        50
                    );

                    $lesStmt = $pdo->prepare("
                        INSERT INTO lessons (module_id, title, duration, youtube_id, sort_order)
                        VALUES (?, ?, ?, ?, ?) RETURNING id
                    ");
                    $lesStmt->execute([
                        $moduleId,
                        sanitize_plain_text($lesson['title'] ?? '', 150),
                        sanitize_plain_text($lesson['duration'] ?? '0 min', 20),
                        $youtubeId,
                        $lessonIndex
                    ]);
                    $lessonId = $lesStmt->fetchColumn();

                    // Insertar materiales si existen
                    if (isset($lesson['materials']) && is_array($lesson['materials'])) {
                        foreach ($lesson['materials'] as $material) {
                            $cleanMaterial = sanitize_material_payload($material);
                            $matStmt = $pdo->prepare("
                                INSERT INTO materials (lesson_id, title, type, url)
                                VALUES (?, ?, ?, ?)
                            ");
                            $matStmt->execute([
                                $lessonId,
                                $cleanMaterial['title'],
                                $cleanMaterial['type'],
                                $cleanMaterial['url']
                            ]);
                        }
                    }
                }
            }
        }

        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Modulos actualizados exitosamente"]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        error_log('[Campus Courses] modules error: ' . $e->getMessage());

        // En modo desarrollo se expone el detalle del error para facilitar el diagnóstico
        $isDev = (getenv('APP_ENV') ?: 'production') !== 'production';
        echo json_encode([
            "success" => false,
            "message" => "Error al actualizar modulos.",
            "error"   => $isDev ? $e->getMessage() : null,
        ]);
    }
}

function deleteCourse($pdo) {
    require_roles(['ADMIN', 'GESTOR']);
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
        error_log('[Campus Courses] delete error: ' . $e->getMessage());
        echo json_encode(["success" => false, "message" => "Error al eliminar curso."]);
    }
}
?>
