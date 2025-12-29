# 変更履歴

## 2024年 - UI改善: 解析中のモーション表示とトグル状態の視覚化

### 変更の目的
- 解析処理中の状態を視覚的にわかりやすくする
- トグルボタンのオン/オフ状態を明確に表示する

---

## 1. analysis.html の変更

### 変更内容

#### 1.1 ローディングアニメーションの追加
- **目的**: IndexedDB読み取り中とAI解析中の状態を視覚的に表示
- **実装方法**:
  - CSSアニメーションを使用したスピナー（回転する円形インジケーター）を追加
  - ローディング中は「読み取り中...」「解析中...」のテキストとスピナーを表示
  - 処理完了後、ローディング表示を自動的に削除

#### 1.2 ステータスメッセージの改善
- **目的**: 成功・エラー状態を色分けして表示
- **実装方法**:
  - 成功メッセージ: 緑色のボーダーと背景（`status-success`クラス）
  - エラーメッセージ: 赤色のボーダーと背景（`status-error`クラス）
  - ローディング中: 青色のボーダーと背景（`status-loading`クラス）

#### 1.3 追加されたCSS
```css
/* ローディングコンテナ */
.loading-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: rgba(0, 198, 255, 0.1);
  border: 2px solid rgba(0, 198, 255, 0.3);
  border-radius: 12px;
}

/* スピナーアニメーション */
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 198, 255, 0.3);
  border-top-color: #00c6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* パルスアニメーション（テキスト） */
.loading-text {
  animation: pulse 1.5s ease-in-out infinite;
}
```

#### 1.4 変更箇所
- **DOMContentLoadedイベント**: IndexedDB読み取り時にローディング表示を追加
- **sendMessage関数**: 手動チャット送信時にもローディング表示を追加
- **エラーハンドリング**: エラー発生時もローディング表示を適切に削除

---

## 2. index.html の変更

### 変更内容

#### 2.1 トグルボタンの視覚的改善
- **目的**: トグルボタンのオン/オフ状態を一目で判断できるようにする
- **実装方法**:
  - ボタンの背景色とボーダーを状態に応じて変更
  - アイコンとテキストで現在のモードを表示
  - ホバー時のエフェクトを追加

#### 2.2 状態表示
- **スワイプモード（デフォルト）**:
  - 背景: ダークグレー（`#444`）
  - ボーダー: グレー（`#666`）
  - 表示テキスト: 「👆 スワイプモード」
  
- **iframe操作モード（トグルON）**:
  - 背景: グラデーション（青系）
  - ボーダー: 青色（`#00c6ff`）
  - グローエフェクト: 青色のシャドウ
  - 表示テキスト: 「🖱️ iframe操作モード」

#### 2.3 追加されたCSS
```css
#toggleIframeInteraction {
  min-width: 220px;
  transition: all 0.3s ease;
}

/* スワイプモード（デフォルト） */
#toggleIframeInteraction::before {
  content: '👆 スワイプモード';
}

/* iframe操作モード（トグルON） */
#toggleIframeInteraction.toggle-on {
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  border-color: #00c6ff;
  box-shadow: 0 0 15px rgba(0, 198, 255, 0.5);
}

#toggleIframeInteraction.toggle-on::before {
  content: '🖱️ iframe操作モード';
}
```

#### 2.4 JavaScriptの変更
- **toggleIframeInteraction.onclick**: クリック時に`toggle-on`クラスを追加/削除して状態を反映
- **初期化**: ページ読み込み時に初期状態を設定

---

## 技術的な詳細

### アニメーション
- **スピナー**: CSS `@keyframes`を使用した回転アニメーション（0.8秒で1回転）
- **パルス**: テキストの透明度を変化させるアニメーション（1.5秒周期）

### 状態管理
- `overlayEnabled`変数でトグル状態を管理
- `toggle-on`クラスで視覚的な状態を反映

