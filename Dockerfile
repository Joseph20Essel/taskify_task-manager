FROM php:8.2-apache

# Install required PHP extensions for PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev && \
    docker-php-ext-install pdo pdo_pgsql

# Enable Apache rewrite module
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy application files from the 123 directory
COPY 123/ .

# Set proper permissions for Apache
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Enable Apache modules for better compatibility
RUN a2enmod headers

EXPOSE 80

CMD ["apache2-foreground"]
