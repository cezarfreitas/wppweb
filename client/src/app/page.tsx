'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type Status = 'disconnected' | 'qr' | 'authenticated' | 'ready' | 'auth_failure' | 'loading';

interface MessageLog {
  timestamp: string;
  type: 'sent' | 'received';
  data: any;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<Status>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState({ percent: 0, message: '' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado ao servidor');
      fetch(`${API_URL}/api/status`)
        .then(res => res.json())
        .then(data => {
          setStatus(data.status);
          if (data.status === 'disconnected') {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
            fetch(`${API_URL}/api/initialize`, { method: 'POST' })
              .then(() => console.log('Cliente WhatsApp inicializado'));
          }
        });
    });

    newSocket.on('status', (data: { status: Status }) => {
      setStatus(data.status);
    });

    newSocket.on('qr', (data: { qr: string; qrString: string }) => {
      console.log('QR Code recebido');
      setQrCode(data.qr);
      setStatus('qr');
    });

    newSocket.on('authenticated', () => {
      setStatus('authenticated');
      setQrCode(null);
    });

    newSocket.on('ready', () => {
      setStatus('ready');
      setQrCode(null);
    });

    newSocket.on('auth_failure', () => {
      setStatus('auth_failure');
      setQrCode(null);
    });

    newSocket.on('loading', (data: { percent: number; message: string }) => {
      setLoading(data);
      setStatus('loading');
    });

    newSocket.on('message_received', (data: any) => {
      setMessageLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'received',
        data
      }]);
    });

    newSocket.on('message_sent', (data: any) => {
      setMessageLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'sent',
        data
      }]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleInitialize = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    fetch(`${API_URL}/api/initialize`, { method: 'POST' })
      .then(() => console.log('Cliente WhatsApp inicializado'));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !message) return;
    
    setSending(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    
    try {
      const response = await fetch(`${API_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('');
        console.log('Mensagem enviada:', data);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao enviar mensagem');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const clearLogs = () => {
    setMessageLogs([]);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'disconnected':
        return 'Desconectado';
      case 'qr':
        return 'Escaneie o QR Code com seu WhatsApp';
      case 'authenticated':
        return 'Autenticado com sucesso!';
      case 'ready':
        return '✅ WhatsApp está pronto!';
      case 'auth_failure':
        return '❌ Falha na autenticação';
      case 'loading':
        return `Carregando... ${loading.percent}%`;
      default:
        return 'Aguardando...';
    }
  };

  // Se estiver conectado, mostrar dashboard
  if (status === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                WhatsApp Web.js - Dashboard
              </h1>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-sm font-medium text-gray-700">Conectado</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Envio */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Enviar Mensagem
              </h2>
              
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número (com código do país)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="5511999999999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplo: 5511999999999 (Brasil)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {sending ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>

            {/* Log de Mensagens */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Log de Mensagens
                </h2>
                <button
                  onClick={clearLogs}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {messageLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma mensagem ainda...
                  </p>
                ) : (
                  messageLogs.slice().reverse().map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        log.type === 'sent'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-semibold ${
                          log.type === 'sent' ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {log.type === 'sent' ? '📤 ENVIADA' : '📥 RECEBIDA'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de login/QR Code
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              WhatsApp Web.js
            </h1>
            <p className="text-gray-600">
              Conecte seu WhatsApp
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'qr' ? 'bg-yellow-500' :
              status === 'auth_failure' ? 'bg-red-500' :
              'bg-gray-500'
            } animate-pulse`}></div>
            <p className="text-sm font-medium text-gray-700">
              {getStatusMessage()}
            </p>
          </div>

          {qrCode && (
            <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 text-center">
                Abra o WhatsApp no seu celular e escaneie este código
              </p>
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${loading.percent}%` }}
                ></div>
              </div>
              <p className="text-xs text-center text-gray-600">
                {loading.message}
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-3 pt-4">
            {status === 'disconnected' && (
              <button
                onClick={handleInitialize}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Inicializar WhatsApp
              </button>
            )}

            {status === 'auth_failure' && (
              <button
                onClick={handleInitialize}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
