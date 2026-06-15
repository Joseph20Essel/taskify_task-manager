# Stage 1: Build Frontend Assets
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
# Uncomment the line below if you need to build your assets
# RUN yarn build 

# Stage 2: Production PHP Environment
FROM php:8.2-cli-alpine
WORKDIR /var/www/html

# Copy the application files
COPY . .

# Copy built node_modules and assets from Stage 1
COPY --from=frontend-builder /app/node_modules ./node_modules

# Expose port and start standard PHP server using the Render environment variable
EXPOSE 80
CMD ["sh", "-c", "php -S 0.0.0.0:$PORT"]
