# Stage 1: Build do cliente Next.js
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copiar package.json primeiro
COPY client/package.json ./

# Copiar package-lock.json se existir (opcional)
COPY client/package-lock.json* ./

# Instalar dependências (npm install funciona mesmo sem package-lock.json)
RUN npm install

# Copiar resto dos arquivos do cliente
COPY client/ ./
RUN npm run build

# Stage 2: Instalar dependências do servidor
FROM node:18-alpine AS server-deps

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./

# Usar npm install se não houver package-lock.json, senão npm ci
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Stage 3: Imagem final
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copiar dependências do servidor
COPY --from=server-deps /app/node_modules ./node_modules

# Copiar código do servidor
COPY server.js ./
COPY package.json ./
COPY package-lock.json* ./

# Copiar build do Next.js
COPY --from=client-builder /app/client/.next ./client/.next
COPY --from=client-builder /app/client/public ./client/public
COPY --from=client-builder /app/client/node_modules ./client/node_modules
COPY --from=client-builder /app/client/package.json ./client/

# Criar diretório para sessões do WhatsApp
RUN mkdir -p .wwebjs_auth

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_URL=http://localhost:5000

# Expor portas
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["node", "server.js"]

