# ============================================
# Dockerfile para Frontend React/Vite (Compilación Multi-Etapa)
# Campus Virtual CIIDEG
# ============================================

# --- Etapa 1: Construcción (Builder) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalación robusta de dependencias según la existencia de package-lock.json
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copiar el código fuente completo del frontend
COPY . .

# Inyectar variables de entorno de Vite requeridas durante la compilación
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_LOCAL_STORE=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_LOCAL_STORE=$VITE_USE_LOCAL_STORE

# Compilar para producción (genera la carpeta /app/dist)
RUN npm run build

# --- Etapa 2: Servidor Web (Nginx) ---
FROM nginx:alpine

# Crear directorio para la configuración de Nginx
RUN mkdir -p /etc/nginx/conf.d

# Copiar la configuración personalizada de Nginx
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los estáticos compilados desde la etapa 'builder'
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto estándar HTTP
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
