const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');

let stream = null;

// カメラ起動
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // インカメラ
      audio: false
    });
    video.srcObject = stream;
    console.log("✅ カメラ起動");
  } catch (err) {
    alert("カメラを許可してください: " + err);
  }
}

// カメラ停止
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    stream = null;
    console.log("🛑 カメラ停止");
  }
}

// 写真撮影
function capturePhoto() {
  if (!stream) {
    alert("カメラが起動していません。");
    return;
  }
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  console.log("📸 写真を撮りました");
}

// ボタンの動作
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', capturePhoto);
