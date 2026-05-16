# 🎓 CAMPUS VIRTUAL NETFLIX STYLE

## 📋 DESCRIPCIÓN

Campus Virtual es una plataforma de aprendizaje en línea con interfaz estilo Netflix, desarrollada con React, TypeScript, Vite, PHP y PostgreSQL. Totalmente contenerizada con Docker para fácil implementación.

---

## ✨ CARACTERÍSTICAS PRINCIPALES

### Para Estudiantes
- ✅ Navegación intuitiva tipo Netflix
- ✅ Catálogo de cursos por categorías
- ✅ Inscripción a cursos
- ✅ Reproductor de videos YouTube
- ✅ Materiales descargables (PDF, Drive, Links)
- ✅ Seguimiento de progreso
- ✅ Búsqueda de cursos

### Para Docentes
- ✅ Panel de gestión de cursos
- ✅ Crear/editar/eliminar cursos
- ✅ Agregar módulos y lecciones
- ✅ Gestionar materiales
- ✅ Editar perfil profesional
- ✅ Estadísticas de cursos

### Para Administradores
- ✅ Panel de administración
- ✅ Gestión de usuarios
- ✅ Gestión de cursos
- ✅ Visualización de inscripciones
- ✅ Estadísticas generales

---

## 🚀 INICIO RÁPIDO

### Opción 1: Docker (Recomendado)

```bash
# Clonar repositorio
cd "d:\DEV\CAMPUS ESTILO NETFLIX"

# Iniciar con Docker Compose
docker-compose up --build -d

# Acceder a:
# - Frontend: http://localhost:3000
# - API: http://localhost:8080
# - pgAdmin: http://localhost:5050
```

### Opción 2: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Acceder a http://localhost:3000
```

---

## ACCESO DE USUARIOS

En produccion, las cuentas deben ser creadas y administradas por CIIDEG. No publiques credenciales de prueba en el repositorio ni en la interfaz.

---

## 🏗️ ARQUITECTURA

```
┌─────────────────────────────────────────┐
│         Docker Compose                  │
│  ┌─────────────────────────────────┐   │
│  │  Frontend (React + Vite)        │   │
│  │  Puerto: 3000                   │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  API (PHP 8.2 + Apache)         │   │
│  │  Puerto: 8080                   │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  PostgreSQL 15                  │   │
│  │  Puerto: 5432                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  pgAdmin                        │   │
│  │  Puerto: 5050                   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
campus-virtual/
├── api/                      # Backend PHP
│   ├── config.php           # Configuración DB
│   ├── courses.php          # API de cursos
│   ├── enrollments.php      # API de inscripciones
│   ├── materials.php        # API de materiales
│   ├── progress.php         # API de progreso
│   ├── teacher_profiles.php # API de docentes
│   └── users.php            # API de usuarios
│
├── components/              # Componentes React
│   ├── ui/                  # Componentes reutilizables
│   ├── AdminPanel.tsx       # Panel de admin
│   ├── CourseDetailModal.tsx
│   ├── CourseRow.tsx
│   ├── DocentePanel.tsx     # Panel de docente
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── Player.tsx           # Reproductor
│   └── ToastContext.tsx     # Notificaciones
│
├── services/
│   └── api.ts               # Servicio API
│
├── docker/
│   ├── api/Dockerfile       # Docker API PHP
│   ├── frontend/Dockerfile  # Docker Frontend
│   └── nginx/nginx.conf     # Config Nginx
│
├── App.tsx                  # Componente principal
├── types.ts                 # Tipos TypeScript
├── database_postgresql.sql  # Schema DB
├── docker-compose.yml       # Orquestador Docker
└── package.json             # Dependencias
```

---

## 🛠️ TECNOLOGÍAS

### Frontend
- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **Lucide React** - Iconos

### Backend
- **PHP 8.2** - Lógica del servidor
- **PostgreSQL 15** - Base de datos
- **PDO** - Acceso a datos

### DevOps
- **Docker** - Contenerización
- **Docker Compose** - Orquestación
- **Nginx** - Servidor web

---

## 📊 BASE DE DATOS

### Tablas Principales
- `users` - Usuarios del sistema
- `teacher_profiles` - Perfiles de docentes
- `courses` - Cursos disponibles
- `modules` - Módulos de cursos
- `lessons` - Lecciones/videos
- `materials` - Materiales adjuntos
- `enrollments` - Inscripciones
- `lesson_progress` - Progreso de lecciones

### Vistas
- `v_courses_full` - Cursos con información completa
- `v_student_progress` - Progreso de estudiantes
- `v_teacher_profiles` - Perfiles con estadísticas

---

## 🔧 COMANDOS DISPONIBLES

```bash
# Desarrollo
npm run dev              # Iniciar servidor desarrollo
npm run build            # Compilar para producción
npm run preview          # Vista previa build

