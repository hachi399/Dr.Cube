// API設定
const API_BASE = window.location.origin;
const API_CHAT = `${API_BASE}/api/chat`;
const API_CLEAR_HISTORY = `${API_BASE}/api/clear-history`;
const API_PROJECTS = `${API_BASE}/api/projects`;
const API_YOUTUBE = `${API_BASE}/api/youtube/search`;

// 状態管理
let currentHistoryId = `chat-${Date.now()}`;
let currentProjectId = null;
let selectedTemplate = 'default';
let selectedFiles = [];
let customTemplate = null;

// DOM要素
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const templateSelect = document.getElementById('templateSelect');
const newChatBtn = document.getElementById('newChatBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const projectsList = document.getElementById('projectsList');
const chatHistoryList = document.getElementById('chatHistoryList');
const newProjectBtn = document.getElementById('newProjectBtn');
const projectModal = document.getElementById('projectModal');
const templateModal = document.getElementById('templateModal');
const youtubeSearchInput = document.getElementById('youtubeSearchInput');
const youtubeSearchBtn = document.getElementById('youtubeSearchBtn');
const youtubeResults = document.getElementById('youtubeResults');

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
  customTemplate = null;
});
newChatBtn.addEventListener('click', startNewChat);
clearHistoryBtn.addEventListener('click', clearHistory);
newProjectBtn.addEventListener('click', () => projectModal.classList.add('show'));
document.getElementById('createProjectBtn').addEventListener('click', createProject);
document.getElementById('cancelProjectBtn').addEventListener('click', () => projectModal.classList.remove('show'));
document.getElementById('customTemplateBtn').addEventListener('click', () => templateModal.classList.add('show'));
document.getElementById('saveTemplateBtn').addEventListener('click', saveCustomTemplate);
document.getElementById('cancelTemplateBtn').addEventListener('click', () => templateModal.classList.remove('show'));
youtubeSearchBtn.addEventListener('click', searchYouTube);
youtubeSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchYouTube();
  }
});

// モーダル外クリックで閉じる
projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) {
    projectModal.classList.remove('show');
  }
});
templateModal.addEventListener('click', (e) => {
  if (e.target === templateModal) {
    templateModal.classList.remove('show');
  }
});

// テキストエリアの自動リサイズ
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
});

// 初期化
async function init() {
  await loadProjects();
  await loadChatHistory();
}

// プロジェクト管理
async function loadProjects() {
  try {
    const response = await fetch(API_PROJECTS);
    const data = await response.json();
    projectsList.innerHTML = '';
    
    if (data.projects && data.projects.length > 0) {
      data.projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.textContent = project.name;
        item.onclick = () => selectProject(project.id);
        if (project.id === currentProjectId) {
          item.classList.add('active');
        }
        projectsList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

async function createProject() {
  const name = document.getElementById('projectNameInput').value.trim();
  const description = document.getElementById('projectDescInput').value.trim();
  
  if (!name) {
    alert('プロジェクト名を入力してください');
    return;
  }

  try {
    const response = await fetch(API_PROJECTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });

    if (response.ok) {
      projectModal.classList.remove('show');
      document.getElementById('projectNameInput').value = '';
      document.getElementById('projectDescInput').value = '';
      await loadProjects();
    } else {
      alert('プロジェクトの作成に失敗しました');
    }
  } catch (error) {
    console.error('Error creating project:', error);
    alert('エラーが発生しました');
  }
}

function selectProject(projectId) {
  currentProjectId = projectId;
  currentHistoryId = `chat-${Date.now()}`;
  loadProjects();
  startNewChat();
}

// カスタムテンプレート
function saveCustomTemplate() {
  const template = document.getElementById('customTemplateInput').value.trim();
  if (!template) {
    alert('テンプレートを入力してください');
    return;
  }
  customTemplate = template;
  selectedTemplate = 'custom';
  templateModal.classList.remove('show');
  document.getElementById('customTemplateInput').value = '';
  alert('カスタムテンプレートが設定されました');
}

// チャット履歴
async function loadChatHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/chat-history?projectId=${currentProjectId || ''}`);
    const data = await response.json();
    chatHistoryList.innerHTML = '';
    
    if (data.history && data.history.length > 0) {
      data.history.forEach(history => {
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.textContent = history.title || `チャット ${new Date(history.createdAt).toLocaleString()}`;
        item.onclick = () => loadChatHistoryById(history.id);
        chatHistoryList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

async function loadChatHistoryById(historyId) {
  try {
    const response = await fetch(`${API_BASE}/api/chat-history/${historyId}`);
    const data = await response.json();
    
    chatContainer.innerHTML = '';
    if (data.messages && data.messages.length > 0) {
      data.messages.forEach(msg => {
        addMessage(msg.role, msg.content, null, false, null, false);
      });
    }
    currentHistoryId = historyId;
  } catch (error) {
    console.error('Error loading chat:', error);
  }
}

// YouTube検索
async function searchYouTube() {
  const query = youtubeSearchInput.value.trim();
  if (!query) return;

  try {
    const response = await fetch(`${API_YOUTUBE}?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    youtubeResults.innerHTML = '';
    
    if (data.videos && data.videos.length > 0) {
      data.videos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'youtube-result-item';
        item.innerHTML = `
          <img src="${video.thumbnail}" alt="${video.title}">
          <h4>${video.title}</h4>
          <p>${video.channelTitle} • ${video.publishedAt}</p>
        `;
        item.onclick = () => addYouTubeVideo(video);
        youtubeResults.appendChild(item);
      });
    } else {
      youtubeResults.innerHTML = '<p style="color: var(--text-secondary); padding: 12px;">結果が見つかりませんでした</p>';
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    youtubeResults.innerHTML = '<p style="color: var(--error); padding: 12px;">検索エラーが発生しました</p>';
  }
}

