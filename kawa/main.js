// -----------------------------------------------------------
// 要素取得
// -----------------------------------------------------------
const fileInput = document.getElementById("file-input");
const uploadedImage = document.getElementById("uploaded-image");
const selectionCanvas = document.getElementById("selection-canvas");
const selectionCtx = selectionCanvas.getContext("2d");

const cropPreview = document.getElementById("crop-preview");
const cropCtx = cropPreview.getContext("2d");

// -----------------------------------------------------------
// STEP2: 画像アップロードして表示
// -----------------------------------------------------------
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const imageURL = URL.createObjectURL(file);
  uploadedImage.src = imageURL;

  uploadedImage.onload = () => {
    // 画像サイズに選択キャンバスを合わせる
    selectionCanvas.width = uploadedImage.clientWidth;
    selectionCanvas.height = uploadedImage.clientHeight;

    selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);

    console.log("画像読み込み完了");
  };
});

// -----------------------------------------------------------
// STEP3: マウスドラッグで範囲選択
// -----------------------------------------------------------
let isDragging = false;
let startX = 0,
  startY = 0;
let currentX = 0,
  currentY = 0;

selectionCanvas.style.pointerEvents = "auto";

// ドラッグ開始
selectionCanvas.addEventListener("mousedown", (e) => {
  if (!uploadedImage.src) return;

  const rect = selectionCanvas.getBoundingClientRect();
  startX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
  startY = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);

  isDragging = true;
});

// ドラッグ中
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const rect = selectionCanvas.getBoundingClientRect();

  // キャンバス内にクリップ（はみ出し防止）
  currentX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
  currentY = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);

  selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);

  selectionCtx.strokeStyle = "red";
  selectionCtx.lineWidth = 2;

  const width = currentX - startX;
  const height = currentY - startY;

  selectionCtx.strokeRect(startX, startY, width, height);
});

// ドラッグ終了
window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;

  // -----------------------------------------------------------
  // STEP4: 選択部分を切り出してプレビューに表示
  // -----------------------------------------------------------
  const selW = currentX - startX;
  const selH = currentY - startY;

  // 負方向ドラッグの補正
  const x = selW < 0 ? startX + selW : startX;
  const y = selH < 0 ? startY + selH : startY;
  const w = Math.abs(selW);
  const h = Math.abs(selH);

  console.log("切り出し範囲:", { x, y, w, h });

  // サイズ0なら何もしない
  if (w === 0 || h === 0) return;

  // プレビューキャンバスの大きさを選択範囲に合わせる
  cropPreview.width = w;
  cropPreview.height = h;

  // 一旦オフスクリーンキャンバスに元画像を描く
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = uploadedImage.naturalWidth;
  tempCanvas.height = uploadedImage.naturalHeight;

  // 元のピクセルサイズで描画
  tempCtx.drawImage(uploadedImage, 0, 0);

  // selectionCanvas(client size) と naturalWidth にズレがある場合の補正
  const scaleX = uploadedImage.naturalWidth / uploadedImage.clientWidth;
  const scaleY = uploadedImage.naturalHeight / uploadedImage.clientHeight;

  // 正しいピクセル座標に変換
  const srcX = x * scaleX;
  const srcY = y * scaleY;
  const srcW = w * scaleX;
  const srcH = h * scaleY;

  // プレビューに描画
  cropCtx.clearRect(0, 0, w, h);
  cropCtx.drawImage(tempCanvas, srcX, srcY, srcW, srcH, 0, 0, w, h);
});
