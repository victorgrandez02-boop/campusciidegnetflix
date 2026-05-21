-- ============================================
-- CAMPUS VIRTUAL NETFLIX STYLE - PostgreSQL
-- ============================================
-- Base de datos completa para PostgreSQL 14+
-- Incluye: Usuarios, Cursos, Módulos, Lecciones, 
--          Materiales, Inscripciones, Progreso, Perfiles Docente
-- ============================================

-- Eliminar tablas si existen (en orden inverso de dependencias)
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS support_requests CASCADE;
DROP TABLE IF EXISTS teacher_profiles CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLA: users (Usuarios del sistema)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(9) NOT NULL DEFAULT '900000000' CHECK (phone ~ '^9[0-9]{8}$'),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ALUMNO' CHECK (role IN ('ADMIN', 'GESTOR', 'DOCENTE', 'ALUMNO')),
    avatar VARCHAR(255) DEFAULT 'https://ui-avatars.com/api/?name=Default&background=random',
    must_change_password BOOLEAN DEFAULT FALSE,
    bio TEXT,
    specialization VARCHAR(150),
    experience TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: system_settings (Configuración del sistema)
-- ============================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_value TEXT,
    data_type VARCHAR(20) CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key_name);

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: teacher_profiles (Perfiles de docentes)
-- ============================================
CREATE TABLE teacher_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    specialization VARCHAR(150),
    experience TEXT,
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),
    website_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_teacher_profiles_updated_at
    BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: courses (Cursos del campus)
-- ============================================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    cover_image TEXT,
    poster_image TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    duration VARCHAR(50),
    level VARCHAR(20) CHECK (level IN ('Principiante', 'Intermedio', 'Avanzado')),
    category VARCHAR(50),
    instructor VARCHAR(100),
    instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 100),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índice para búsquedas por categoría
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_featured ON courses(is_featured);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);

-- ============================================
-- TABLA: modules (Módulos de cada curso)
-- ============================================
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_modules_course ON modules(course_id);

-- ============================================
-- TABLA: lessons (Lecciones/Videos de cada módulo)
-- ============================================
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    duration VARCHAR(20),
    youtube_id VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_lessons_module ON lessons(module_id);

-- ============================================
-- TABLA: materials (Materiales de cada lección)
-- ============================================
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    type VARCHAR(20) DEFAULT 'LINK' CHECK (type IN ('PDF', 'LINK', 'DRIVE', 'YOUTUBE', 'HTML')),
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_materials_lesson ON materials(lesson_id);

-- ============================================
-- TABLA: enrollments (Inscripciones de alumnos a cursos)
-- ============================================
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'LOCKED')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_enrollment UNIQUE (user_id, course_id)
);

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================
-- TABLA: support_requests (Recuperacion de clave)
-- ============================================
CREATE TABLE support_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'attended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP,
    attended_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_requests_status ON support_requests(status);
CREATE INDEX idx_support_requests_email ON support_requests(email);

-- ============================================
-- TABLA: payment_requests (Comprobantes de pago)
-- ============================================
CREATE TABLE payment_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(100) NOT NULL,
    course_title VARCHAR(150) NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 0.00,
    voucher_image TEXT,
    payment_date TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    gestor_note TEXT
);

CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_user ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_course ON payment_requests(course_id);

-- ============================================
-- TABLA: lesson_progress (Progreso de lecciones por alumno)
-- ============================================
CREATE TABLE lesson_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    watched_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_progress UNIQUE (user_id, lesson_id)
);

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_progress_lesson ON lesson_progress(lesson_id);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Cursos con información completa
CREATE OR REPLACE VIEW v_courses_full AS
SELECT 
    c.id,
    c.title,
    c.description,
    c.cover_image,
    c.poster_image,
    c.price,
    c.duration,
    c.level,
    c.category,
    c.instructor,
    c.instructor_id,
    c.rating,
    c.is_featured,
    c.created_at,
    u.full_name as instructor_name,
    u.email as instructor_email,
    COUNT(DISTINCT e.id) as enrolled_students,
    COUNT(DISTINCT m.id) as modules_count,
    COUNT(DISTINCT l.id) as lessons_count
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id
LEFT JOIN modules m ON m.course_id = c.id
LEFT JOIN lessons l ON l.module_id = m.id
LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
GROUP BY c.id, u.full_name, u.email;

-- Vista: Progreso de alumnos por curso
CREATE OR REPLACE VIEW v_student_progress AS
SELECT 
    e.id as enrollment_id,
    e.user_id,
    e.course_id,
    e.status,
    e.progress,
    u.full_name as student_name,
    u.email as student_email,
    c.title as course_title,
    COUNT(DISTINCT l.id) as total_lessons,
    COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = true) as completed_lessons,
    ROUND(
        COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = true)::NUMERIC * 100 / 
        NULLIF(COUNT(DISTINCT l.id), 0), 2
    ) as calculated_progress
FROM enrollments e
JOIN users u ON e.user_id = u.id
JOIN courses c ON e.course_id = c.id
LEFT JOIN modules m ON m.course_id = c.id
LEFT JOIN lessons l ON l.module_id = m.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
GROUP BY e.id, u.full_name, u.email, c.title;