### ユーザー体験の向上
- 処理中の待ち時間を視覚的に表示することで、ユーザーが現在の状態を理解しやすくなる
- トグルボタンの状態が明確になることで、誤操作を防ぐ

---

## 3. image.html の変更

### 変更内容

#### 3.1 画像解析時のローディングアニメーション追加
- **目的**: 解析ボタンを押した時のみ、軽量なローディング表示を追加
- **問題点**: 以前は画像をアップロードしただけで解析中と表示される問題があった
- **実装方法**:
  - 解析ボタンをクリックした時のみローディング表示を開始
  - 処理完了後（成功・エラー問わず）にローディング表示を終了
  - ボタンを無効化して連続クリックを防止

#### 3.2 軽量なローディングアニメーション
- **設計方針**: 最低限の見た目で、パフォーマンスに影響を与えない
- **実装**:
  - 3つのドットが順番に跳ねるシンプルなアニメーション
  - CSSのみで実装（JavaScriptの負荷なし）
  - 必要時のみ表示（`display: none` → `display: block`）

#### 3.3 追加されたCSS
```css
/* ローディング表示（デフォルトは非表示） */
.loading {
  display: none;
  margin-top: 10px;
  padding: 10px;
  text-align: center;
  color: #00c6ff;
}
.loading.active {
  display: block;
}

/* 跳ねるドットアニメーション */
.loading-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00c6ff;
  margin: 0 3px;
  animation: bounce 1.4s infinite ease-in-out;
}
.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
```

#### 3.4 JavaScriptの変更
- **processImage関数**:
  - 関数開始時にローディング表示を開始（`loading.classList.add("active")`）
  - ボタンを無効化（`sendBtn.disabled = true`）
  - ボタンテキストを「解析中...」に変更
  - `finally`ブロックで必ずローディング表示を終了
  - エラー時も確実にローディングを終了

#### 3.5 動作フロー
1. ユーザーが画像をアップロード → プレビュー表示のみ（ローディングなし）
2. ユーザーが「解析」ボタンをクリック
3. ローディング表示開始（3つのドットが跳ねるアニメーション）
4. APIリクエスト送信
5. レスポンス受信後、ローディング表示終了
6. 結果表示

---

## 4. UIデザインの全面リニューアル（シンプルでおしゃれなデザイン）

### 変更の目的
- 会議でも使えるシンプルでおしゃれなUIに変更
- 無駄なシャドウやアニメーションを削除
- 色合いを統一して視認性を向上
- 解析ページからAI解析中のアニメーションを削除（画像ページのみに）

---

## 4.1 analysis.html のUI改善

### 変更内容

#### 4.1.1 デザインの簡素化
- **背景**: グラデーションから単色（`#1a1a1a`）に変更
- **シャドウ**: すべての`box-shadow`を削除
- **アニメーション**: AI解析中のローディングアニメーションを完全に削除
- **タイトル**: 「Dr.Cube AI解析 /Team.ぐんまちゃん/」→「Dr.Cube AI解析」に変更

#### 4.1.2 チャット欄の改善
- **スクロール機能**: カスタムスクロールバーを追加（幅8px、ダークテーマ）
- **高さ**: 300px → 400pxに拡大
- **背景**: 半透明から不透明（`#2a2a2a`）に変更
- **ボーダー**: 1px solid `#3a3a3a`でシンプルに

#### 4.1.3 色の統一
- **背景色**: `#1a1a1a`（メイン背景）
- **コンテンツ背景**: `#2a2a2a`（カード・入力欄）
- **ボーダー**: `#3a3a3a`
- **テキスト**: `#e0e0e0`（通常）、`#fff`（強調）
- **ホバー**: `#3a3a3a` → `#4a4a4a`

#### 4.1.4 削除された要素
- ローディングスピナー
- パルスアニメーション
- グラデーション背景
- シャドウエフェクト
- ステータスメッセージの色分け（シンプルな`<p>`タグに統一）

