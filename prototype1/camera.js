const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const toggleBtn = document.getElementById('toggleBtn');
const captureBtn = document.getElementById('captureBtn');

let stream = null;
let cameraOn = false;
let autoCaptureInterval = null;

// カメラ起動
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }, // インカメラを指定
      audio: false
    });
    video.srcObject = stream;
    cameraOn = true;
    toggleBtn.textContent = "⏹ カメラOFF";
    toggleBtn.classList.add("off");
    console.log("✅ カメラ起動");
    // 自動撮影（autoCapture.jsの関数）を開始
    try {
      const photoCanvas = document.getElementById('photoCanvas');
      if (photoCanvas && typeof detectFocusAndCapture === 'function') {
        // detectFocusAndCaptureはintervalIdを返す
        if (!autoCaptureInterval) {
          autoCaptureInterval = detectFocusAndCapture(video, photoCanvas);
        }
      }
    } catch (e) {
      console.warn('自動撮影の開始に失敗しました:', e);
    }
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
    cameraOn = false;
    toggleBtn.textContent = "▶ カメラON";
    toggleBtn.classList.remove("off");
    console.log("🛑 カメラ停止");
    // 自動撮影のintervalをクリア
    try {
      if (autoCaptureInterval) {
        clearInterval(autoCaptureInterval);
        autoCaptureInterval = null;
      }
    } catch (e) {
      console.warn('自動撮影の停止に失敗しました:', e);
    }
  }
}

// トグル（ON/OFF切り替え）
toggleBtn.addEventListener('click', () => {
  if (cameraOn) {
    stopCamera();
  } else {
    startCamera();
  }
});

// 写真撮影
captureBtn.addEventListener('click', () => {
  if (!cameraOn) {
    alert("カメラが起動していません。");
    return;
  }
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  console.log("📸 写真を撮りました");
});
