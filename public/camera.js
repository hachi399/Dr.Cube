const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const toggleBtn = document.getElementById('toggleBtn');
const captureBtn = document.getElementById('captureBtn');

let stream = null;
let cameraOn = false;

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
