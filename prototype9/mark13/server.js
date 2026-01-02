import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './database.js';
import { searchYouTubeVideos } from './youtube.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静的ファイルの提供
app.use(express.static(__dirname));

// Multer設定（メモリストレージ）
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB制限
});

// Gemini API初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// プロンプトテンプレート
const PROMPT_TEMPLATES = {
  default: "あなたは親切で知識豊富なアシスタントです。",
  creative: "あなたは創造的で独創的なアイデアを提供するアシスタントです。",
  technical: "あなたは技術的な質問に詳しい専門家です。",
  casual: "あなたはカジュアルでフレンドリーな会話パートナーです。",
  educational: "あなたは教育に熱心で、わかりやすく説明する教師です。",
  business: "あなたはビジネス向けの丁寧で簡潔な文章を作成するAIです。",
  code: "あなたはプログラミングの専門家です。コードの生成、レビュー、デバッグをサポートします。",
  analysis: "あなたはデータ分析の専門家です。データを分析し、洞察を提供します。"
};

// データベース初期化
await initDatabase();

// ==================== プロジェクト管理 ====================

// プロジェクト一覧取得
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.all('SELECT * FROM projects ORDER BY createdAt DESC');
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'プロジェクトの取得に失敗しました' });
  }
});

// プロジェクト作成
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'プロジェクト名が必要です' });
    }

    const result = await db.run(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    res.json({ 
      id: result.lastID, 
      name, 
      description: description || '',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
  }
});

// プロジェクト削除
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM projects WHERE id = ?', [id]);
    await db.run('DELETE FROM chat_history WHERE projectId = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'プロジェクトの削除に失敗しました' });
  }
});

// ==================== チャット履歴管理 ====================

// チャット履歴一覧取得
app.get('/api/chat-history', async (req, res) => {
  try {
    const { projectId } = req.query;
    let query = 'SELECT * FROM chat_history';
    let params = [];

    if (projectId) {
      query += ' WHERE projectId = ?';
      params.push(projectId);
    }

    query += ' ORDER BY createdAt DESC LIMIT 50';
    const history = await db.all(query, params);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'チャット履歴の取得に失敗しました' });
  }
});

// 特定のチャット履歴取得
app.get('/api/chat-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await db.get('SELECT * FROM chat_history WHERE id = ?', [id]);
    
    if (!history) {
      return res.status(404).json({ error: 'チャット履歴が見つかりません' });
    }

    const messages = JSON.parse(history.messages || '[]');
    res.json({ ...history, messages });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'チャットの取得に失敗しました' });
  }
});

// ==================== チャットエンドポイント ====================