---

## 4.2 index.html のUI改善

### 変更内容

#### 4.2.1 トグルボタンの簡素化
- **テキスト**: 「👆 スワイプモード」→「スワイプ」、「🖱️ iframe操作モード」→「操作」
- **アイコン**: すべて削除
- **シャドウ**: `box-shadow`を削除
- **グラデーション**: 単色背景に変更
- **アニメーション**: `transform: scale()`を削除

#### 4.2.2 カードデザインの統一
- **背景**: `#333` → `#2a2a2a`
- **ボーダー**: `1px solid #3a3a3a`を追加
- **シャドウ**: `box-shadow`を削除
- **角丸**: `12px` → `8px`に縮小

#### 4.2.3 ボタンの統一
- **スタイル**: すべてのボタン（←、→、トグル）を統一デザイン
- **背景**: `#2a2a2a`
- **ボーダー**: `1px solid #3a3a3a`
- **ホバー**: `#3a3a3a`

---

## 4.3 image.html のUI改善

### 変更内容

#### 4.3.1 デザインの統一
- **背景**: `#111` → `#1a1a1a`に変更
- **テキスト**: `#fff` → `#e0e0e0`に変更
- **ボタン**: 統一されたスタイルに変更
- **ローディング**: 色を`#00c6ff` → `#888`に変更（控えめに）

#### 4.3.2 要素のスタイリング
- **プレビュー画像**: ボーダーを追加
- **出力欄**: 背景とボーダーを追加して見やすく
- **デバッグ出力**: 背景とボーダーを追加

---

## 4.4 統一されたカラーパレット

```
メイン背景:    #1a1a1a
コンテンツ背景: #2a2a2a
ボーダー:      #3a3a3a
ホバー:        #4a4a4a
テキスト:      #e0e0e0
強調テキスト:  #fff
補助テキスト:  #888
```

---

## 技術的な詳細

### フォント
- システムフォントを優先使用（-apple-system, BlinkMacSystemFont, Segoe UI等）
- 日本語フォント: Hiragino Sans, Hiragino Kaku Gothic ProN, Meiryo

### スクロールバー
- WebKit系ブラウザ用のカスタムスタイル
- 幅8px、ダークテーマ
- ホバー時に色が変わる

### パフォーマンス
- アニメーションを最小限に（画像ページのローディングドットのみ）
- シャドウやグラデーションを削除してレンダリング負荷を軽減

---

---

## 5. ユーザビリティ改善: スクロール・コピペ対応とトグルボタンの改善

### 変更の目的
- ロック中（スワイプモード）でもチャット内のスクロールを可能にする
- トグルボタンの状態を視覚的にわかりやすくする
- 英語表記を削除し、日本語で統一

---

## 5.1 index.html の改善

### 変更内容

#### 5.1.1 スクロールの許可
- **目的**: ロック中（スワイプモード）でも、チャット内のスクロールを可能にする
- **実装方法**:
  - `overlay`に`wheel`イベントリスナーを追加し、スクロールイベントをiframeに転送
  - `pointerdown`で左クリックのみスワイプ処理を行うように制限
  - `isSwiping`フラグでスワイプ状態を管理

#### 5.1.2 トグルボタンの改善
- **テキスト変更**:
  - ロック中: 「🔒 ロック中」（赤系の色）
  - 操作可能: 「✅ 操作可能」（緑系の色）
- **色による状態表示**:
  - ロック中: 背景`#3a2a2a`、ボーダー`#5a3a3a`、テキスト`#ff9999`（赤系）
  - 操作可能: 背景`#2d4a2d`、ボーダー`#4a7c4a`、テキスト`#99ff99`（緑系）
- **アイコンの削除**: 絵文字アイコン（🔒、✅）を削除し、テキストのみに変更
- **説明文追加**: 「（カード内の操作を切り替え）」という説明を追加

