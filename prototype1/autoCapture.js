// ===== 自動撮影＋自動ダウンロード機能 =====

// 画像のシャープネス（ピントの合い具合）を簡易的に判定する関数
function calcSharpness(data, width, height) {
  // data: Uint8ClampedArray (RGBA)
  // 改善点：RGB を輝度に変換して右・下方向の差分を集計し、
  // (width-1)*(height-1) で正規化する。
  let diffSum = 0;
  // avoid allocating extra arrays for perf
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const ir = (y * width + (x + 1)) * 4;
      const rr = data[ir], gr = data[ir + 1], br = data[ir + 2];
      const lumR = 0.2126 * rr + 0.7152 * gr + 0.0722 * br;

      const id = ((y + 1) * width + x) * 4;
      const rd = data[id], gd = data[id + 1], bd = data[id + 2];
      const lumD = 0.2126 * rd + 0.7152 * gd + 0.0722 * bd;

      diffSum += Math.abs(lum - lumR) + Math.abs(lum - lumD);
    }
  }

  const count = (width - 1) * (height - 1) * 2; // 2差分/ピクセル
  return count > 0 ? diffSum / count : 0;
}

// 撮影して自動ダウンロードする関数
function captureAndDownload(canvas) {
  const link = document.createElement("a");
  link.download = `photo_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// 自動撮影を定期的にチェックする関数
async function detectFocusAndCapture(video, canvas) {
  const ctx = canvas.getContext("2d");

  // パラメータ（必要に応じて調整）
  const CHECK_INTERVAL_MS = 1000; // 判定間隔
  const MAX_ANALYSIS_WIDTH = 320; // 解析用に縮小して安定化＆高速化
  const SHARPNESS_THRESHOLD = 3.8; // 閾値（環境により調整）
  const COOLDOWN_MS = 5000; // 連続撮影を防ぐクールダウン

  // 分析用オフスクリーンキャンバス
  const analysisCanvas = document.createElement('canvas');
  const analysisCtx = analysisCanvas.getContext('2d');

  let lastCaptureTime = 0;

  const intervalId = setInterval(() => {
    if (!video.srcObject) return; // カメラがオフならスキップ
    if (video.videoWidth === 0 || video.videoHeight === 0) return; // サイズ未初期化

    // 縮小して解析
    const scale = Math.min(1, MAX_ANALYSIS_WIDTH / video.videoWidth);
    const aw = Math.max(2, Math.floor(video.videoWidth * scale));
    const ah = Math.max(2, Math.floor(video.videoHeight * scale));
    analysisCanvas.width = aw;
    analysisCanvas.height = ah;
    analysisCtx.drawImage(video, 0, 0, aw, ah);

    const imageData = analysisCtx.getImageData(0, 0, aw, ah);
    const sharpness = calcSharpness(imageData.data, aw, ah);
    console.debug('autoCapture sharpness=', sharpness);

    // ピントが合ったら自動撮影＆ダウンロード（クールダウン付き）
    if (sharpness > SHARPNESS_THRESHOLD) {
      const now = Date.now();
      if (now - lastCaptureTime > COOLDOWN_MS) {
        // フル解像度でキャプチャしてダウンロード
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        console.log('📸 ピントが合いました！自動撮影してダウンロードします (sharpness=', sharpness, ')');
        captureAndDownload(canvas);
        lastCaptureTime = now;
      } else {
        console.debug('クールダウン中、自動撮影スキップ');
      }
    }
  }, CHECK_INTERVAL_MS);

  return intervalId;
}
