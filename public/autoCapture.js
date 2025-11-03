// ===== 自動撮影＋自動ダウンロード機能 =====

// 画像のシャープネス（ピントの合い具合）を簡易的に判定する関数
function calcSharpness(data, width, height) {
  let diffSum = 0;
  for (let i = 0; i < data.length - 4 * width; i += 4) {
    const diff =
      Math.abs(data[i] - data[i + 4]) + // 横方向の差分
      Math.abs(data[i] - data[i + 4 * width]); // 縦方向の差分
    diffSum += diff;
    console.log(diff);
  }
  return diffSum / (width * height);
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

  // 定期的にピントをチェック
  setInterval(() => {
    if (!video.srcObject) return; // カメラがオフならスキップ

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpness = calcSharpness(imageData.data, canvas.width, canvas.height);

    // ピントが合ったら自動撮影＆ダウンロード
    if (sharpness > 40) {
      captureAndDownload(canvas);
    }
  }, 1000); // 1秒ごとに判定
}
