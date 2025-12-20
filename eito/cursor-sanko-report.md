# 共同作業ガイドライン

このドキュメントは、Dr.Cubeプロジェクトで共同作業を行う際の基本的なルールとベストプラクティスを説明します。

## 📁 プロジェクト構造

このプロジェクトは、各メンバーが自分のフォルダで作業できるようになっています：

- `ishi/` - ishiさんの作業フォルダ
- `kawa/` - kawaさんの作業フォルダ
- `maru/` - maruさんの作業フォルダ
- `Teppei/` - Teppeiさんの作業フォルダ
- `prototype1/` ~ `prototype8/` - プロトタイプフォルダ
- `public/` - 共通で使用するファイル

## ❓ よくある質問：干渉について

### Q: 自分の画面と他の人の画面は干渉するの？

**答え：基本的には干渉しません！** ただし、いくつかのルールを守ることが大切です。

#### ✅ 干渉しないケース（安全）

1. **自分のフォルダで作業する場合**
   ```
   あなたが: yamaguchi/index.html を編集
   他の人が: ishi/traking.py を編集
   → 完全に別々なので干渉しません ✅
   ```

2. **ブランチを使う場合**
   ```
   あなたが: yamaguchi/feature ブランチで作業
   他の人が: ishi/analysis ブランチで作業
   → それぞれ独立しているので干渉しません ✅
   ```

3. **異なるファイルを編集する場合**
   ```
   あなたが: yamaguchi/style.css を編集
   他の人が: yamaguchi/script.js を編集
   → ファイルが違うので干渉しません ✅
   ```

#### ⚠️ 干渉する可能性があるケース（注意が必要）

1. **同じファイルを同時に編集する場合**
   ```
   あなたが: public/index.html の10行目を変更
   他の人が: public/index.html の15行目を変更
   → コンフリクト（競合）が発生する可能性があります ⚠️
   ```

2. **共通ファイルを変更する場合**
   ```
   package.json, public/extremeStyle.css など
   → 他の人も使っているので、変更前に相談しましょう ⚠️
   ```

3. **mainブランチに直接プッシュする場合**
   ```
   → 他の人の作業に影響を与える可能性があります ⚠️
   → 必ずブランチを使いましょう！
   ```

### 視覚的な例

```
📁 Dr.Cube/
  ├── 📁 yamaguchi/     ← あなたのフォルダ（ここで作業すれば安全）
  ├── 📁 ishi/          ← ishiさんのフォルダ（触らない）
  ├── 📁 kawa/          ← kawaさんのフォルダ（触らない）
  ├── 📁 maru/          ← maruさんのフォルダ（触らない）
  └── 📁 public/        ← 共通フォルダ（変更する場合は相談）
```

**結論：自分のフォルダで作業し、ブランチを使えば、他の人と干渉することはありません！**

## 🚀 初めて共同作業をする方へ

### 1. 基本的な流れ

```
1. 最新のコードを取得（pull）
2. 自分のブランチを作成
3. 自分のフォルダで作業
4. 変更をコミット
5. プッシュしてプルリクエストを作成
```

### 2. 他のコードに干渉しないために

#### ✅ 推奨される作業方法

1. **自分のフォルダで作業する**
   - 自分の名前のフォルダ（例：`yourname/`）で作業してください
   - 他の人のフォルダは触らないようにしましょう

2. **ブランチを使う**
   ```bash
   # 新しいブランチを作成
   git checkout -b yourname/feature-name
   
   # 作業後、コミット
   git add yourname/
   git commit -m "説明を追加"
   
   # プッシュ
   git push origin yourname/feature-name
   ```

3. **共通ファイルを変更する場合は相談**
   - `public/` フォルダや `package.json` など、共通で使うファイルを変更する場合は
   - 事前にチームメンバーに相談しましょう

#### ❌ 避けるべきこと

- 他の人のフォルダを直接編集しない
- `main` ブランチに直接プッシュしない（ブランチを使う）
- 大きな変更を一度に行わない（小さく分けてコミット）

### 3. Gitの基本的なコマンド

```bash
# 最新のコードを取得
git pull origin main

# 現在の状態を確認
git status

# 変更をステージング
git add ファイル名

# コミット
git commit -m "変更内容の説明"

# プッシュ
git push origin ブランチ名
```

### 3-1. 特定のフォルダだけをコミット・プッシュする方法

**例：`eito`フォルダだけをコミット・プッシュする場合**

```bash
# 1. 最新のコードを取得（重要！）
git pull origin main

# 2. 新しいブランチを作成
git checkout -b eito/initial-setup

# 3. eitoフォルダだけをステージング（追加）
git add eito/

# 4. コミット（変更内容を記録）
git commit -m "eitoフォルダを追加"

# 5. プッシュ（リモートに送信）
git push origin eito/initial-setup
```

**ポイント：**
- `git add eito/` で `eito` フォルダだけを追加できます
- 他のフォルダは変更されません
- ブランチを使うので、`main`ブランチには影響しません

