'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type Status = 'disconnected' | 'qr' | 'authenticated' | 'ready' | 'auth_failure' | 'loading';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<Status>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState({ percent: 0, message: '' });

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

    return () => {
      newSocket.close();
    };
  }, []);

  const handleInitialize = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    fetch(`${API_URL}/api/initialize`, { method: 'POST' })
      .then(() => console.log('Cliente WhatsApp inicializado'));
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
              status === 'ready' ? 'bg-green-500' :
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

          {status === 'ready' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-center text-green-800 font-medium">
                🎉 Conectado com sucesso!
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
