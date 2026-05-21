# 🐘 Configuración de Base de Datos PostgreSQL

## Resumen del Sistema

El sistema **Campus Virtual Netflix Style** ahora soporta **PostgreSQL** como base de datos principal.

### Estado Anterior
- El sistema original tenía un schema para **MySQL** (`database.sql`)
- La API PHP estaba configurada para MySQL
- El frontend usaba datos mock (simulados)

### Nuevo Estado
- ✅ Schema completo para **PostgreSQL 14+**
- ✅ API PHP actualizada para soportar PostgreSQL
- ✅ Tablas adicionales para perfiles de docentes
- ✅ Vistas útiles para reportes
- ✅ Datos iniciales incluidos

---

## 📋 Prerrequisitos

1. **PostgreSQL 14 o superior** instalado
2. **PHP 8.0+** con extensión `pdo_pgsql` habilitada
3. **pgAdmin** o herramienta similar (opcional)

---

## 🔧 Pasos de Instalación

### 1. Crear la Base de Datos

```bash
# Conectarse a PostgreSQL como superusuario
psql -U postgres

# Crear la base de datos
CREATE DATABASE campus_virtual;

# Salir
\q
```

### 2. Ejecutar el Schema

```bash
# Ejecutar el script SQL
psql -U postgres -d campus_virtual -f database_postgresql.sql
```

O desde pgAdmin:
1. Abrir pgAdmin y conectar al servidor
2. Click derecho en "Databases" → "Create" → "Database"
3. Nombre: `campus_virtual`
4. Click derecho en la nueva base de datos → "Query Tool"
5. Abrir el archivo `database_postgresql.sql`
6. Ejecutar (F5 o botón "Execute")

### 3. Verificar la Instalación

```bash
# Conectarse a la base de datos
psql -U postgres -d campus_virtual

# Listar tablas
\dt

# Ver datos de usuarios
SELECT id, full_name, email, role FROM users;

# Ver cursos
SELECT id, title, category FROM courses;

# Salir
\q
```

---

## ⚙️ Configuración de la API PHP

### 1. Habilitar extensión PostgreSQL en PHP

En tu `php.ini` (XAMPP/WAMP o instalación standalone):

```ini
extension=pdo_pgsql
extension=pgsql
```

Reiniciar el servidor Apache/Nginx después de hacer el cambio.

### 2. Configurar credenciales

Editar `api/config.php`:

```php
// Establecer tipo de base de datos
$DB_TYPE = 'postgresql';  // Cambiar de 'mysql' a 'postgresql'

// Configuración PostgreSQL
$PG_HOST = 'localhost';
$PG_DB_NAME = 'campus_virtual';
$PG_USERNAME = 'postgres';  // Tu usuario de PostgreSQL
$PG_PASSWORD = 'postgres';  // Tu contraseña de PostgreSQL
```

### 3. Verificar conexión

Crear un archivo de prueba `api/test_connection.php`:

```php
<?php
require_once 'config.php';
echo json_encode(["success" => true, "message" => "Conexión exitosa a PostgreSQL"]);
?>
```

Acceder a: `http://localhost:3000/api/test_connection.php`

---

## 📊 Estructura de la Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (Admin, Docente, Alumno) |
| `teacher_profiles` | Perfiles detallados de docentes |
| `courses` | Cursos disponibles |
| `modules` | Módulos de cada curso |
| `lessons` | Lecciones/videos de cada módulo |
| `materials` | Materiales adjuntos (Drive, PDF, Links) |
| `enrollments` | Inscripciones de alumnos a cursos |
| `lesson_progress` | Progreso individual de lecciones |

### Vistas Disponibles

| Vista | Descripción |
|-------|-------------|
| `v_courses_full` | Cursos con información completa e instructores |
| `v_student_progress` | Progreso de alumnos por curso |
| `v_teacher_profiles` | Perfiles de docentes con estadísticas |

---

## 🔑 Datos Iniciales

### Usuarios por Defecto

| Email | Contraseña | Rol |
|-------|------------|-----|
| `admin@ciideg.edu.pe` | `@26Gemses1` | ADMIN |
| `gestor@ciideg.edu.pe` | `@26Gemses1` | GESTOR |
| `docente@ciideg.edu.pe` | `@26Gemses1` | DOCENTE |
| `alumno@ciideg.edu.pe` | `@26Gemses1` | ALUMNO |

**Nota:** La contraseña está hasheada con bcrypt. Para cambiar la contraseña, generar un nuevo hash.

### Cursos Incluidos

1. Introducción a Python (Tecnología)
2. Desarrollo Web con React (Tecnología)
3. Marketing Digital 2026 (Negocios)
4. Machine Learning Avanzado (Tecnología)
5. Emprendimiento Exitoso (Negocios)
6. Diseño UX/UI Profesional (Diseño)

---

## 🔐 Generar Hash de Contraseña

Para crear nuevos usuarios con contraseña segura:

```php
<?php
// Generar hash para una contraseña
$password = '@26Gemses1';
$hash = password_hash($password, PASSWORD_BCRYPT);
echo $hash;
?>
```

O usar este hash pre-generado para `@26Gemses1`:
```
$2y$10$zB8y5xmFL.fhMy0spCuuq.7njnI99F3gJrVmgjrgFdn/ll/18mI2K
```

---

## 📝 Consultas de Ejemplo

### Obtener cursos de un docente
```sql
SELECT * FROM courses 
WHERE instructor_id = (SELECT id FROM users WHERE email = 'docente@ciideg.edu.pe');
```

### Obtener alumnos inscritos a un curso
```sql
SELECT u.full_name, u.email, e.status, e.progress
FROM enrollments e
JOIN users u ON e.user_id = u.id
WHERE e.course_id = 1;
```

### Obtener progreso de un alumno
```sql
SELECT * FROM v_student_progress 
WHERE student_email = 'alumno@ciideg.edu.pe';
```

### Obtener perfil de docente con estadísticas
```sql
SELECT * FROM v_teacher_profiles 
WHERE email = 'docente@ciideg.edu.pe';
```

---

## 🔄 Migración desde MySQL

Si ya tienes datos en MySQL:

1. Exportar datos desde MySQL:
```bash
mysqldump -u root -p campus_virtual > backup_mysql.sql
```

2. Convertir el dump a sintaxis PostgreSQL (usar herramienta como `pgloader`)

3. O migrar manualmente tabla por tabla

---

## 🛠️ Solución de Problemas

### Error: "PDOException: could not find driver"
- Habilitar `extension=pdo_pgsql` en `php.ini`
- Reiniciar el servidor web

### Error: "Connection refused"
- Verificar que PostgreSQL esté corriendo
- Verificar puerto (default: 5432)
- Verificar credenciales en `config.php`

### Error: "Permission denied"
- Conceder permisos en PostgreSQL:
```sql
GRANT ALL PRIVILEGES ON DATABASE campus_virtual TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## 📞 Soporte

Para problemas o consultas:
1. Revisar logs de PostgreSQL: `/var/log/postgresql/` (Linux) o `Event Viewer` (Windows)
2. Revisar logs de PHP: `error_log`
3. Habilitar debug en `config.php` mostrando errores (solo desarrollo)

---

## 🚀 Próximos Pasos

1. ✅ Base de datos PostgreSQL configurada
2. ✅ API PHP actualizada
3. ⏭️ Conectar el frontend React con la API real
4. ⏭️ Implementar autenticación con JWT
5. ⏭️ Agregar endpoints para reportes y estadísticas

---

**¡Listo! Tu Campus Virtual ahora usa PostgreSQL 🎉**
