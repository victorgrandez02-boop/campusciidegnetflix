## Fixes Implementados - 2026-05-20

### ?? Correcciones Críticas
1. [FIX#1] api/teacher_profiles.php: Eliminada sintaxis ilegal post-?> que corrompía respuestas JSON
2. [FIX#2] Persistencia de SystemSettings: 
   - Nueva tabla system_settings en PostgreSQL
   - Endpoint api/system_settings.php con GET/PUT
   - services/api.ts actualizado con fallback híbrido
3. [FIX#3] Eliminación real de usuarios:
   - Método DELETE en api/users.php con validaciones de seguridad
   - services/api.ts: deleteUser() con llamada API + limpieza de store
   - components/AdminPanel.tsx: manejo de confirmación y feedback

### ?? Documentación Actualizada
- Credenciales demo: @ciideg.edu.pe / @26Gemses1
- Rutas corregidas: /services/ (no /src/services/)
- Parámetros de endpoints: course_id en progress.php
- Seguridad: rotación de APP_SECRET, protección de admin principal

### ? QA Validado
- [x] JSON responses sin corrupción
- [x] Branding persiste entre sesiones/usuarios
- [x] Eliminación de usuarios refleja en PostgreSQL
- [x] Healthchecks de contenedores passing
