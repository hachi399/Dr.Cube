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
