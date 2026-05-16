-- Database Schema for Campus Virtual Netflix Style

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(9) NOT NULL DEFAULT '900000000',
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'GESTOR', 'DOCENTE', 'ALUMNO') DEFAULT 'ALUMNO',
    avatar VARCHAR(255) DEFAULT 'default_avatar.png',
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    poster_image VARCHAR(255),
    price DECIMAL(10, 2) DEFAULT 0.00,
    duration VARCHAR(50),
    level ENUM('Principiante', 'Intermedio', 'Avanzado'),
    category VARCHAR(50),
    instructor VARCHAR(100),
    rating INT DEFAULT 0, -- 0-100 match score
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    duration VARCHAR(20),
    youtube_id VARCHAR(50),
    sort_order INT DEFAULT 0,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    type ENUM('PDF', 'LINK', 'DRIVE') DEFAULT 'LINK',
    url VARCHAR(255) NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('PENDING', 'PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'LOCKED') DEFAULT 'PENDING',
    progress INT DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS support_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    user_id INT NULL,
    status ENUM('pending', 'attended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP NULL,
    attended_by INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (attended_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(100) NOT NULL,
    course_title VARCHAR(150) NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 0.00,
    voucher_image LONGTEXT,
    payment_date TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    gestor_note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pogress (user_id, lesson_id)
);

-- Initial Data Seeding

-- Initial users. Replace password_hash values before deploying.
INSERT INTO users (full_name, email, phone, password_hash, role, avatar) VALUES
('Admin Principal', 'admin@ciideg.edu.pe', '936220771', '$2b$10$BRgx9bFKDFIuLoP/aLFFFORdU6nXRqZM0CqgX0vuzK90dKCTV.AYu', 'ADMIN', 'https://ui-avatars.com/api/?name=Admin+Principal&background=random'),
('Gestor CIIDEG', 'gestor@ciideg.edu.pe', '936220771', '$2b$10$Ogxgr/mai4ax35iBB81Fo.esauKzyNZcLF71SRn3qClGp5oxrpb.C', 'GESTOR', 'https://ui-avatars.com/api/?name=Gestor+CIIDEG&background=random'),
('Alumno CIIDEG', 'alumno@ciideg.edu.pe', '900000000', '$2b$10$gqNrO6KU6xsmtSsaJFOcJeOxvHnPICmRYPNzCtIylMoKrohRcEYEO', 'ALUMNO', 'https://ui-avatars.com/api/?name=Alumno+CIIDEG&background=random'),
('Docente CIIDEG', 'docente@ciideg.edu.pe', '900000001', '$2b$10$kCBXI4Lu0J3I2jzjQynji.3QvneKlb/RbYdMGjBua/WBX3WlsbnPW', 'DOCENTE', 'https://ui-avatars.com/api/?name=Docente+CIIDEG&background=random');
