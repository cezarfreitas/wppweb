const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse http://localhost:3000 para ver o QR code`);
});