function addYouTubeVideo(video) {
  const message = `このYouTube動画について説明してください: ${video.title}\nURL: https://www.youtube.com/watch?v=${video.videoId}`;
  messageInput.value = message;
  youtubeSearchInput.value = '';
  youtubeResults.innerHTML = '';
}

// ファイル選択処理
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  selectedFiles = [...selectedFiles, ...files];
  displayFilePreview();
}

// ファイルプレビュー表示
function displayFilePreview() {
  filePreview.innerHTML = '';

  selectedFiles.forEach((file, index) => {
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
    } else {
      const fileIcon = document.createElement('div');
      fileIcon.style.cssText = 'padding: 20px; text-align: center; color: var(--text-secondary);';
      fileIcon.textContent = `📄 ${file.name}`;
      previewItem.appendChild(fileIcon);
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
      selectedFiles.splice(index, 1);
      displayFilePreview();
    };
    previewItem.appendChild(removeBtn);

    filePreview.appendChild(previewItem);
  });
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
  
  if (!message && selectedFiles.length === 0) {
    return;
  }

  // ユーザーメッセージを表示
  if (message || selectedFiles.length > 0) {
    addMessage('user', message, selectedFiles);
  }

  // 入力欄をクリア
  messageInput.value = '';
  messageInput.style.height = 'auto';
  const filesToSend = [...selectedFiles];
  selectedFiles = [];
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
    filesToSend.forEach(file => {
      formData.append('files', file);
    });
    formData.append('historyId', currentHistoryId);
    formData.append('projectId', currentProjectId || '');
    formData.append('template', selectedTemplate);
    if (customTemplate) {
      formData.append('customTemplate', customTemplate);
    }

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
    addMessage('assistant', data.reply, null, data.hasVideo, data.videoMimeType, data.youtubeVideo);

    // 履歴を更新
    await loadChatHistory();

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
function addMessage(role, content, files = null, hasVideo = false, videoMimeType = null, youtubeVideo = null) {
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
  if (files && files.length > 0) {
    files.forEach(file => {
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
    });
  }

  // YouTube動画カード
  if (youtubeVideo) {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.innerHTML = `
      <iframe src="https://www.youtube.com/embed/${youtubeVideo.videoId}" allowfullscreen></iframe>
      <div class="video-card-title">${youtubeVideo.title}</div>
      <div class="video-card-description">${youtubeVideo.description || ''}</div>
    `;
    contentDiv.appendChild(videoCard);
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
      <div class="welcome-features">
        <div class="feature-item">
          <strong>📁 ファイルアップロード</strong>
          <p>画像や動画をアップロードして分析できます</p>
        </div>
        <div class="feature-item">
          <strong>📊 表・図のレンダリング</strong>
          <p>MarkdownとMermaid図表をサポート</p>
        </div>
        <div class="feature-item">
          <strong>🎬 YouTube連携</strong>
          <p>YouTube動画を検索して会話に追加</p>
        </div>
        <div class="feature-item">
          <strong>💬 プロンプトテンプレート</strong>
          <p>用途に応じたテンプレートを選択</p>
        </div>
      </div>
    </div>
  `;
  selectedFiles = [];
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
      body: JSON.stringify({ historyId: currentHistoryId, projectId: currentProjectId })
    });

    startNewChat();
    await loadChatHistory();
  } catch (error) {
    console.error('Error clearing history:', error);
    alert('履歴のクリアに失敗しました');
  }
}

// 初期化実行
init();

