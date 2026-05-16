# ============================================
# Dockerfile para API PHP
# Campus Virtual CIIDEG
# ============================================
# Usamos php:8.2-fpm-alpine que es más ligero y no tiene
# los conflictos de libssl en Debian bookworm/trixie
FROM php:8.2-apache-bullseye

# Establecer directorio de trabajo
WORKDIR /var/www/html

# Instalar dependencias del sistema incluyendo PostgreSQL
# Nota: Check-Valid-Until=false es necesario por desfase de reloj en Docker
RUN apt-get -o Acquire::Check-Valid-Until=false update && \
    apt-get -o Acquire::Check-Valid-Until=false install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring zip gd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Habilitar módulos de Apache necesarios
RUN a2enmod rewrite headers

# Configurar PHP para producción
RUN echo "memory_limit=512M" >> /usr/local/etc/php/conf.d/memory-limit.ini && \
    echo "max_execution_time=300" >> /usr/local/etc/php/conf.d/time-limit.ini && \
    echo "upload_max_filesize=100M" >> /usr/local/etc/php/conf.d/uploads.ini && \
    echo "post_max_size=100M" >> /usr/local/etc/php/conf.d/uploads.ini && \
    echo "display_errors=Off" >> /usr/local/etc/php/conf.d/production.ini && \
    echo "log_errors=On" >> /usr/local/etc/php/conf.d/production.ini

# Configurar Apache para permitir .htaccess y habilitar AllowOverride
RUN printf '<Directory /var/www/html/api>\n\
    Options -Indexes\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/api.conf && \
    a2enconf api

# Copiar código de la API
COPY api/ /var/www/html/api/

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Exponer puerto 80
EXPOSE 80

# Comando para ejecutar Apache
CMD ["apache2-foreground"]