-- Vista: Perfil completo de docente
CREATE OR REPLACE VIEW v_teacher_profiles AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    u.avatar,
    tp.bio,
    tp.specialization,
    tp.experience,
    tp.linkedin_url,
    tp.twitter_url,
    tp.website_url,
    COUNT(DISTINCT c.id) as courses_count,
    COUNT(DISTINCT m.id) as total_modules,
    COUNT(DISTINCT l.id) as total_lessons,
    COUNT(DISTINCT e.user_id) as total_students
FROM users u
LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
LEFT JOIN courses c ON c.instructor_id = u.id
LEFT JOIN modules m ON m.course_id = c.id
LEFT JOIN lessons l ON l.module_id = m.id
LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
WHERE u.role = 'DOCENTE'
GROUP BY u.id, tp.bio, tp.specialization, tp.experience, 
         tp.linkedin_url, tp.twitter_url, tp.website_url;

-- ============================================
-- DATOS INICIALES (SEED DATA)
-- ============================================

-- Usuarios iniciales. Reemplaza los password_hash antes de desplegar.
-- Usa hashes bcrypt propios para cada cuenta provisionada.
INSERT INTO users (full_name, email, phone, password_hash, role, avatar, bio, specialization, experience) VALUES
('Admin Principal', 'admin@ciideg.edu.pe', '936220771', '$2y$10$zB8y5xmFL.fhMy0spCuuq.7njnI99F3gJrVmgjrgFdn/ll/18mI2K', 'ADMIN',
 'https://ui-avatars.com/api/?name=Admin+Principal&background=random', NULL, NULL, NULL),
('Gestor CIIDEG', 'gestor@ciideg.edu.pe', '936220771', '$2y$10$zB8y5xmFL.fhMy0spCuuq.7njnI99F3gJrVmgjrgFdn/ll/18mI2K', 'GESTOR',
 'https://ui-avatars.com/api/?name=Gestor+CIIDEG&background=random', NULL, NULL, NULL),
('Alumno CIIDEG', 'alumno@ciideg.edu.pe', '900000000', '$2y$10$zB8y5xmFL.fhMy0spCuuq.7njnI99F3gJrVmgjrgFdn/ll/18mI2K', 'ALUMNO',
 'https://ui-avatars.com/api/?name=Alumno+CIIDEG&background=random', NULL, NULL, NULL),
('Docente CIIDEG', 'docente@ciideg.edu.pe', '900000001', '$2y$10$zB8y5xmFL.fhMy0spCuuq.7njnI99F3gJrVmgjrgFdn/ll/18mI2K', 'DOCENTE',
 'https://ui-avatars.com/api/?name=Docente+CIIDEG&background=random',
 'Apasionado por la enseñanza de tecnología con más de 10 años de experiencia en la industria.',
 'Desarrollo Web, Python, Machine Learning',
 '10 años de experiencia en desarrollo de software y 5 años enseñando');

-- Perfil del docente
INSERT INTO teacher_profiles (user_id, bio, specialization, experience, linkedin_url, twitter_url, website_url)
SELECT id, 
       'Apasionado por la enseñanza de tecnología con más de 10 años de experiencia en la industria.',
       'Desarrollo Web, Python, Machine Learning',
       '10 años de experiencia en desarrollo de software y 5 años enseñando',
       'https://linkedin.com/in/docente-ciideg',
       'https://twitter.com/docente_ciideg',
       'https://ciideg.edu.pe'
FROM users WHERE email = 'docente@ciideg.edu.pe';

-- Configuración inicial del sistema
INSERT INTO system_settings (key_name, key_value, data_type, description) VALUES
('primary_color', '#6366f1', 'string', 'Color primario de la interfaz'),
('secondary_color', '#8b5cf6', 'string', 'Color secundario de la interfaz'),
('logo_url', '/logo-ciideg.png', 'string', 'URL del logotipo del campus'),
('platform_name', 'Campus Virtual CIIDEG', 'string', 'Nombre del campus virtual'),
('payment_yape_number', '999-888-777', 'string', 'Número telefónico para pagos vía Yape'),
('payment_cci_account', '000-000-000000', 'string', 'Cuenta bancaria o CCI para transferencias'),
('payment_account_holder', 'CIIDEG', 'string', 'Nombre del titular de la cuenta bancaria'),
('enable_payments', 'true', 'boolean', 'Habilitar o deshabilitar pasarela de pago y subida de comprobantes'),
('support_email', 'soporte@ciideg.edu.pe', 'string', 'Correo de soporte del campus'),
('max_upload_mb', '100', 'number', 'Límite máximo de subida de archivos en Megabytes')
ON CONFLICT (key_name) DO UPDATE SET 
    key_value = EXCLUDED.key_value,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description;

-- No se insertan cursos demo en produccion.
-- El catalogo del alumno se alimenta solo con cursos creados por Docente/Gestor
-- y destacados/aprobados desde los paneles correspondientes.

-- ============================================
-- CONSULTAS DE EJEMPLO
-- ============================================

-- Obtener todos los cursos con su instructor
-- SELECT * FROM v_courses_full;

-- Obtener progreso de un estudiante
-- SELECT * FROM v_student_progress WHERE student_email = 'alumno@ciideg.edu.pe';

-- Obtener perfil de docente con estadísticas
-- SELECT * FROM v_teacher_profiles WHERE email = 'docente@ciideg.edu.pe';

-- Obtener cursos de un docente específico
-- SELECT * FROM courses WHERE instructor_id = (SELECT id FROM users WHERE email = 'docente@ciideg.edu.pe');

-- Obtener cursos por categoría
-- SELECT * FROM courses WHERE category = 'Tecnología';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
