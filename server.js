const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const ALLOWED_USERS = ['Maxi', 'Jonas', 'Ben'];
const MAX_HISTORY = 500;
const MAX_TEXT = 1000;

let history = [];

app.get('/', (req, res) => res.send('Chat-Server läuft'));

function cleanText(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '';
}

io.on('connection', (socket) => {
  socket.emit('loadHistory', history);

  socket.on('chatMessage', (data) => {
    if (!data || !ALLOWED_USERS.includes(data.user)) return;
    const text = cleanText(data.text);
    if (!text) return;

    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      user: data.user,
      text,
      time: new Date().toISOString(),
      edited: false
    };

    history.push(msg);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    io.emit('chatMessage', msg);
  });

  socket.on('editMessage', (data) => {
    if (!data) return;
    const text = cleanText(data.text);
    if (!text) return;

    const msg = history.find((m) => m.id === data.id);
    if (!msg || msg.user !== data.user) return;

    msg.text = text;
    msg.edited = true;
    io.emit('messageEdited', { id: msg.id, text });
  });

  socket.on('clearChat', () => {
    history = [];
    io.emit('chatCleared');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server läuft auf Port ' + PORT));
