// API設定
const API_BASE = window.location.origin;
const API_CHAT = `${API_BASE}/api/chat`;
const API_CLEAR_HISTORY = `${API_BASE}/api/clear-history`;

// 状態管理
let currentHistoryId = `chat-${Date.now()}`;
let selectedTemplate = 'default';
let selectedFile = null;

// DOM要素
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const templateSelect = document.getElementById('templateSelect');
const newChatBtn = document.getElementById('newChatBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Mermaid初期化
mermaid.initialize({ 
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose'
});

// イベントリスナー
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
fileInput.addEventListener('change', handleFileSelect);
templateSelect.addEventListener('change', (e) => {
  selectedTemplate = e.target.value;
});
newChatBtn.addEventListener('click', startNewChat);
clearHistoryBtn.addEventListener('click', clearHistory);

// テキストエリアの自動リサイズ
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
});

// ファイル選択処理
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  displayFilePreview(file);
}

// ファイルプレビュー表示
function displayFilePreview(file) {
  filePreview.innerHTML = '';

  const previewItem = document.createElement('div');
  previewItem.className = 'file-preview-item';

  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    previewItem.appendChild(img);
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    previewItem.appendChild(video);
  }

  // ファイル情報
  const fileInfo = document.createElement('div');
  fileInfo.style.cssText = 'padding: 8px; font-size: 12px; color: var(--text-secondary);';
  fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
  previewItem.appendChild(fileInfo);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => {
    selectedFile = null;
    fileInput.value = '';
    filePreview.innerHTML = '';
  };
  previewItem.appendChild(removeBtn);

  filePreview.appendChild(previewItem);
}

// ファイルサイズをフォーマット
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// メッセージ送信
async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message && !selectedFile) {
    return;
  }

  // ユーザーメッセージを表示
  if (message || selectedFile) {
    addMessage('user', message, selectedFile);
  }

  // 入力欄をクリア
  messageInput.value = '';
  messageInput.style.height = 'auto';
  selectedFile = null;
  fileInput.value = '';
  filePreview.innerHTML = '';

  // ローディング表示
  const loadingId = addLoadingMessage();

  try {
    // FormDataを作成
    const formData = new FormData();
    if (message) {
      formData.append('message', message);
    }
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('historyId', currentHistoryId);
    formData.append('template', selectedTemplate);

    const response = await fetch(API_CHAT, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // ローディングを削除
    removeLoadingMessage(loadingId);

    // アシスタントの応答を表示
    addMessage('assistant', data.reply, null, data.hasVideo, data.videoMimeType);

  } catch (error) {
    console.error('Error:', error);
    removeLoadingMessage(loadingId);
    let errorMessage = 'エラーが発生しました。';
    if (error.message.includes('GEMINI_API_KEY')) {
      errorMessage = 'Gemini APIキーが設定されていません。環境変数GEMINI_API_KEYを設定してください。';
    } else if (error.message.includes('fetch')) {
      errorMessage = 'サーバーに接続できませんでした。サーバーが起動しているか確認してください。';
    } else {
      errorMessage = `エラーが発生しました: ${error.message}`;
    }
    addMessage('assistant', errorMessage, null);
  }
}

// メッセージを追加
function addMessage(role, content, file = null, hasVideo = false, videoMimeType = null) {
  // ウェルカムメッセージを削除
  const welcomeMsg = chatContainer.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // ファイルがある場合
  if (file) {
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'message-image';
      contentDiv.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.className = 'message-video';
      contentDiv.appendChild(video);
    }
  }

  // テキストコンテンツ
  if (content) {
    // MarkdownをHTMLに変換
    const html = marked.parse(content);
    contentDiv.innerHTML += html;

    // コードハイライト
    contentDiv.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });

    // Mermaid図表をレンダリング
    setTimeout(() => {
      contentDiv.querySelectorAll('pre code.language-mermaid, pre code[class*="mermaid"]').forEach((codeElement) => {
        const mermaidCode = codeElement.textContent || codeElement.innerText;
        
        if (mermaidCode && mermaidCode.trim()) {
          const preElement = codeElement.parentElement;
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          mermaidDiv.textContent = mermaidCode.trim();
          
          // 元のpre要素を置き換え
          preElement.parentNode.replaceChild(mermaidDiv, preElement);
          
          // Mermaidをレンダリング
          try {
            mermaid.run({
              nodes: [mermaidDiv]
            });
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            mermaidDiv.innerHTML = `<pre>${mermaidCode}</pre><p style="color: var(--error);">Mermaid図表のレンダリングに失敗しました</p>`;
          }
        }
      });
    }, 100);

    // 動画カードの処理（APIから動画情報が返された場合）
    if (hasVideo && videoMimeType) {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-card';
      videoCard.innerHTML = `
        <div class="video-card-info">動画が含まれています</div>
      `;
      contentDiv.appendChild(videoCard);
    }
  }

  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);

  // スクロールを最下部に
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return messageDiv;
}

// ローディングメッセージを追加
function addLoadingMessage() {
  const loadingId = `loading-${Date.now()}`;
  const loadingDiv = document.createElement('div');
  loadingDiv.id = loadingId;
  loadingDiv.className = 'message assistant loading';
  
  const loadingContent = document.createElement('div');
  loadingContent.className = 'loading';
  loadingContent.innerHTML = `
    <div class="loading-dot"></div>
    <div class="loading-dot"></div>
    <div class="loading-dot"></div>
  `;
  
  loadingDiv.appendChild(loadingContent);
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return loadingId;
}

// ローディングメッセージを削除
function removeLoadingMessage(loadingId) {
  const loadingElement = document.getElementById(loadingId);
  if (loadingElement) {
    loadingElement.remove();
  }
}

// 新しいチャットを開始
function startNewChat() {
  currentHistoryId = `chat-${Date.now()}`;
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <h1>Gemini Chatへようこそ</h1>
      <p>メッセージを送信するか、ファイルをアップロードして会話を始めましょう。</p>
    </div>
  `;
  selectedFile = null;
  fileInput.value = '';
  filePreview.innerHTML = '';
}

// 履歴をクリア
async function clearHistory() {
  if (!confirm('チャット履歴をクリアしますか？')) {
    return;
  }

  try {
    await fetch(API_CLEAR_HISTORY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historyId: currentHistoryId })
    });

    startNewChat();
  } catch (error) {
    console.error('Error clearing history:', error);
    alert('履歴のクリアに失敗しました');
  }
}

// テーブルスタイリングの改善
document.addEventListener('DOMContentLoaded', () => {
  // 既存のテーブルにスタイルを適用
  const style = document.createElement('style');
  style.textContent = `
    .message-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      overflow: hidden;
    }
    .message-content table th,
    .message-content table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .message-content table th {
      background: rgba(0, 0, 0, 0.3);
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
});

