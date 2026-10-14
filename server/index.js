// Server Utama WNI Simulator (Express + Socket.io Otoritatif + Vite Dev Middleware)
// Menjalankan backend Socket.io sekaligus frontend Vite dalam satu perintah `npm run dev`

import express from 'express';
import http from 'http';
import os from 'os';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { RoomManager } from './room.js';

function getLocalIpAddresses() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, address: net.address });
      }
    }
  }
  return ips;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Inisialisasi Socket.io Server Otoritatif
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const roomManager = new RoomManager(io);

  // Endpoint cek kesehatan server & jumlah room aktif
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeRooms: roomManager.rooms.size
    });
  });

  // Integrasikan Vite dalam mode middleware agar klien & Socket.io berjalan di port yang sama
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  const PORT = process.env.PORT || 5178;
  const HOST = '0.0.0.0';

  httpServer.listen(PORT, HOST, () => {
    const localIps = getLocalIpAddresses();
    console.log('==========================================================');
    console.log(' [WNI Simulator] Server Otoritatif & Klien 3D Aktif!');
    console.log(` PC ini (Lokal)       : http://localhost:${PORT}`);
    localIps.forEach((item) => {
      console.log(` HP/Perangkat 1 Wi-Fi : http://${item.address}:${PORT} (${item.name})`);
    });
    console.log('==========================================================');
  });
}

startServer();