# Docker
docker-compose up -d     # Iniciar servicios
docker-compose down      # Detener servicios
docker-compose ps        # Ver estado
docker-compose logs -f   # Ver logs

# Base de datos
docker-compose exec postgres psql -U postgres -d campus_virtual
```

---

## 🎨 PERSONALIZACIÓN

### Cambiar Puertos
Editar `.env`:
```env
FRONTEND_PORT=8080
API_PORT=9000
POSTGRES_PORT=5433
PGADMIN_PORT=5051
```

### Cambiar Credenciales DB
Editar `.env`:
```env
POSTGRES_USER=mi_usuario
POSTGRES_PASSWORD=mi_contraseña
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Puerto ya en uso"
```bash
# Ver puertos en uso
netstat -ano | findstr :3000

# Cambiar puerto en .env o matar proceso
taskkill /F /PID <PID>
```

### Error: "Conexión a DB fallida"
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres
```

### Frontend no muestra cambios
```bash
# Limpiar caché y rebuild
docker-compose down
docker-compose up --build -d
```

---

## 📝 ENDPOINTS API

### Autenticación
- `POST /api/login.php` - Iniciar sesión
- `POST /api/register.php` - Registrar usuario

### Usuarios
- `GET /api/users.php` - Listar usuarios
- `GET /api/users.php?id={id}` - Obtener usuario
- `PUT /api/users.php?id={id}` - Actualizar usuario
- `DELETE /api/users.php?id={id}` - Eliminar usuario

### Cursos
- `GET /api/courses.php` - Listar cursos
- `GET /api/courses.php?id={id}` - Obtener curso
- `POST /api/courses.php` - Crear curso
- `PUT /api/courses.php?id={id}` - Actualizar curso
- `DELETE /api/courses.php?id={id}` - Eliminar curso

### Inscripciones
- `GET /api/enrollments.php?user_id={id}` - Obtener inscripciones
- `POST /api/enrollments.php` - Inscribir usuario
- `PUT /api/enrollments.php` - Actualizar progreso

### Progreso
- `GET /api/progress.php?user_id={uid}&lesson_id={lid}` - Obtener progreso
- `POST /api/progress.php` - Actualizar progreso

### Perfiles Docente
- `GET /api/teacher_profiles.php?user_id={id}` - Obtener perfil
- `POST /api/teacher_profiles.php` - Actualizar perfil

---

## 🔒 SEGURIDAD

- Contraseñas hasheadas con bcrypt
- CORS configurado
- Prepared statements (SQL injection prevention)
- Validación de datos en frontend y backend
- Headers de seguridad HTTP

---

## 📄 LICENCIA

Este proyecto es de código abierto y está disponible para uso educativo.

---

## 👥 CRÉDITOS

Desarrollado como proyecto educativo para demostrar:
- Arquitectura full-stack
- Contenerización con Docker
- Integración React + PHP + PostgreSQL
- Patrones de diseño modernos

---

## 📞 SOPORTE

Para issues o preguntas, revisar la documentación en `README_DOCKER.md` y `REFACTORING_SUMMARY.md`.

---

**Versión:** 2.0.0  
**Última Actualización:** Marzo 2026  
**Estado:** ✅ Producción
