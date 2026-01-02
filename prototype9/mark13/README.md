# Gemini Chat App - Complete

Gemini APIを使った完全再現チャットアプリケーション。Geminiアプリとほぼ同じ機能を実装しています。

## 機能

- ✅ **チャット画面** - リアルタイムチャットインターフェース
- ✅ **ファイルアップロード UI** - 画像、動画、PDFなどのファイルをアップロード
- ✅ **表・図のレンダリング** - MarkdownとMermaid図表をサポート
- ✅ **動画カードの表示** - YouTube動画を埋め込み表示
- ✅ **プロンプトテンプレート** - 用途に応じたテンプレート選択
- ✅ **プロジェクト管理** - チャットをプロジェクトごとに管理
- ✅ **YouTube検索連携** - YouTube動画を検索して会話に追加
- ✅ **データベース** - SQLiteを使用した永続化

## 技術スタック

- **フロントエンド**: HTML, CSS, JavaScript (Vanilla)
- **バックエンド**: Node.js, Express
- **データベース**: SQLite (better-sqlite3)
- **AI API**: Google Gemini API
- **外部API**: YouTube Data API v3

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
GEMINI_API_KEY=your_gemini_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=3000
```

#### Gemini API キーの取得方法

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーをコピー

#### YouTube API キーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」から「YouTube Data API v3」を有効化
4. 「認証情報」→「認証情報を作成」→「APIキー」を選択
5. 生成されたAPIキーをコピー

### 3. サーバーの起動

```bash
npm start
```

開発モード（自動リロード）:

```bash
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

## デプロイ

### Renderへのデプロイ

#### 1. GitHubリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

#### 2. RenderでWebサービスを作成

1. [Render](https://render.com/)にログイン
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を行う：

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node server.js
```

**Environment Variables:**
- `GEMINI_API_KEY`: あなたのGemini APIキー
- `YOUTUBE_API_KEY`: あなたのYouTube APIキー（オプション）
- `NODE_ENV`: `production`

#### 3. 環境変数の設定（Render Dashboard）

Renderのダッシュボードで、以下の環境変数を設定：

1. 「Environment」タブを開く
2. 「Add Environment Variable」をクリック
3. 以下の変数を追加：

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | あなたのGemini APIキー |
| `YOUTUBE_API_KEY` | あなたのYouTube APIキー（オプション） |
| `NODE_ENV` | `production` |

#### 4. デプロイ

「Save Changes」をクリックすると、自動的にデプロイが開始されます。

### その他のデプロイプラットフォーム

#### Vercel

1. Vercel CLIをインストール: `npm i -g vercel`
2. `vercel`コマンドでデプロイ
3. 環境変数をVercelダッシュボードで設定

#### Heroku

1. Heroku CLIをインストール
2. `heroku create your-app-name`
3. `heroku config:set GEMINI_API_KEY=your_key`
4. `git push heroku main`

## API エンドポイント

### チャット

- `POST /api/chat` - チャットメッセージを送信
  - Body: FormData (message, files[], historyId, projectId, template, customTemplate)

### プロジェクト管理

- `GET /api/projects` - プロジェクト一覧を取得
- `POST /api/projects` - 新規プロジェクトを作成
- `DELETE /api/projects/:id` - プロジェクトを削除

### チャット履歴

- `GET /api/chat-history` - チャット履歴一覧を取得
- `GET /api/chat-history/:id` - 特定のチャット履歴を取得
- `POST /api/clear-history` - チャット履歴をクリア

### YouTube検索

- `GET /api/youtube/search?q=query` - YouTube動画を検索
- `GET /api/youtube/search?videoId=id` - 特定の動画を取得

### その他

- `GET /api/templates` - プロンプトテンプレート一覧を取得
- `GET /health` - ヘルスチェック

## データベース設計

### projects テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER | 主キー |
| name | TEXT | プロジェクト名 |
| description | TEXT | 説明 |
| createdAt | TEXT | 作成日時 |
| updatedAt | TEXT | 更新日時 |

### chat_history テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT | 主キー（チャットID） |
| projectId | INTEGER | プロジェクトID（外部キー） |
| title | TEXT | チャットタイトル |
| messages | TEXT | メッセージ履歴（JSON） |
| createdAt | TEXT | 作成日時 |
| updatedAt | TEXT | 更新日時 |

## プロンプトテンプレート

以下のテンプレートが利用可能です：

- `default` - デフォルト
- `creative` - 創造的
- `technical` - 技術的
- `casual` - カジュアル
- `educational` - 教育的
- `business` - ビジネス
- `code` - コード生成
- `analysis` - 分析

カスタムテンプレートも設定可能です。

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します！

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

