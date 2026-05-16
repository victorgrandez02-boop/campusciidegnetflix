# 🐳 Implementación Docker - Campus Virtual Netflix Style

## 📋 Descripción

Este directorio contiene toda la configuración necesaria para ejecutar el **Campus Virtual Netflix Style** completamente contenerizado usando **Docker Desktop** y **Docker Compose**.

### ✅ Estado Actual

**¡Sistema 100% funcional en Docker!**

- ✅ Frontend React servido por Nginx
- ✅ API PHP con PostgreSQL
- ✅ Base de datos PostgreSQL 15 con datos iniciales
- ✅ pgAdmin para administración de BD
- ✅ Conexión API-PostgreSQL verificada

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Desktop                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           campus_network (bridge)                   │   │
│  │                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │   Frontend   │  │     API      │  │ Postgres │ │   │
│  │  │    Nginx     │──│   PHP/Apache │──│    DB    │ │   │
│  │  │   Port 3000  │  │   Port 8080  │  │  Port    │ │   │
│  │  └──────────────┘  └──────────────┘  │  5432    │ │   │
│  │         │                  │         └──────────┘ │   │
│  └─────────┼──────────────────┼──────────────────────┘   │
│            │                  │                           │
│            ▼                  ▼                           │
│      http://localhost    http://localhost                 │
│         :3000               :8080                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────────┐
    │   pgAdmin   │
    │  Port 5050  │
    └─────────────┘
         │
         ▼
    http://localhost
         :5050
```

---

## 🚀 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Frontend** | `3000` | React + Vite servido por Nginx |
| **API** | `8080` | PHP 8.2 + Apache + PostgreSQL extension |
| **PostgreSQL** | `5432` | Base de datos PostgreSQL 15 |
| **pgAdmin** | `5050` | Interfaz web para administrar PostgreSQL |

---

## 📦 Prerrequisitos

1. **Docker Desktop** instalado y ejecutándose
   - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Windows: WSL2 habilitado
   - macOS: Docker Desktop para Mac
   - Linux: Docker Engine + Docker Compose

2. **Recursos mínimos recomendados:**
   - RAM: 4GB disponibles
   - CPU: 2 núcleos
   - Disco: 2GB libres

---

## 🔧 Instrucciones de Implementación

### Paso 1: Verificar Archivos

Asegúrate de tener estos archivos en el directorio raíz:

```
d:\DEV\CAMPUS ESTILO NETFLIX\
├── docker-compose.yml
├── .env
├── database_postgresql.sql
├── docker/
│   ├── frontend/Dockerfile
│   ├── api/Dockerfile
│   └── nginx/nginx.conf
└── api/
    ├── config.php
    ├── courses.php
    └── teacher_profiles.php
```

### Paso 2: Abrir Terminal

```bash
# Navegar al directorio del proyecto
cd "d:\DEV\CAMPUS ESTILO NETFLIX"
```

### Paso 3: Construir y Levantar Contenedores

```bash
# Construir imágenes y levantar servicios
docker-compose up --build -d
```

**Opciones:**
- `--build`: Forzar reconstrucción de imágenes
- `-d`: Ejecutar en segundo plano (detached mode)
- `--force-recreate`: Recrear contenedores existentes

### Paso 4: Verificar Estado

```bash
# Ver contenedores en ejecución
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f postgres
docker-compose logs -f api
docker-compose logs -f frontend
```

### Paso 5: Acceder al Sistema

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Frontend** | http://localhost:3000 | Ver usuarios abajo |
| **API** | http://localhost:8080/api/courses.php | - |
| **pgAdmin** | http://localhost:5050 | `admin@campus.com` / `admin` |

---

## 👥 Usuarios del Sistema

| Email | Contraseña | Rol |
|-------|------------|-----|
| `admin@campus.com` | `123456` | ADMIN |
| `profesor@campus.com` | `123456` | DOCENTE |
| `alumno@campus.com` | `123456` | ALUMNO |

---

## 🛠️ Comandos Útiles

### Gestionar Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO! Pierde datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart api

# Reconstruir un servicio específico
docker-compose up -d --build frontend
```

### Ver Logs

```bash
# Logs en tiempo real de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f postgres
docker-compose logs -f api

# Últimas 100 líneas
docker-compose logs --tail=100 api
```

### Acceder a Contenedores

```bash
# Shell dentro del contenedor de la API
docker-compose exec api bash

# Shell dentro del contenedor de PostgreSQL
docker-compose exec postgres sh

# PostgreSQL CLI (psql)
docker-compose exec postgres psql -U postgres -d campus_virtual

# Salir de psql
\q
```

### Ejecutar Comandos

```bash
# Ejecutar comando en contenedor sin shell interactivo
docker-compose exec api php -v

# Ver estado de la base de datos
docker-compose exec postgres pg_isready
```

---

## 🗄️ Base de Datos

### Acceder desde pgAdmin

1. Abrir http://localhost:5050
2. Login: `admin@campus.com` / `admin`
3. Click en "Add New Server"
4. Configuración:
   - **Host**: `postgres` (nombre del servicio en Docker)
   - **Port**: `5432`
   - **Database**: `campus_virtual`
   - **Username**: `postgres`
   - **Password**: `postgres`

### Consultas Útiles

```sql
-- Ver todos los usuarios
SELECT id, full_name, email, role FROM users;

-- Ver todos los cursos
SELECT id, title, category, instructor FROM courses;

-- Ver inscripciones
SELECT u.full_name, c.title, e.status, e.progress
FROM enrollments e
JOIN users u ON e.user_id = u.id
JOIN courses c ON e.course_id = c.id;

-- Ver perfil de docente
SELECT * FROM v_teacher_profiles;

-- Ver progreso de estudiantes
SELECT * FROM v_student_progress;
```

