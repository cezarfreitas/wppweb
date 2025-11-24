# WhatsApp Web.js - Bot com Frontend React/Next.js

Aplicação completa para conectar WhatsApp via WhatsApp Web.js com interface web em React/Next.js.

## 🚀 Funcionalidades

- ✅ Conexão WhatsApp via QR Code
- ✅ Interface web moderna com React/Next.js
- ✅ Comunicação em tempo real via Socket.io
- ✅ Persistência de sessão
- ✅ Deploy via Docker

## 📋 Pré-requisitos

- Node.js 18+
- Docker e Docker Compose (para deploy)
- Git

## 🛠️ Instalação Local

### 1. Clone o repositório

```bash
git clone https://github.com/cezarfreitas/wppweb.git
cd wppweb
```

### 2. Instale as dependências

```bash
# Instalar dependências do servidor
npm install

# Instalar dependências do cliente
cd client
npm install
cd ..
```

### 3. Execute o projeto

```bash
# Desenvolvimento (servidor + cliente)
npm run dev

# Ou separadamente:
npm run server  # Servidor na porta 5000
npm run client  # Cliente na porta 3000
```

### 4. Acesse a aplicação

Abra `http://localhost:3000` no navegador e escaneie o QR code com seu WhatsApp.

## 🐳 Deploy com Docker

### Opção 1: Docker Compose (Recomendado)

```bash
# Build e iniciar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### Opção 2: Docker direto

```bash
# Build da imagem
docker build -t whatsapp-bot .

# Executar container
docker run -d \
  --name whatsapp-bot \
  -p 5000:5000 \
  -v $(pwd)/wwebjs_auth:/app/.wwebjs_auth \
  whatsapp-bot
```

## 📦 Deploy em VPS

### 1. Conecte-se ao seu VPS

```bash
ssh usuario@seu-vps-ip
```

### 2. Instale Docker e Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Clone o repositório

```bash
git clone https://github.com/cezarfreitas/wppweb.git
cd wppweb
```

### 4. Configure variáveis de ambiente (opcional)

Crie um arquivo `.env`:

```env
PORT=5000
CLIENT_URL=http://seu-dominio.com
NODE_ENV=production
```

### 5. Execute com Docker Compose

```bash
docker-compose up -d --build
```

### 6. Configure Nginx (Recomendado)

Crie `/etc/nginx/sites-available/whatsapp-bot`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Ative o site:

```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Configure SSL com Let's Encrypt (Opcional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `5000` |
| `CLIENT_URL` | URL do cliente (para CORS) | `http://localhost:3000` |
| `NODE_ENV` | Ambiente de execução | `production` |

## 📁 Estrutura do Projeto

```
wpweb/
├── server.js              # Servidor Express + Socket.io
├── client/                # Aplicação Next.js
│   ├── src/
│   │   └── app/
│   │       └── page.tsx   # Componente principal
│   └── package.json
├── Dockerfile             # Configuração Docker
├── docker-compose.yml     # Docker Compose
└── package.json
```

## 🔐 Persistência de Sessão

A sessão do WhatsApp é salva em `.wwebjs_auth/`. No Docker, use volumes para persistir:

```yaml
volumes:
  - ./wwebjs_auth:/app/.wwebjs_auth
```

## 🐛 Troubleshooting

### QR Code não aparece

- Verifique se o servidor está rodando
- Verifique os logs: `docker-compose logs -f`
- Limpe a sessão: `rm -rf .wwebjs_auth`

### Erro de permissão no Docker

```bash
sudo chown -R $USER:$USER wwebjs_auth
```

### Porta já em uso

Altere a porta no `docker-compose.yml`:

```yaml
ports:
  - "8080:5000"  # Porta externa:porta interna
```

## 📝 Licença

ISC

## ⚠️ Aviso

Este projeto não é oficial do WhatsApp. Use por sua conta e risco. O WhatsApp pode bloquear contas que usam bots não oficiais.

