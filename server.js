const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
  console.log('新しいクライアントが接続しました');
  ws.send('接続成功！チャットを始めましょう。');

  ws.on('message', (message) => {
    const text = message.toString();
    console.log('受信:', text);

    // すべてのクライアントに送信
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
