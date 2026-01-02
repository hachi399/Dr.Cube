import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

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

// チャット履歴を保存（簡易実装、本番ではDB推奨）
const chatHistories = new Map();

// プロンプトテンプレート
const PROMPT_TEMPLATES = {
  default: "あなたは親切で知識豊富なアシスタントです。",
  creative: "あなたは創造的で独創的なアイデアを提供するアシスタントです。",
  technical: "あなたは技術的な質問に詳しい専門家です。",
  casual: "あなたはカジュアルでフレンドリーな会話パートナーです。",
  educational: "あなたは教育に熱心で、わかりやすく説明する教師です。"
};

// ファイルをBase64に変換
function fileToBase64(file) {
  if (!file) return null;
  const base64 = file.buffer.toString('base64');
  const mimeType = file.mimetype;
  return `data:${mimeType};base64,${base64}`;
}

// 画像ファイルかどうかを判定
function isImageFile(mimetype) {
  return mimetype && mimetype.startsWith('image/');
}

// 動画ファイルかどうかを判定
function isVideoFile(mimetype) {
  return mimetype && mimetype.startsWith('video/');
}

// チャットエンドポイント
app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { message, historyId, template = 'default' } = req.body;
    const file = req.file;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEYが設定されていません' 
      });
    }

    // モデル選択（画像がある場合はgemini-1.5-pro-vision、ない場合はgemini-1.5-pro）
    const modelName = (file && isImageFile(file.mimetype)) 
      ? 'gemini-1.5-pro-vision' 
      : 'gemini-1.5-pro';
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: PROMPT_TEMPLATES[template] || PROMPT_TEMPLATES.default
    });

    // チャット履歴の取得または初期化
    const historyKey = historyId || 'default';
    if (!chatHistories.has(historyKey)) {
      chatHistories.set(historyKey, []);
    }
    const history = chatHistories.get(historyKey);

    // メッセージの構築
    let userMessage = message || '';
    
    if (file) {
      if (isImageFile(file.mimetype)) {
        // 画像の場合
        const base64 = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        
        const parts = [
          {
            text: userMessage || 'この画像について説明してください。'
          },
          {
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          }
        ];
        
        history.push({ role: 'user', parts });
        
        const result = await model.generateContent({
          contents: history.map(h => ({
            role: h.role,
            parts: h.parts
          }))
        });
        
        const response = result.response;
        const text = response.text();
        
        history.push({ 
          role: 'model', 
          parts: [{ text }] 
        });
        
        return res.json({ 
          reply: text,
          historyId: historyKey,
          hasImage: true,
          imageMimeType: mimeType
        });
      } else if (isVideoFile(file.mimetype)) {
        // 動画の場合（Gemini 1.5 Proは動画もサポート）
        const base64 = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        
        const parts = [
          {
            text: userMessage || 'この動画について説明してください。'
          },
          {
            inlineData: {
              data: base64,
              mimeType: mimeType
            }
          }
        ];
        
        history.push({ role: 'user', parts });
        
        const visionModel = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-pro-vision',
          systemInstruction: PROMPT_TEMPLATES[template] || PROMPT_TEMPLATES.default
        });
        
        const result = await visionModel.generateContent({
          contents: history.map(h => ({
            role: h.role,
            parts: h.parts
          }))
        });
        
        const response = result.response;
        const text = response.text();
        
        history.push({ 
          role: 'model', 
          parts: [{ text }] 
        });
        
        return res.json({ 
          reply: text,
          historyId: historyKey,
          hasVideo: true,
          videoMimeType: mimeType
        });
      }
    }

    // テキストのみの場合
    if (!userMessage) {
      return res.status(400).json({ error: 'メッセージが必要です' });
    }

    history.push({ 
      role: 'user', 
      parts: [{ text: userMessage }] 
    });

    const result = await model.generateContent({
      contents: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const response = result.response;
    const text = response.text();

    history.push({ 
      role: 'model', 
      parts: [{ text }] 
    });

    res.json({ 
      reply: text,
      historyId: historyKey
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
app.post('/api/clear-history', (req, res) => {
  const { historyId } = req.body;
  const historyKey = historyId || 'default';
  chatHistories.delete(historyKey);
  res.json({ success: true });
});

// プロンプトテンプレート一覧を取得
app.get('/api/templates', (req, res) => {
  res.json({ templates: PROMPT_TEMPLATES });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('警告: GEMINI_API_KEYが設定されていません。環境変数を設定してください。');
  }
});

