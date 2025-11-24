const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 5000;

// Permitir CORS de qualquer origem (para localtunnel)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: "*"
}));
app.use(express.json());

// Servir arquivos estáticos do Next.js
app.use('/_next/static', express.static(path.join(__dirname, 'client/.next/static')));
app.use(express.static(path.join(__dirname, 'client/public')));

let whatsappClient = null;
let qrCodeData = null;
let clientStatus = 'disconnected';

function initializeWhatsApp() {
    if (whatsappClient) {
        return;
    }

    console.log('Inicializando cliente WhatsApp...');
    whatsappClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    whatsappClient.on('qr', async (qr) => {
        console.log('QR Code recebido');
        qrCodeData = qr;
        clientStatus = 'qr';
        
        try {
            const qrImage = await qrcode.toDataURL(qr);
            io.emit('qr', { qr: qrImage, qrString: qr });
            console.log('QR Code enviado para o cliente');
        } catch (err) {
            console.error('Erro ao gerar QR code:', err);
            io.emit('qr', { qr: null, qrString: qr });
        }
    });

    whatsappClient.on('ready', () => {
        console.log('✅ Cliente WhatsApp está pronto!');
        clientStatus = 'ready';
        qrCodeData = null;
        io.emit('ready');
        io.emit('status', { status: 'ready' });
    });

    whatsappClient.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
        clientStatus = 'authenticated';
        io.emit('authenticated');
        io.emit('status', { status: 'authenticated' });
    });

    whatsappClient.on('auth_failure', (msg) => {
        console.error('❌ Falha na autenticação:', msg);
        clientStatus = 'auth_failure';
        io.emit('auth_failure', { message: msg });
        io.emit('status', { status: 'auth_failure' });
    });

    whatsappClient.on('disconnected', (reason) => {
        console.log('❌ Cliente desconectado:', reason);
        clientStatus = 'disconnected';
        qrCodeData = null;
        io.emit('disconnected', { reason });
        io.emit('status', { status: 'disconnected' });
        whatsappClient = null;
    });

    whatsappClient.on('loading_screen', (percent, message) => {
        console.log('Carregando:', percent, message);
        io.emit('loading', { percent, message });
    });

    whatsappClient.on('message', async (msg) => {
        console.log('Mensagem recebida:', msg.from, msg.body);
        
        // Para mensagens de grupo, usar 'author' ao invés de 'from'
        const isGroup = msg.from.endsWith('@g.us');
        const contactId = isGroup ? msg.author : msg.from;
        
        // Obter informações do contato
        let contact = null;
        let contactName = null;
        try {
            contact = await msg.getContact();
            contactName = contact.pushname || contact.name || contact.number;
        } catch (err) {
            console.error('Erro ao obter contato:', err);
        }
        
        io.emit('message_received', {
            from: msg.from,
            author: msg.author, // Número do autor (em grupos)
            contactId: contactId, // ID do contato real (autor se for grupo, from se for individual)
            contactName: contactName, // Nome do contato
            body: msg.body,
            timestamp: msg.timestamp,
            fromMe: msg.fromMe,
            hasMedia: msg.hasMedia,
            type: msg.type,
            isGroup: isGroup,
            id: msg.id._serialized
        });
    });

    whatsappClient.on('message_create', async (msg) => {
        if (msg.fromMe) {
            console.log('Mensagem enviada:', msg.to, msg.body);
            
            const isGroup = msg.to.endsWith('@g.us');
            
            // Obter informações do contato/grupo
            let contact = null;
            let contactName = null;
            try {
                contact = await msg.getContact();
                contactName = contact.pushname || contact.name || contact.number;
            } catch (err) {
                console.error('Erro ao obter contato:', err);
            }
            
            io.emit('message_sent', {
                to: msg.to,
                contactName: contactName,
                body: msg.body,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                type: msg.type,
                isGroup: isGroup,
                id: msg.id._serialized
            });
        }
    });

    whatsappClient.initialize().catch(err => {
        console.error('Erro ao inicializar:', err);
    });
}

app.get('/api/status', (req, res) => {
    res.json({ 
        status: clientStatus,
        hasQr: !!qrCodeData
    });
});

app.post('/api/initialize', (req, res) => {
    if (!whatsappClient) {
        initializeWhatsApp();
        res.json({ message: 'Cliente WhatsApp inicializado' });
    } else {
        res.json({ message: 'Cliente já está inicializado' });
    }
});

app.post('/api/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
    }

    if (!whatsappClient || clientStatus !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp não está conectado' });
    }

    try {
        // Formatar número para o formato do WhatsApp
        const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        // Enviar mensagem
        const sentMessage = await whatsappClient.sendMessage(chatId, message);
        
        console.log('Mensagem enviada com sucesso:', chatId);
        
        res.json({ 
            success: true, 
            message: 'Mensagem enviada com sucesso',
            messageId: sentMessage.id._serialized
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ 
            error: 'Erro ao enviar mensagem', 
            details: error.message 
        });
    }
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    socket.emit('status', { status: clientStatus });
    
    if (qrCodeData && clientStatus === 'qr') {
        qrcode.toDataURL(qrCodeData).then(qrImage => {
            socket.emit('qr', { qr: qrImage, qrString: qrCodeData });
        }).catch(err => {
            socket.emit('qr', { qr: null, qrString: qrCodeData });
        });
    }

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// Rota para servir o frontend (Next.js)
const next = require('next');
const nextApp = next({ 
    dev: process.env.NODE_ENV !== 'production',
    dir: path.join(__dirname, 'client')
});
const nextHandler = nextApp.getRequestHandler();

// Preparar Next.js e servir
nextApp.prepare().then(() => {
    app.get('*', (req, res) => {
        // Ignorar rotas da API e Socket.io - deixar o Express lidar
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return res.status(404).json({ error: 'Not found' });
        }
        // Servir páginas do Next.js
        return nextHandler(req, res);
    });
}).catch(err => {
    console.error('Erro ao preparar Next.js:', err);
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse ${CLIENT_URL} para ver o QR code`);
});

