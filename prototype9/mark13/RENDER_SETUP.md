# Render デプロイ設定ガイド

このドキュメントでは、Gemini Chat AppをRenderにデプロイする手順を詳しく説明します。

## 前提条件

- GitHubアカウント
- Renderアカウント（[https://render.com](https://render.com)で無料登録可能）
- Gemini APIキー
- YouTube APIキー（オプション）

## ステップ1: GitHubリポジトリの準備

### 1.1 リポジトリの作成

```bash
cd prototype9/mark13
git init
git add .
git commit -m "Initial commit: Gemini Chat App"
```

### 1.2 GitHubにプッシュ

```bash
# GitHubでリポジトリを作成後
git remote add origin https://github.com/your-username/gemini-chat-app.git
git branch -M main
git push -u origin main
```

## ステップ2: RenderでWebサービスを作成

### 2.1 新しいWebサービスの作成

1. [Render Dashboard](https://dashboard.render.com/)にログイン
2. 「New +」ボタンをクリック
3. 「Web Service」を選択
4. 「Connect account」でGitHubアカウントを接続（初回のみ）
5. リポジトリを選択: `your-username/gemini-chat-app`

### 2.2 サービスの設定

以下の設定を入力：

**Name:**
```
gemini-chat-app
```

**Region:**
```
Singapore (シンガポール) または お好みのリージョン
```

**Branch:**
```
main
```

**Root Directory:**
```
prototype9/mark13
```
（または、mark13フォルダをルートに移動した場合は空欄）

**Runtime:**
```
Node
```

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node server.js
```

**Instance Type:**
```
Free (無料プラン) または Starter ($7/月)
```

## ステップ3: 環境変数の設定

### 3.1 Render Dashboardで環境変数を追加

「Environment」セクションで以下の環境変数を追加：

| Key | Value | 説明 |
|-----|-------|------|
| `GEMINI_API_KEY` | `your_gemini_api_key` | **必須** Gemini APIキー |
| `YOUTUBE_API_KEY` | `your_youtube_api_key` | **オプション** YouTube APIキー |
| `NODE_ENV` | `production` | 本番環境フラグ |
| `PORT` | `10000` | Renderが自動設定（通常は設定不要） |

### 3.2 環境変数の取得方法

#### Gemini APIキー

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. プロジェクトを選択（または新規作成）
5. 生成されたAPIキーをコピー

#### YouTube APIキー（オプション）

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」を開く
4. 「YouTube Data API v3」を検索して有効化
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. 生成されたAPIキーをコピー
7. （推奨）APIキーの制限を設定：
   - 「アプリケーションの制限」: HTTPリファラー
   - 「APIの制限」: YouTube Data API v3のみ

## ステップ4: デプロイ

### 4.1 初回デプロイ

1. 「Create Web Service」をクリック
2. デプロイが自動的に開始されます（数分かかります）

### 4.2 デプロイの確認

デプロイが完了すると、以下のようなURLが表示されます：
```
https://gemini-chat-app.onrender.com
```

このURLにアクセスして、アプリが正常に動作するか確認してください。

## ステップ5: カスタムドメインの設定（オプション）

1. Render Dashboardでサービスを選択
2. 「Settings」タブを開く
3. 「Custom Domains」セクションでドメインを追加
4. DNS設定を更新（Renderが指示を提供）

## トラブルシューティング

### デプロイが失敗する場合

1. **ログを確認**
   - Render Dashboardの「Logs」タブでエラーログを確認

2. **環境変数の確認**
   - すべての環境変数が正しく設定されているか確認
   - 特に`GEMINI_API_KEY`が設定されているか確認

3. **ビルドエラーの確認**
   - `package.json`の依存関係が正しいか確認
   - Node.jsのバージョンが18以上か確認

4. **ポートの確認**
   - `server.js`で`process.env.PORT`を使用しているか確認

### アプリが起動しない場合

1. **ヘルスチェックエンドポイントを確認**
   ```
   https://your-app.onrender.com/health
   ```

2. **環境変数の再確認**
   - Render Dashboardで環境変数が正しく設定されているか確認

3. **ログを確認**
   - 「Logs」タブでエラーメッセージを確認

### データベースの問題

- SQLiteデータベースはRenderの無料プランでは永続化されません
- 本番環境ではPostgreSQLなどの外部データベースの使用を推奨

## 継続的デプロイ（CD）

Renderはデフォルトで自動デプロイが有効になっています：

- `main`ブランチにプッシュすると自動的にデプロイされます
- 手動デプロイも可能（「Manual Deploy」ボタン）

## コスト

### 無料プラン

- 15分間の非アクティブ後にスリープ
- スリープからの復帰に30秒程度かかる
- 月間750時間まで無料

### 有料プラン（Starter - $7/月）

- 常時起動
- 即座にレスポンス
- カスタムドメイン対応

## セキュリティのベストプラクティス

1. **環境変数の保護**
   - APIキーは絶対にコードに直接書かない
   - Renderの環境変数機能を使用

2. **HTTPSの使用**
   - Renderは自動的にHTTPSを提供

3. **CORS設定**
   - 必要に応じて`server.js`のCORS設定を調整

4. **レート制限**
   - APIキーの使用量を監視
   - 必要に応じてレート制限を実装

## 次のステップ

- カスタムドメインの設定
- データベースの外部化（PostgreSQL）
- モニタリングとアラートの設定
- CI/CDパイプラインの最適化

## サポート

問題が発生した場合：

1. Renderの[ドキュメント](https://render.com/docs)を確認
2. Renderの[コミュニティフォーラム](https://community.render.com/)で質問
3. GitHubのIssuesで報告

