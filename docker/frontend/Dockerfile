# ============================================
# Dockerfile para Frontend React/Vite
# Campus Virtual CIIDEG
# ============================================
FROM nginx:alpine

# Crear directorio para configuración
RUN mkdir -p /etc/nginx/conf.d

# Copiar configuración personalizada de nginx
# El contexto de build es la raíz del proyecto (docker-compose usa context: .)
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build del frontend (generado con: npm run build)
COPY dist /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

# Comando para ejecutar nginx
CMD ["nginx", "-g", "daemon off;"]
