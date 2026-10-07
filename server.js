const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS erlaubt Anfragen von deiner späteren HTML-Seite auf GitHub
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Speicher für die letzten 50 Nachrichten im Arbeitsspeicher
const chatHistory = [];
const MAX_HISTORY = 50;

io.on('connection', (socket) => {
  console.log('Neuer Nutzer verbunden:', socket.id);

  // Sendet den bisherigen Verlauf an den neu verbundenen Nutzer
  socket.emit('loadHistory', chatHistory);

  // Empfängt neue Nachricht und verteilt sie an ALLE
  socket.on('chatMessage', (data) => {
    if (!data.text || !data.text.trim()) return;

    const messageData = {
      user: data.user ? data.user.trim().substring(0, 20) : 'Anonym',
      text: data.text.trim().substring(0, 500),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    chatHistory.push(messageData);
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift();
    }

    io.emit('chatMessage', messageData);
  });

  socket.on('disconnect', () => {
    console.log('Nutzer getrennt:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
