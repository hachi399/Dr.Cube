# API設計ドキュメント

## 概要

Gemini Chat AppのバックエンドAPI設計書です。すべてのエンドポイント、リクエスト/レスポンス形式、エラーハンドリングを記載しています。

## ベースURL

- ローカル開発: `http://localhost:3000`
- 本番環境: `https://your-app.onrender.com`

## 認証

現在の実装では認証は不要です。将来的にはJWTトークンによる認証を追加することを推奨します。

## エンドポイント一覧

### 1. チャット

#### POST /api/chat

チャットメッセージを送信し、Gemini APIから応答を取得します。

**リクエスト:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `message` (string, optional): ユーザーメッセージ
  - `files[]` (File[], optional): アップロードするファイル（画像、動画、PDFなど）
  - `historyId` (string, optional): チャット履歴ID（継続会話の場合）
  - `projectId` (string, optional): プロジェクトID
  - `template` (string, optional): プロンプトテンプレート名（default: "default"）
  - `customTemplate` (string, optional): カスタムプロンプトテンプレート

**レスポンス:**
```json
{
  "reply": "AIからの応答テキスト",
  "historyId": "chat-1234567890",
  "hasVideo": false,
  "videoMimeType": null,
  "youtubeVideo": null
}
```

**エラー:**
- `400 Bad Request`: メッセージまたはファイルが必要
- `500 Internal Server Error`: サーバーエラー

**例:**
```javascript
const formData = new FormData();
formData.append('message', 'こんにちは');
formData.append('files', fileInput.files[0]);
formData.append('template', 'creative');

const response = await fetch('/api/chat', {
  method: 'POST',
  body: formData
});
```

---

### 2. プロジェクト管理

#### GET /api/projects

プロジェクト一覧を取得します。

**リクエスト:**
- Method: `GET`

**レスポンス:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "プロジェクト名",
      "description": "説明",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/projects

新規プロジェクトを作成します。