**複数のファイルを追加する場合：**
```bash
# フォルダ全体を追加
git add eito/

# または、特定のファイルだけを追加
git add eito/index.html
git add eito/style.css
```

### 3-2. mainブランチに直接コミット・プッシュする方法（シンプル版）

**小規模なプロジェクトや、ブランチ戦略がまだ確立されていない場合**

```bash
# 1. 最新のコードを取得（重要！）
git pull origin main

# 2. eitoフォルダだけをステージング（追加）
git add eito/

# 3. コミット（変更内容を記録）
git commit -m "eitoフォルダを追加"

# 4. プッシュ（リモートに送信）
git push origin main
```

**注意点：**
- ⚠️ 他の人が同時に作業している場合、コンフリクトが発生する可能性があります
- ✅ 自分のフォルダ（`eito/`）だけを変更する場合は、通常は問題ありません
- ✅ 小規模なチームや、まだブランチ戦略が確立されていない場合は、この方法でもOKです

**どちらを使うべき？**
- **ブランチを使う方法**：より安全、他の人の作業に影響を与えない
- **mainに直接コミット**：シンプル、小規模な変更や自分のフォルダだけの変更の場合

### 4. ブランチの命名規則

```
yourname/機能名
例: yamaguchi/analysis-page
```

### 5. コミットメッセージの書き方

```
簡潔に何を変更したか書く

例:
- "分析ページのUIを追加"
- "カメラ機能のバグを修正"
- "READMEを更新"
```

## 🔧 トラブルシューティング

### コンフリクト（競合）が発生した場合

1. 慌てずに、まず最新のコードを取得
   ```bash
   git pull origin main
   ```

2. コンフリクトが発生したら、エディタで解決
   - `<<<<<<<` と `>>>>>>>` の間の部分を確認
   - 必要な変更を残して、マーカーを削除

3. 解決後、再度コミット
   ```bash
   git add .
   git commit -m "コンフリクトを解決"
   ```

### 間違えてコミットしてしまった場合

```bash
# 直前のコミットを取り消す（変更は残る）
git reset --soft HEAD~1

# 変更も取り消したい場合
git reset --hard HEAD~1
```

## 🌐 HTMLファイルをブラウザで開く方法

特定のフォルダの中のHTMLファイルをブラウザで開く方法をいくつか紹介します。

### 方法1: ターミナルから開く（最も簡単・推奨）

```bash
# 特定のHTMLファイルを開く
open prototype8/mark4/index.html

# または、絶対パスで
open /Users/yamaguchiakirashou/Dr.Cube/prototype8/mark4/index.html
```

**現在開いているファイルの場合：**
```bash
cd /Users/yamaguchiakirashou/Dr.Cube
open prototype8/mark4/index.html
```

### 方法2: ファイルを直接ブラウザにドラッグ&ドロップ

1. FinderでHTMLファイルを見つける
2. ファイルをブラウザ（Safari、Chromeなど）のウィンドウにドラッグ&ドロップ

### 方法3: ローカルサーバーを起動する（推奨・高度）

JavaScriptや外部リソースを使う場合、ローカルサーバーを使うと正しく動作します。

#### Pythonを使う場合（Python 3がインストールされている場合）

```bash
# プロジェクトのルートディレクトリに移動
cd /Users/yamaguchiakirashou/Dr.Cube

# サーバーを起動（ポート8000）
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000/prototype8/mark4/index.html
```

#### Node.jsを使う場合（npx http-server）

```bash
# プロジェクトのルートディレクトリに移動
cd /Users/yamaguchiakirashou/Dr.Cube

# http-serverをインストール（初回のみ）
npm install -g http-server

# サーバーを起動
http-server

# ブラウザで開く
# http://localhost:8080/prototype8/mark4/index.html
```

#### VS Codeの拡張機能を使う場合

1. VS Codeの拡張機能「Live Server」をインストール
2. HTMLファイルを右クリック
3. 「Open with Live Server」を選択

### どの方法を使うべき？

- **簡単に確認したいだけ** → 方法1（`open`コマンド）または方法2（ドラッグ&ドロップ）
- **JavaScriptや外部リソースを使う** → 方法3（ローカルサーバー）
- **開発中で頻繁に確認する** → 方法3（ローカルサーバー）

### 現在のファイルを開く例

```bash
# 現在 prototype8/mark4/index.html を開いている場合
open prototype8/mark4/index.html

# 同じフォルダ内の他のHTMLファイルも開ける
open prototype8/mark4/analysis.html
open prototype8/mark4/image.html
open prototype8/mark4/idea.html
```

## 📝 質問がある場合

- チームメンバーに直接聞く
- GitHubのIssuesで質問を投稿
- このドキュメントに追加したい情報があれば提案

## 🎯 まとめ

1. **自分のフォルダで作業**
2. **ブランチを使う**
3. **小さくコミット**
4. **他の人のコードを尊重**

これらを守れば、スムーズに共同作業ができます！