### Resetear Base de Datos

```bash
# Eliminar volumen de PostgreSQL (¡CUIDADO! Pierde todos los datos)
docker-compose down -v

# Volver a levantar (recrea la BD desde el script inicial)
docker-compose up -d postgres
```

---

## 🔐 Configuración Personalizada

### Cambiar Puertos

Editar `.env`:

```env
FRONTEND_PORT=8080      # Cambiar puerto del frontend
API_PORT=9000           # Cambiar puerto de la API
POSTGRES_PORT=5433      # Cambiar puerto de PostgreSQL
PGADMIN_PORT=5051       # Cambiar puerto de pgAdmin
```

Luego reiniciar:

```bash
docker-compose down
docker-compose up -d
```

### Cambiar Credenciales de PostgreSQL

Editar `.env`:

```env
POSTGRES_USER=mi_usuario
POSTGRES_PASSWORD=mi_contraseña_segura
```

**Importante:** También actualizar en `docker-compose.yml` sección `api.environment`

---

## 🐛 Solución de Problemas

### Error: "Cannot start service api: driver failed programming external connectivity"

**Solución:**
```bash
# Liberar puertos en uso
netstat -ano | findstr :8080
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# Detener servicios que usan esos puertos o cambiar puertos en .env
```

### Error: "database connection error"

**Solución:**
```bash
# Verificar que PostgreSQL esté saludable
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres

# Esperar a que PostgreSQL esté listo (healthcheck)
docker-compose exec postgres pg_isready

# Reiniciar API después de que PostgreSQL esté listo
docker-compose restart api
```

### Error: "container already exists"

**Solución:**
```bash
# Eliminar contenedores existentes
docker-compose down

# Volver a levantar
docker-compose up -d
```

### Error: "Cannot find module" en Frontend

**Solución:**
```bash
# Reconstruir frontend
docker-compose up -d --build frontend
```

### Frontend no muestra cambios

**Solución:**
```bash
# Forzar rebuild sin caché
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### API devuelve error 500

**Solución:**
```bash
# Ver logs de error
docker-compose logs api

# Acceder al contenedor y verificar configuración
docker-compose exec api bash
cd /var/www/html/api
php -i | grep pgsql
```

---

## 📊 Monitoreo

### Ver Uso de Recursos

```bash
# Estadísticas en tiempo real
docker stats

# Ver espacio en disco
docker system df

# Ver volúmenes
docker volume ls
```

### Health Checks

```bash
# Ver estado de salud de contenedores
docker inspect --format='{{.Name}} {{.State.Health.Status}}' $(docker-compose ps -q)
```

---

## 🔄 Actualización del Sistema

### Actualizar Código

```bash
# 1. Hacer cambios en el código

# 2. Reconstruir imágenes
docker-compose build

# 3. Recrear contenedores
docker-compose up -d
```

### Actualizar solo Frontend

```bash
docker-compose up -d --build frontend
```

### Actualizar solo API

```bash
docker-compose restart api
```

---

## 🧹 Limpieza

### Eliminar Todo

```bash
# Detener y eliminar contenedores, redes y volúmenes
docker-compose down -v

# Eliminar imágenes construidas
docker rmi $(docker images -q campus-*)

# Limpieza general de Docker
docker system prune -a
```

---

## 📝 Archivos de Configuración

### `docker-compose.yml`
Define todos los servicios, redes y volúmenes.

### `.env`
Variables de entorno para personalizar puertos y credenciales.

### `docker/frontend/Dockerfile`
Configuración del build de React + Nginx.

### `docker/api/Dockerfile`
Configuración de PHP + Apache + PostgreSQL.

### `docker/nginx/nginx.conf`
Configuración de Nginx para servir React y proxificar API.

### `api/config.php`
Configuración de conexión a base de datos (usa variables de entorno).

---

## 🎯 Flujo de Desarrollo Recomendado

### Desarrollo con Hot Reload (Recomendado)

Para desarrollo activo, usar npm local en lugar de Docker:

```bash
# Terminal 1: Frontend con hot reload
npm run dev

# Terminal 2: Docker solo para API y DB
docker-compose up -d api postgres
```

Configurar `vite.config.ts` para usar la API de Docker:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

### Producción

Para producción, usar Docker Compose completo:

```bash
docker-compose up -d --build
```

---

## 📞 Soporte

### Logs de Error

```bash
# Guardar logs en archivo
docker-compose logs > logs.txt 2>&1
```

### Información del Sistema

```bash
# Versión de Docker
docker --version
docker-compose --version

# Información del sistema
docker info
```

---

## ✅ Checklist de Verificación

- [ ] Docker Desktop instalado y ejecutándose
- [ ] Archivos de configuración presentes
- [ ] Puerto 3000 disponible
- [ ] Puerto 8080 disponible
- [ ] Puerto 5432 disponible
- [ ] Puerto 5050 disponible
- [ ] `docker-compose up --build -d` ejecutado exitosamente
- [ ] `docker-compose ps` muestra todos los servicios "Up"
- [ ] http://localhost:3000 accesible
- [ ] http://localhost:8080/api/courses.php devuelve JSON
- [ ] http://localhost:5050 pgAdmin accesible
- [ ] Login con usuarios de prueba exitoso

---

## 🎉 ¡Listo!

Tu Campus Virtual Netflix Style está corriendo completamente en Docker.

**URLs de Acceso:**
- 🎬 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:8080/api/courses.php
- 🗄️ **pgAdmin**: http://localhost:5050

**Próximos pasos:**
1. Acceder al frontend
2. Login como Docente
3. Crear un curso
4. Login como Alumno
5. Ver el curso creado
6. Explorar pgAdmin para ver los datos en PostgreSQL
