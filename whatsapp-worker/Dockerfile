FROM node:16-bullseye

# Instalar dependencias necesarias para Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurar variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente (incluida la carpeta .wwebjs_auth con la sesión)
COPY . .

# Crear carpeta public para guardar QR si es necesario
RUN mkdir -p ./public && chmod -R 777 ./public

# Asegurar permisos correctos para la carpeta de sesión
RUN chmod -R 777 ./.wwebjs_auth

# Configurar volumen para la carpeta public
VOLUME ["/usr/src/app/public"]

# Exponer puerto (aunque no es necesario para un worker)
EXPOSE 8080

# Script de inicio que verifica la sesión y luego inicia la aplicación
COPY ./scripts/start.sh ./
RUN chmod +x ./start.sh

# Comando para iniciar la aplicación con verificación de sesión
CMD ["./start.sh"]
