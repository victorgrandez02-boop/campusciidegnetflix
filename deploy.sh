#!/usr/bin/env bash
# ============================================
# deploy.sh — Script de despliegue Campus Virtual CIIDEG
# ============================================
# Uso: bash deploy.sh [--rebuild]
#   --rebuild : Fuerza reconstrucción de imágenes Docker
# ============================================

set -euo pipefail

REBUILD=false
if [[ "${1:-}" == "--rebuild" ]]; then
    REBUILD=true
fi

echo "============================================"
echo "  Campus Virtual CIIDEG — Despliegue"
echo "============================================"

# 1. Verificar que existe el .env
if [ ! -f ".env" ]; then
    echo "❌ ERROR: No se encontró el archivo .env"
    echo "   Copia .env.example como .env y configura las variables."
    exit 1
fi

# 2. Cargar variables de entorno
set -a && source .env && set +a

echo "✅ Variables de entorno cargadas"
echo "   APP_ENV: ${APP_ENV:-production}"
echo "   CORS_ALLOWED_ORIGIN: ${CORS_ALLOWED_ORIGIN:-no configurado}"

# 3. Build del frontend (React/Vite)
echo ""
echo "📦 Construyendo frontend (React/Vite)..."
npm run build
echo "✅ Frontend construido en dist/"

# 4. Detener servicios anteriores
echo ""
echo "🛑 Deteniendo servicios anteriores..."
docker compose down --remove-orphans 2>/dev/null || true

# 5. Construir imágenes Docker
if [ "$REBUILD" = true ]; then
    echo ""
    echo "🔨 Reconstruyendo imágenes Docker (--rebuild)..."
    docker compose build --no-cache
else
    echo ""
    echo "🔨 Construyendo imágenes Docker..."
    docker compose build
fi

# 6. Iniciar servicios
echo ""
echo "🚀 Iniciando servicios..."
docker compose up -d

# 7. Esperar a que estén saludables
echo ""
echo "⏳ Esperando que los servicios estén disponibles..."
sleep 10

# 8. Verificar estado
echo ""
echo "📊 Estado de los contenedores:"
docker compose ps

echo ""
echo "============================================"
echo "  ✅ Despliegue completado"
echo "  🌐 Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "  🔌 API:      http://localhost:${API_PORT:-8080}/api/courses.php"
echo "============================================"