app.post('/api/chat', upload.array('files', 10), async (req, res) => {
  try {
    const { message, historyId, projectId, template = 'default', customTemplate } = req.body;
    const files = req.files || [];

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEYが設定されていません' 
      });
    }

    // テンプレート選択
    const systemInstruction = customTemplate || PROMPT_TEMPLATES[template] || PROMPT_TEMPLATES.default;

    // モデル選択（画像/動画がある場合はgemini-1.5-pro-vision、ない場合はgemini-1.5-pro）
    const hasMedia = files.some(f => 
      f.mimetype.startsWith('image/') || f.mimetype.startsWith('video/')
    );
    
    const modelName = hasMedia ? 'gemini-1.5-pro' : 'gemini-1.5-pro';
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction
    });

    // チャット履歴の取得または初期化
    const historyKey = historyId || `chat-${Date.now()}`;
    let history = [];
    
    if (historyId) {
      const historyRecord = await db.get(
        'SELECT messages FROM chat_history WHERE id = ?',
        [historyId]
      );
      if (historyRecord) {
        history = JSON.parse(historyRecord.messages || '[]');
      }
    }

    // メッセージの構築
    let userMessage = message || '';
    
    // YouTube URLの検出と処理
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = userMessage.match(youtubeRegex);
    let youtubeVideo = null;

    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      try {
        const videos = await searchYouTubeVideos(videoId);
        if (videos && videos.length > 0) {
          youtubeVideo = videos[0];
          userMessage += `\n\nこの動画について説明してください: ${youtubeVideo.title}`;
        }
      } catch (error) {
        console.error('Error fetching YouTube video:', error);
      }
    }

    // ファイル処理
    const parts = [];
    
    if (userMessage) {
      parts.push({ text: userMessage });
    }

    files.forEach(file => {
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        parts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype
          }
        });
      } else {
        // テキストファイルなどの場合
        const text = file.buffer.toString('utf-8');
        parts.push({ text: `ファイル: ${file.originalname}\n内容:\n${text}` });
      }
    });

    if (parts.length === 0) {
      return res.status(400).json({ error: 'メッセージまたはファイルが必要です' });
    }

    // 履歴に追加
    history.push({ 
      role: 'user', 
      parts 
    });

    // Gemini API呼び出し
    const result = await model.generateContent({
      contents: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const response = result.response;
    const text = response.text();

    // 履歴に追加
    history.push({ 
      role: 'model', 
      parts: [{ text }] 
    });

    // データベースに保存
    const title = userMessage.substring(0, 50) || '新しいチャット';
    const messagesJson = JSON.stringify(history);

    if (historyId) {
      await db.run(
        'UPDATE chat_history SET messages = ?, title = ?, updatedAt = ? WHERE id = ?',
        [messagesJson, title, new Date().toISOString(), historyId]
      );
    } else {
      const result = await db.run(
        'INSERT INTO chat_history (id, projectId, title, messages) VALUES (?, ?, ?, ?)',
        [historyKey, projectId || null, title, messagesJson]
      );
    }

    // レスポンス
    const hasVideo = files.some(f => f.mimetype.startsWith('video/'));
    const videoMimeType = hasVideo ? files.find(f => f.mimetype.startsWith('video/')).mimetype : null;

    res.json({ 
      reply: text,
      historyId: historyKey,
      hasVideo,
      videoMimeType,
      youtubeVideo
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'エラーが発生しました',
      message: error.message 
    });
  }
});

// チャット履歴をクリア
app.post('/api/clear-history', async (req, res) => {
  try {
    const { historyId, projectId } = req.body;
    
    if (historyId) {
      await db.run('DELETE FROM chat_history WHERE id = ?', [historyId]);
    } else if (projectId) {
      await db.run('DELETE FROM chat_history WHERE projectId = ?', [projectId]);
    } else {
      return res.status(400).json({ error: 'historyIdまたはprojectIdが必要です' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: '履歴のクリアに失敗しました' });
  }
});

// プロンプトテンプレート一覧を取得
app.get('/api/templates', (req, res) => {
  res.json({ templates: PROMPT_TEMPLATES });
});

// ==================== YouTube検索 ====================

app.get('/api/youtube/search', async (req, res) => {
  try {
    const { q, videoId } = req.query;
    
    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ 
        error: 'YOUTUBE_API_KEYが設定されていません' 
      });
    }

    if (videoId) {
      // 特定の動画IDで検索
      const videos = await searchYouTubeVideos(videoId);
      res.json({ videos: videos || [] });
    } else if (q) {
      // クエリで検索
      const videos = await searchYouTubeVideos(null, q);
      res.json({ videos: videos || [] });
    } else {
      return res.status(400).json({ error: 'qまたはvideoIdパラメータが必要です' });
    }
  } catch (error) {
    console.error('Error searching YouTube:', error);
    res.status(500).json({ 
      error: 'YouTube検索に失敗しました',
      message: error.message 
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasYouTubeKey: !!process.env.YOUTUBE_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('警告: GEMINI_API_KEYが設定されていません。環境変数を設定してください。');
  }
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('警告: YOUTUBE_API_KEYが設定されていません。YouTube検索機能が使用できません。');
  }
});

