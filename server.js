const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 2e6 // 2 MB, damit Fotos durchpassen
});

const ALLOWED_USERS = ['Maxi', 'Jonas', 'Ben'];
const MAX_HISTORY = 300;
const MAX_TEXT = 1000;
const MAX_IMAGE_CHARS = 950000;
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
const GIF_RE = /^https:\/\/(media\d*|i)\.giphy\.com\/[A-Za-z0-9_\-.\/]+(\?[A-Za-z0-9_=&%.\-]*)?$/;

let history = [];

app.get('/', (req, res) => res.send('Chat-Server läuft'));

function cleanText(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '';
}

function cleanImage(value) {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_CHARS) return null;
  return IMAGE_RE.test(value) ? value : null;
}

function cleanGif(value) {
  if (typeof value !== 'string' || value.length > 600) return null;
  return GIF_RE.test(value) ? value : null;
}

io.on('connection', (socket) => {
  socket.emit('loadHistory', history);

  socket.on('chatMessage', (data) => {
    if (!data || !ALLOWED_USERS.includes(data.user)) return;
    const text = cleanText(data.text);
    const image = cleanImage(data.image);
    const gif = image ? null : cleanGif(data.gif);
    if (!text && !image && !gif) return;

    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      user: data.user,
      text,
      time: new Date().toISOString(),
      edited: false
    };
    if (image) msg.image = image;
    if (gif) msg.gif = gif;

    history.push(msg);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    io.emit('chatMessage', msg);
  });

  socket.on('editMessage', (data) => {
    if (!data) return;
    const text = cleanText(data.text);

    const msg = history.find((m) => m.id === data.id);
    if (!msg || msg.user !== data.user) return;
    if (!text && !msg.image && !msg.gif) return;

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