#### 5.1.3 トグルボタンの目的
このトグルボタンは、カード内のiframe（解析ページ、発想ページ、画像ページなど）の操作モードを切り替えるためのものです。

- **ロック中（スワイプモード）**: 
  - カードを左右にスワイプして新しいカードを生成できる状態
  - チャット内のスクロールは可能
  - デフォルトの状態

- **操作可能（iframe操作モード）**:
  - iframe内の要素（ボタン、リンク、入力欄など）を直接操作できる状態
  - スワイプ機能は無効化される
  - iframe内の操作が必要な時に使用

#### 5.1.4 追加されたコード
```javascript
// スクロールを許可
overlay.addEventListener("wheel", e => {
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'PASS_WHEEL', deltaY: e.deltaY }, location.origin);
  }
}, { passive: true });
```

---

## 5.2 analysis.html の改善

### 変更内容

#### 5.2.1 wheelイベントの受信処理
- **目的**: 親ページから転送されたスクロールイベントを処理
- **実装**: `message`イベントで`PASS_WHEEL`タイプのメッセージを受信し、チャット欄をスクロール

```javascript
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const { type, deltaY } = event.data || {};
  
  if (type === 'PASS_WHEEL') {
    const chat = document.getElementById("chat");
    chat.scrollTop += deltaY;
  }
});
```

#### 5.2.2 JSON表示からidを非表示
- **目的**: 表示されるJSONデータから画像ID（id）を非表示にする
- **実装**: 表示用データを作成する際に`id`プロパティを削除
- **注意**: AIへの送信時は`id`を含む完全なデータを送信（表示のみ非表示）

```javascript
// idを除いたデータを表示用に作成
const displayData = { ...latest };
delete displayData.id;
chat.innerHTML += `<p><b>最新データ:</b> ${JSON.stringify(displayData)}</p>`;
```

---

## 5.3 image.html の改善

### 変更内容

#### 5.3.1 タイトルの変更
- **変更前**: 「Image → Summary Word」
- **変更後**: 「画像から文章」
- **理由**: 英語表記を削除し、機能がわかりやすい日本語に統一

---

## 技術的な詳細

### イベント処理の優先順位
1. `wheel`イベント: 常にiframeに転送（スクロールを許可）
2. `selectstart`イベント: 常に許可（テキスト選択を許可）
3. `pointerdown`イベント: 左クリックのみスワイプ処理（右クリックや中クリックは無視）

### スワイプ判定
- 水平方向の移動距離が40px以上の場合のみスワイプとして認識
- `isSwiping`フラグでスワイプ中かどうかを管理
- `pointercancel`イベントでスワイプをキャンセル

### 色による状態表示
- **ロック中**: 赤系（危険・制限を表す色）
- **操作可能**: 緑系（安全・許可を表す色）
- 誰が見ても状態がわかるように、色で明確に区別
- 絵文字アイコンは使用せず、テキストのみで表示

---

---

## 6. 発想機能の整理と修正

### 変更の目的
- 「発想を増やす」ボタンを削除し、スライドとノードクリックのみで発想を増やす機能に統一
- スライドで新しい発想カードを作成した時に、自動的に発想が生成されるように修正

---

## 6.1 idea.html の変更

### 変更内容

#### 6.1.1 「発想を増やす」ボタンの削除
- **目的**: フッター部分の「発想を増やす」ボタンを削除
- **理由**: スライドとノードクリックで発想を増やす機能が既に実装されているため、ボタンは不要
- **削除された要素**:
  - HTML: `<div class="footer-controls">`とその中のボタン
  - CSS: `.footer-controls`スタイル
  - JavaScript: `expandIdeasBtn`のイベントリスナー

#### 6.1.2 ノードクリックで発想を広げる機能
- **機能**: ノードをクリックすると、そのノードから新しい発想（子ノード）を生成
- **実装**:
  - 親ノード（depth=0）または子ノード（depth=1）をクリックした場合のみ発想を広げる
  - クリックしたノードから連想される単語を3つ取得
  - 取得した単語を新しいノードとして追加
  - `restart()`でグラフを再描画
