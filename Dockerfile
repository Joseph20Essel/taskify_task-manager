FROM php:8.2-cli

# Install Node.js and Yarn for frontend assets if needed
RUN curl -sL https://nodesource.com | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn

WORKDIR /var/www/html
COPY . .

# Run yarn build if you have frontend assets
RUN yarn install

EXPOSE 80
CMD ["php", "-S", "0.0.0.0:80"]
