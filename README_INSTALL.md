# Guía de Instalación PHP + PostgreSQL + React

Esta guía describe cómo levantar la plataforma del Campus Virtual de forma local e independiente de Docker.

## Requisitos Previos

- **Servidor Web**: Apache o Nginx (Recomendado: XAMPP con PostgreSQL habilitado, Laragon, o Apache independiente).
- **PHP**: Versión 8.0 o superior con las extensiones `pdo_pgsql` y `pgsql` habilitadas.
- **PostgreSQL**: Versión 14 o superior.
- **Node.js**: Versión 18 o superior para el entorno de desarrollo y compilación del frontend.

## Pasos de Instalación

### 1. Configuración de Base de Datos

1. Abra su gestor de base de datos PostgreSQL (pgAdmin, DBeaver o `psql`).
2. Cree una nueva base de datos llamada `campus_virtual`.
3. Importe el archivo `database_postgresql.sql` ubicado en la raíz del proyecto.
   - Si utiliza la línea de comandos:
     ```bash
     psql -U postgres -d campus_virtual -f database_postgresql.sql
     ```
   - Esto creará la estructura de tablas, vistas, funciones, triggers y poblará los datos iniciales necesarios para el sistema.

### 2. Configuración del Backend (API)

1. El backend se encuentra en la carpeta `/api` en la raíz del proyecto.
2. Asegúrese de que su servidor PHP tenga activadas las extensiones en `php.ini`:
   ```ini
   extension=pdo_pgsql
   extension=pgsql
   ```
3. Abra el archivo `api/config.php` y configure el tipo de base de datos y credenciales:
   ```php
   $DB_TYPE = 'postgresql';
   $PG_HOST = 'localhost';
   $PG_DB_NAME = 'campus_virtual';
   $PG_USERNAME = 'campus_user';      // Cambie por su usuario de Postgres
   $PG_PASSWORD = 'contrasena_segura'; // Cambie por su contraseña de Postgres
   $PG_PORT = '5432';
   ```
4. Si está utilizando un servidor Apache local, asegúrese de que el alias o directorio virtual apunte a la carpeta `/api` del proyecto. La API debe ser accesible localmente, por ejemplo, en `http://localhost:8080/api/courses.php`.

### 3. Configuración del Frontend

1. Abra `vite.config.ts`.
2. Verifique la configuración del proxy de desarrollo para que apunte al puerto donde corre su Apache o servidor PHP local (por defecto `http://localhost:8080`):
   ```ts
   proxy: {
     '/api': {
       target: 'http://localhost:8080',
       changeOrigin: true,
       secure: false,
     }
   }
   ```
3. Si requiere usar el almacenamiento persistente simulado en el navegador (Modo Demo Offline), configure la variable `VITE_USE_LOCAL_STORE=true` en su archivo `.env`. Para conectarse a la API de PostgreSQL, configure `VITE_USE_LOCAL_STORE=false`.

### 4. Ejecutar el Proyecto

1. Inicie PostgreSQL y su servidor web Apache/Nginx.
2. Instale las dependencias de Node.js en la carpeta raíz del proyecto:
   ```bash
   npm install
   ```
3. Inicie el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
4. Abra su navegador en `http://localhost:3000`.

---

## Usuarios de Prueba

Para iniciar sesión y verificar los diferentes paneles disponibles, use las siguientes credenciales:

- **Estudiante**:
  - Correo: `alumno@ciideg.edu.pe`
  - Contraseña: `@26Gemses1`
  - Rol: `ALUMNO`

- **Docente**:
  - Correo: `docente@ciideg.edu.pe`
  - Contraseña: `@26Gemses1`
  - Rol: `DOCENTE`

- **Administrador**:
  - Correo: `admin@ciideg.edu.pe`
  - Contraseña: `@26Gemses1`
  - Rol: `ADMIN`

---

## Estructura de Archivos Críticos

- `/api`: Carpeta que contiene los endpoints PHP (Backend).
- `/services/api.ts`: Conector y orquestador del frontend con el backend.
- `/components/`: Componentes React del frontend.
- `database_postgresql.sql`: Script de creación y datos de prueba para PostgreSQL.
- `App.tsx`: Componente principal que gestiona el estado y enrutamiento del Campus Virtual.