- **コード**:
```javascript
.on('click', async (e, d) => {
  e.stopPropagation(); // ズームイベントとの競合を防ぐ
  
  // ✅ 親ページへ保存依頼を送信
  window.parent.postMessage(
    { type: "SAVE_WORD", payload: d.name },
    location.origin
  );
  
  // クリックしたノードから新しい発想を広げる
  const clickedNode = d;
  if (clickedNode.depth < 2) { // 親または子ノードの場合のみ
    const childWords = await fetchWords(clickedNode.name, 3);
    for (const word of childWords) {
      if (word && word.trim()) {
        addNode(word.trim(), clickedNode.id, clickedNode.depth + 1);
      }
    }
    restart();
  }
});
```

---

## 6.2 index.html の変更

### 変更内容

#### 6.2.1 新しい発想カード作成時の自動生成
- **目的**: スライドで新しい発想カードを作成した時に、既存のデータを送信して自動的に発想を生成
- **実装**:
  - 発想カード（`card.type === 'idea'`）のiframeが読み込まれた時に、IndexedDBから最新のデータを取得
  - 取得したデータを`DB_UPDATE`メッセージとして送信
  - `idea.html`が`DB_UPDATE`を受信すると、自動的に発想を生成
- **コード**:
```javascript
iframe.addEventListener('load', () => {
  sendToIframe(iframe, 'INIT', { cardType: card.type });
  // 発想カードの場合、既存のデータを送信して自動生成を促す
  if (card.type === 'idea' && db) {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const allData = req.result;
      if (allData && allData.length > 0) {
        // 最新のデータを取得
        const latest = allData[allData.length - 1];
        if (latest && latest.data) {
          sendToIframe(iframe, 'DB_UPDATE', latest.data);
        }
      }
    };
  }
});
```

---

## 技術的な詳細

### 発想を増やす方法
1. **スライドで発想を増やす**:
   - カードを右にスワイプすると、新しい発想カードが作成される
   - 新しい発想カードが読み込まれると、既存のデータから自動的に発想が生成される
   
2. **ノードクリックで発想を広げる**:
   - 既存の発想カード内で、ノード（円）をクリックする
   - クリックしたノードから新しい発想（子ノード）が生成される
   - 親ノードまたは子ノードのみがクリック可能（孫ノードは不可）

### データフロー
1. ユーザーがノードをクリック → `SAVE_WORD`メッセージを送信
2. `index.html`が`SAVE_WORD`を受信 → IndexedDBに保存
3. `broadcastUpdate`が呼ばれる → すべての発想カードに`DB_UPDATE`を送信
4. `idea.html`が`DB_UPDATE`を受信 → 自動的に発想を生成（新規カードの場合）

---

---

## 7. 発想生成の構造を厳密に守る修正とリセット機能の実装

### 変更の目的
- 親→子6→孫3×6の構造を厳密に守る
- 古いノードが残らないようにリセット機能を実装
- 新しい発想を始める時に強制リセット
- リセットボタンを「生成をリセット」に変更

---

## 7.1 idea.html の変更

### 変更内容

#### 7.1.1 ノードクリックで発想を広げる機能の削除
- **目的**: 親→子6→孫3×6の構造を守るため、ノードクリックで発想を広げる機能を削除
- **理由**: ノードクリックで発想を広げると、構造が壊れてしまうため
- **変更**: ノードクリック時は、親ページに`SAVE_WORD`メッセージを送信するのみ

#### 7.1.2 親→子6→孫3×6の構造を厳密に守る
- **実装**:
  - 子ノードは必ず6つに制限（`childWords.splice(6)`）
  - 各子ノードから孫ノードは必ず3つに制限（`grandWords.splice(3)`）
  - 不足する場合は、自動的にプレースホルダーを生成