**リクエスト:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "name": "プロジェクト名",
    "description": "説明（オプション）"
  }
  ```

**レスポンス:**
```json
{
  "id": 1,
  "name": "プロジェクト名",
  "description": "説明",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**エラー:**
- `400 Bad Request`: プロジェクト名が必要

---

#### DELETE /api/projects/:id

プロジェクトを削除します（関連するチャット履歴も削除されます）。

**リクエスト:**
- Method: `DELETE`
- URL Parameter: `id` (integer)

**レスポンス:**
```json
{
  "success": true
}
```

---

### 3. チャット履歴

#### GET /api/chat-history

チャット履歴一覧を取得します。

**リクエスト:**
- Method: `GET`
- Query Parameters:
  - `projectId` (string, optional): プロジェクトIDでフィルタ

**レスポンス:**
```json
{
  "history": [
    {
      "id": "chat-1234567890",
      "projectId": 1,
      "title": "チャットタイトル",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET /api/chat-history/:id

特定のチャット履歴を取得します。

**リクエスト:**
- Method: `GET`
- URL Parameter: `id` (string)

**レスポンス:**
```json
{
  "id": "chat-1234567890",
  "projectId": 1,
  "title": "チャットタイトル",
  "messages": [
    {
      "role": "user",
      "parts": [
        { "text": "ユーザーメッセージ" }
      ]
    },
    {
      "role": "model",
      "parts": [
        { "text": "AI応答" }
      ]
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**エラー:**
- `404 Not Found`: チャット履歴が見つからない

---

#### POST /api/clear-history

チャット履歴をクリアします。

**リクエスト:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "historyId": "chat-1234567890",
    "projectId": 1
  }
  ```
  - `historyId` または `projectId` のいずれかが必要

**レスポンス:**
```json
{
  "success": true
}
```

**エラー:**
- `400 Bad Request`: historyIdまたはprojectIdが必要

---

### 4. YouTube検索

#### GET /api/youtube/search

YouTube動画を検索または取得します。

**リクエスト:**
- Method: `GET`
- Query Parameters:
  - `q` (string, optional): 検索クエリ
  - `videoId` (string, optional): 特定の動画ID

**レスポンス:**
```json
{
  "videos": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "動画タイトル",
      "description": "説明",
      "channelTitle": "チャンネル名",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "thumbnail": "https://i.ytimg.com/vi/.../default.jpg"
    }
  ]
}
```

**エラー:**
- `400 Bad Request`: qまたはvideoIdパラメータが必要
- `500 Internal Server Error`: YouTube APIエラー

**例:**
```javascript
// 検索
const response = await fetch('/api/youtube/search?q=javascript tutorial');

// 特定の動画
const response = await fetch('/api/youtube/search?videoId=dQw4w9WgXcQ');
```

---

### 5. プロンプトテンプレート

#### GET /api/templates

利用可能なプロンプトテンプレート一覧を取得します。

**リクエスト:**
- Method: `GET`

**レスポンス:**
```json
{
  "templates": {
    "default": "あなたは親切で知識豊富なアシスタントです。",
    "creative": "あなたは創造的で独創的なアイデアを提供するアシスタントです。",
    "technical": "あなたは技術的な質問に詳しい専門家です。",
    "casual": "あなたはカジュアルでフレンドリーな会話パートナーです。",
    "educational": "あなたは教育に熱心で、わかりやすく説明する教師です。",
    "business": "あなたはビジネス向けの丁寧で簡潔な文章を作成するAIです。",
    "code": "あなたはプログラミングの専門家です。コードの生成、レビュー、デバッグをサポートします。",
    "analysis": "あなたはデータ分析の専門家です。データを分析し、洞察を提供します。"
  }
}
```

---

### 6. ヘルスチェック

#### GET /health

サーバーの状態を確認します。

**リクエスト:**
- Method: `GET`

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "hasGeminiKey": true,
  "hasYouTubeKey": true
}
```

---

## エラーレスポンス形式

すべてのエラーは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ",
  "message": "詳細なエラーメッセージ（オプション）"
}
```

## ステータスコード

- `200 OK`: 成功
- `400 Bad Request`: リクエストが不正
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバーエラー

## レート制限

現在の実装ではレート制限はありません。本番環境では以下の実装を推奨します：

- IPアドレスベースのレート制限
- ユーザー認証に基づくレート制限
- APIキーごとの使用量制限

## セキュリティ

### CORS

現在はすべてのオリジンからアクセス可能です。本番環境では適切なCORS設定を推奨します：

```javascript
app.use(cors({
  origin: ['https://your-domain.com'],
  credentials: true
}));
```

### ファイルアップロード

- 最大ファイルサイズ: 20MB
- 許可されるファイルタイプ: 画像、動画、PDF、テキストファイル
- ファイルはメモリに保存され、処理後は破棄されます

### 環境変数

以下の環境変数が必要です：

- `GEMINI_API_KEY`: Gemini APIキー（必須）
- `YOUTUBE_API_KEY`: YouTube APIキー（オプション）
- `PORT`: サーバーポート（デフォルト: 3000）

## データベーススキーマ

### projects テーブル

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### chat_history テーブル

```sql
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  projectId INTEGER,
  title TEXT,
  messages TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

## 型定義（TypeScript）

将来的にTypeScriptに移行する場合の型定義例：

```typescript
interface ChatRequest {
  message?: string;
  files?: File[];
  historyId?: string;
  projectId?: string;
  template?: string;
  customTemplate?: string;
}

interface ChatResponse {
  reply: string;
  historyId: string;
  hasVideo: boolean;
  videoMimeType: string | null;
  youtubeVideo: YouTubeVideo | null;
}

interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistory {
  id: string;
  projectId: number | null;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'model';
  parts: Part[];
}

interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
}
```

## 責務分割

### server.js
- Expressサーバーの設定
- ルーティング
- リクエスト/レスポンス処理
- Gemini API呼び出し

### database.js
- データベース初期化
- スキーマ定義
- データベース操作の抽象化

### youtube.js
- YouTube Data API v3との通信
- 動画検索・取得処理
- エラーハンドリング

## 今後の改善点

1. **認証・認可**
   - JWTトークンによる認証
   - ユーザー管理機能

2. **レート制限**
   - IPベースのレート制限
   - ユーザーベースのレート制限

3. **キャッシング**
   - 頻繁にアクセスされるデータのキャッシュ
   - Redisの導入

4. **ロギング**
   - 構造化ログ（Winstonなど）
   - エラートラッキング（Sentryなど）

5. **モニタリング**
   - パフォーマンス監視
   - API使用量の追跡

6. **テスト**
   - ユニットテスト
   - 統合テスト
   - E2Eテスト

