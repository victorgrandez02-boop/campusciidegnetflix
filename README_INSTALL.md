# Guía de Instalación PHP + MySQL + React

Has refactorizado el proyecto para que funcione con un backend PHP y una base de datos MySQL.

## Requisitos Previos

- **Servidor Web**: Apache o Nginx (Recomendado: XAMPP, Laragon, o WAMP en Windows).
- **PHP**: Versión 7.4 o superior.
- **MySQL**: Versión 5.7 o superior.
- **Node.js**: Para ejecutar el entorno de desarrollo del frontend.

## Pasos de Instalación

### 1. Configuración de Base de Datos

1. Abra su gestor de base de datos (phpMyAdmin, MySQL Workbench, etc.).
2. Cree una nueva base de datos llamada `campus_virtual`.
3. Importe el archivo `database.sql` ubicado en la raíz del proyecto.
   - Esto creará las tablas y usuarios de prueba.

### 2. Configuración del Backend (API)

1. El backend se encuentra en la carpeta `/api` en la raíz del proyecto.
2. Abra `api/config.php` y verifique las credenciales de la base de datos:
   ```php
   $host = 'localhost';
   $db_name = 'campus_virtual';
   $username = 'root';
   $password = ''; // Cambie esto si su root tiene contraseña
   ```
3. Asegúrese de que su servidor web (Apache/Nginx) esté apuntando a la raíz del proyecto, o coloque el proyecto dentro de `htdocs` o `www`.
   - **Importante**: La carpeta `/api` debe ser accesible vía web (ej. `http://localhost/campus/api/courses.php`).

### 3. Configuración del Frontend

1. Abra `vite.config.ts`.
2. Verifique la configuración del proxy:
   ```ts
   proxy: {
     '/api': {
       target: 'http://localhost:80', // CAMBIE ESTO al puerto de su servidor PHP (ej. 8000 o 8080)
       changeOrigin: true,
       secure: false,
     }
   }
   ```
   Si su servidor PHP está en otro puerto, actualice la línea `target`.

### 4. Ejecutar el Proyecto

1. Inicie su servidor PHP/MySQL (Start en XAMPP).
2. En la terminal del proyecto, ejecute:
   ```bash
   npm run dev
   ```
3. Abra el navegador en la URL que muestra Vite (ej. `http://localhost:3000` o `5173`).

## Usuarios de Prueba

- **Alumno**:
  - Email: `alumno@campus.com`
  - Rol: ALUMNO
  - (En modo demo, basta con hacer click en "Estudiante")

- **Admin**:
  - Email: `admin@campus.com`
  - Rol: ADMIN
  - (En modo demo, basta con hacer click en "Administrador")

## Estructura de Archivos

- `/api`: Endpoints PHP (Backend logic).
- `/src/services/api.ts`: Conector del frontend con el backend.
- `database.sql`: Schema de la base de datos.
- `App.tsx`: Lógica principal actualizada para usar la API real.