- **コード**:
```javascript
// 必ず6つの子ノードを作成
while(childWords.length < 6) childWords.push(seed + '_child' + (childWords.length + 1));
childWords.splice(6); // 6つに制限

for(let i = 0; i < 6; i++){
  const c = childWords[i];
  const child = addNode(c, parent.id, 1);
  
  // 各子ノードから必ず3つの孫ノードを作成
  const grandWords = await fetchWords(c, 3);
  while(grandWords.length < 3) grandWords.push(c + '_grand' + (grandWords.length + 1));
  grandWords.splice(3); // 3つに制限
  
  for(const g of grandWords){
    addNode(g, child.id, 2);
  }
}
```

#### 7.1.3 リセットボタンの変更
- **変更前**: 「リセット」（ズームのみリセット）
- **変更後**: 「生成をリセット」（生成データもリセット）
- **機能**:
  - `nodes`、`links`、`idCounter`をリセット
  - `seedInput`をクリア
  - ズームもリセット
- **コード**:
```javascript
function resetGeneration() {
  nodes = [];
  links = [];
  idCounter = 0;
  document.getElementById('seedInput').value = '';
  restart();
  // ズームもリセット
  const resetTransform = d3.zoomIdentity;
  svg.transition().duration(300).call(zoom.transform, resetTransform);
}
```

#### 7.1.4 新しい発想を始める時の強制リセット
- **目的**: 新しい発想を始める時（`DB_UPDATE`受信時）に、古いノードを完全に削除
- **実装**: `DB_UPDATE`受信時に、生成開始前にリセットを実行
- **コード**:
```javascript
if(type === 'DB_UPDATE'){
  // 新しい発想を始める前に強制リセット
  nodes = [];
  links = [];
  idCounter = 0;
  restart();
  
  // その後、新しい発想を生成
  const seedText = payload?.text || payload?.result || payload?.message || JSON.stringify(payload);
  document.getElementById('seedInput').value = seedText;
  document.getElementById('addSeedBtn').click();
}
```

#### 7.1.5 生成処理の改善
- **生成開始前**: 必ずリセットを実行
- **構造の厳密性**: 親1つ、子6つ、孫18つ（3×6）を必ず守る
- **処理完了後**: ボタンを有効化し、テキストを「連想マップ生成」に戻す

---

## 技術的な詳細

### 生成構造
```
親（1つ）
├─ 子1（6つのうち1つ目）
│  ├─ 孫1-1
│  ├─ 孫1-2
│  └─ 孫1-3
├─ 子2（6つのうち2つ目）
│  ├─ 孫2-1
│  ├─ 孫2-2
│  └─ 孫2-3
...
└─ 子6（6つのうち6つ目）
   ├─ 孫6-1
   ├─ 孫6-2
   └─ 孫6-3
```

### リセットタイミング
1. **手動リセット**: 「生成をリセット」ボタンをクリック
2. **自動リセット**: 新しい発想を始める時（`DB_UPDATE`受信時）
3. **生成開始前**: 必ずリセットを実行

### データの整合性
- 古いノードが残らないように、生成開始前に必ずリセット
- 構造が壊れないように、ノードクリックで発想を広げる機能を削除
- 親→子6→孫3×6の構造を厳密に守る

---

## 注意事項
- すべての変更は`eito`フォルダ内のファイルのみに適用
- 他のフォルダのファイルは参照のみ（変更なし）
- 既存の機能に影響を与えないよう、後方互換性を維持
- ロック中でもスクロールが可能になったことで、ユーザビリティが向上
- トグルボタンの目的を明確にすることで、ユーザーが適切に使い分けられる
- 発想を増やす機能は、スライドとノードクリックのみで実現（ボタンは不要）
- 親→子6→孫3×6の構造を厳密に守るため、ノードクリックで発想を広げる機能は削除
- 新しい発想を始める時は、必ず古いノードをリセットしてから生成

