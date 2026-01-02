# Gemini Chat App

Gemini APIを使用したチャットアプリケーションです。Geminiのデフォルトアプリと同様の機能を提供します。

## 機能

- ✅ チャット画面
- ✅ ファイルアップロード UI（画像・動画対応）
- ✅ 表・図のレンダリング（Markdown / Mermaid）
- ✅ 動画カードの表示
- ✅ プロンプトテンプレート

## セットアップ

### 1. 依存関係のインストール

プロジェクトのルートディレクトリで以下を実行：

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、Gemini APIキーを設定：

```
GEMINI_API_KEY=your_api_key_here
```

または、環境変数として直接設定：

```bash
export GEMINI_API_KEY=your_api_key_here
```

### 3. サーバーの起動

```bash
cd prototype9/mark12
node server.js
```

または、プロジェクトルートから：

```bash
npm start
```

サーバーは `http://localhost:3000` で起動します。

## 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. サイドバーからプロンプトテンプレートを選択
3. メッセージを入力するか、ファイルをアップロード
4. 送信ボタンをクリックして会話を開始

## プロンプトテンプレート

- **デフォルト**: 標準的なアシスタント
- **創造的**: 創造的で独創的なアイデアを提供
- **技術的**: 技術的な質問に詳しい専門家
- **カジュアル**: カジュアルでフレンドリーな会話
- **教育的**: わかりやすく説明する教師

## 技術スタック

- **バックエンド**: Node.js, Express
- **AI**: Google Gemini API
- **フロントエンド**: HTML, CSS, JavaScript
- **Markdown**: marked.js
- **Mermaid**: mermaid.js
- **コードハイライト**: highlight.js

## 注意事項

- Gemini APIキーが必要です。Google AI Studioから取得できます。
- ファイルサイズは20MBまで対応しています。
- チャット履歴はメモリに保存されます（再起動で消去されます）。

