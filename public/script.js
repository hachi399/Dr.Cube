const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

const chatBox = document.getElementById('chat-box');
const input = document.getElementById('chat-input');
const button = document.getElementById('send-btn');

ws.onmessage = async (event) => {
  let text;

  if (typeof event.data === 'string') {
    text = event.data;
  } else if (event.data instanceof Blob) {
    text = await event.data.text();
  } else {
    text = JSON.stringify(event.data);
  }

  const div = document.createElement('div');
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
};

button.addEventListener('click', () => {
  const message = input.value.trim();
  if (message !== '') {
    ws.send(message);
    input.value = '';
  }
});
