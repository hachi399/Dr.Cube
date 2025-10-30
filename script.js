const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const button = document.getElementById('captureBtn');

// カメラ起動
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // インカメラを指定
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    alert("カメラを許可してください: " + err);
  }
}

// 写真撮影
button.addEventListener('click', () => {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  console.log("写真を撮りました。");
});

startCamera();

let lastFocus = 0;
let cooldown = false;

function getSharpness(frame) {
  // グレースケール変換してピクセル差分で簡易フォーカス評価
  let sharpness = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    const avg = (frame.data[i] + frame.data[i+1] + frame.data[i+2]) / 3;
    sharpness += Math.abs(avg - lastFocus);
    lastFocus = avg;
  }
  return sharpness / frame.data.length;
}

function autoCapture() {
  if (cooldown) return;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const sharpness = getSharpness(frame);

  if (sharpness > 0.25) { // 適当な閾値、調整可能
    cooldown = true;
    console.log("ピントが合ったと判定 → 写真保存！");
    const link = document.createElement('a');
    link.download = 'capture_' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => cooldown = false, 3000);
  }
  requestAnimationFrame(autoCapture);
}

// カメラ起動後に自動撮影ループ開始
video.addEventListener('playing', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  autoCapture();
});

