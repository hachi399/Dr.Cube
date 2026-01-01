const API_URL = "https://dr-cube-1.onrender.com/chat";
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const toggleBtn = document.getElementById("toggleBtn");

let stream = null;
let cameraOn = false;
let autoCaptureInterval = null;

/* ===============================
   通常チャット
================================ */
async function sendMessage() {
  const input = document.getElementById("input");
  const chat = document.getElementById("chat");
  const userMessage = input.value;
  if (!userMessage) return;

  chat.innerHTML += `<p><b>あなた:</b> ${userMessage}</p>`;
  input.value = "";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: userMessage,
      mode: "kids"
    })
  });

  const data = await res.json();
  chat.innerHTML += `<p><b>AI:</b> ${data.reply}</p>`;
  chat.scrollTop = chat.scrollHeight;
}

document.getElementById("input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

/* ===============================
   グラフ生成
================================ */
async function generateGraph() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "graph",
      formula: "2*x+3",
      xmin: -10,
      xmax: 10
    })
  });

  const data = await res.json();

  if (!data.image) {
    console.error("グラフ生成エラー:", data);
    return;
  }

  document.getElementById("graph").src =
    "data:image/png;base64," + data.image;
}

/* ===============================
   シャープネス計算
================================ */
function calcSharpness(data, width, height) {
  let diffSum = 0;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];

      const ir = (y * width + (x+1)) * 4;
      const lumR = 0.2126 * data[ir] + 0.7152 * data[ir+1] + 0.0722 * data[ir+2];

      const id = ((y+1) * width + x) * 4;
      const lumD = 0.2126 * data[id] + 0.7152 * data[id+1] + 0.0722 * data[id+2];

      diffSum += Math.abs(lum - lumR) + Math.abs(lum - lumD);
    }
  }
  const count = (width - 1) * (height - 1) * 2;
  return count > 0 ? diffSum / count : 0;
}

/* ===============================
   ピント検出 → 自動撮影
================================ */
function detectFocusAndCapture(video, canvas) {
  const ctx = canvas.getContext("2d");
  const CHECK_INTERVAL_MS = 1000;
  const MAX_ANALYSIS_WIDTH = 320;
  const SHARPNESS_THRESHOLD = 3.5;
  const COOLDOWN_MS = 5000;

  const analysisCanvas = document.createElement("canvas");
  const analysisCtx = analysisCanvas.getContext("2d");
  let lastCaptureTime = 0;

  const intervalId = setInterval(async () => {
    if (!video.srcObject) return;
    if (video.videoWidth === 0) return;

    const scale = Math.min(1, MAX_ANALYSIS_WIDTH / video.videoWidth);
    const aw = Math.floor(video.videoWidth * scale);
    const ah = Math.floor(video.videoHeight * scale);

    analysisCanvas.width = aw;
    analysisCanvas.height = ah;
    analysisCtx.drawImage(video, 0, 0, aw, ah);

    const imageData = analysisCtx.getImageData(0, 0, aw, ah);
    const sharpness = calcSharpness(imageData.data, aw, ah);

    if (sharpness > SHARPNESS_THRESHOLD) {
      const now = Date.now();
      if (now - lastCaptureTime > COOLDOWN_MS) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL("image/png");
        await analyzeImage(base64Image);
        lastCaptureTime = now;
      }
    }
  }, CHECK_INTERVAL_MS);

  return intervalId;
}

/* ===============================
   AI画像解析
================================ */
async function analyzeImage(base64Image) {
  const chat = document.getElementById("chat");
  chat.innerHTML += `<p><b>📷 AI解析中...</b></p>`;
  stopCamera();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Image,
      message: "この画像を解析してください。"
    })
  });

  const data = await res.json();
  chat.innerHTML += `<p><b>AI解析結果:</b> ${data.reply}</p>`;
  chat.scrollTop = chat.scrollHeight;
}

/* ===============================
   カメラ ON/OFF
================================ */
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    cameraOn = true;
    toggleBtn.textContent = "⏹ カメラOFF";
    toggleBtn.classList.add("off");

    if (!autoCaptureInterval) {
      autoCaptureInterval = detectFocusAndCapture(video, canvas);
    }
  } catch (err) {
    alert("カメラを許可してください: " + err);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
    stream = null;
  }
  if (autoCaptureInterval) {
    clearInterval(autoCaptureInterval);
    autoCaptureInterval = null;
  }
  cameraOn = false;
  toggleBtn.textContent = "▶ カメラON";
  toggleBtn.classList.remove("off");
}

toggleBtn.addEventListener("click", () => {
  if (cameraOn) stopCamera();
  else startCamera();
});
