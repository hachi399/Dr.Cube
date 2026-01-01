
    const API_URL = "https://dr-cube-1.onrender.com/chat"; // Render のURLに置き換え
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const toggleBtn = document.getElementById("toggleBtn");

    let stream = null;
    let cameraOn = false;
    let autoCaptureInterval = null;
  

    // ====== ChatGPTとの通常会話 ======
    async function sendMessage() {
      const input = document.getElementById("input");
      const chat = document.getElementById("chat");
      const userMessage = input.value;
      if (!userMessage) return;

      chat.innerHTML += `<p><b>あなた:</b> ${userMessage}</p> <b>この内容について図や表、絵文字などを駆使して小学生でもわかる説明文を作成してください</b>`;
      input.value = "";
//------------------------------------------------------------変更点
      const res = await fetch("https://dr-cube-1.onrender.com/graph", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    formula: "2*x+3",
    xmin: -10,
    xmax: 10
  })
});

const data = await res.json();
document.getElementById("graph").src = "data:image/png;base64," + data.image;
//------------------------------------------------------------
      chat.innerHTML += `<p><b>AI:</b> ${data.reply}</p>`;
      chat.scrollTop = chat.scrollHeight;
    }

document.getElementById("input").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    
    sendMessage();
  }
});
    // ====== シャープネス（ピント合い具合）計算 ======
    function calcSharpness(data, width, height) {
      let diffSum = 0;
      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          const i = (y * width + x) * 4;
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

          const ir = (y * width + (x + 1)) * 4;
          const lumR = 0.2126 * data[ir] + 0.7152 * data[ir + 1] + 0.0722 * data[ir + 2];

          const id = ((y + 1) * width + x) * 4;
          const lumD = 0.2126 * data[id] + 0.7152 * data[id + 1] + 0.0722 * data[id + 2];

          diffSum += Math.abs(lum - lumR) + Math.abs(lum - lumD);
        }
      }
      const count = (width - 1) * (height - 1) * 2;
      return count > 0 ? diffSum / count : 0;
    }

    // ====== ピント検出と自動撮影 ======
    function detectFocusAndCapture(video, canvas) {
      const ctx = canvas.getContext("2d");
      const CHECK_INTERVAL_MS = 1000;
      const MAX_ANALYSIS_WIDTH = 320;
      const SHARPNESS_THRESHOLD = 3.5;
      const COOLDOWN_MS = 5000;
      const analysisCanvas = document.createElement('canvas');
      const analysisCtx = analysisCanvas.getContext('2d');
      let lastCaptureTime = 0;

      // intervalIdを返して停止できるようにする
      const intervalId = setInterval(async () => {
        if (!video.srcObject) return;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const scale = Math.min(1, MAX_ANALYSIS_WIDTH / video.videoWidth);
        const aw = Math.floor(video.videoWidth * scale);
        const ah = Math.floor(video.videoHeight * scale);
        analysisCanvas.width = aw;
        analysisCanvas.height = ah;
        analysisCtx.drawImage(video, 0, 0, aw, ah);

        const imageData = analysisCtx.getImageData(0, 0, aw, ah);
        const sharpness = calcSharpness(imageData.data, aw, ah);
        console.debug('sharpness=', sharpness);

        if (sharpness > SHARPNESS_THRESHOLD) {
          const now = Date.now();
          if (now - lastCaptureTime > COOLDOWN_MS) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL("image/png");
            console.log('📸 ピント検出、AIに送信します...');
            await analyzeImage(base64Image);
            lastCaptureTime = now;
          }
        }
      }, CHECK_INTERVAL_MS);

      return intervalId;
    }

    // ====== AI解析送信 ======
    async function analyzeImage(base64Image) {
      const chat = document.getElementById("chat");
      chat.innerHTML += `<p><b>📷 AI解析中...</b></p>`;
      stopCamera(); // 解析中はカメラ停止
      chat.scrollTop = chat.scrollHeight;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Image,
            message: "この画像を解析してください。"
          }),
        });
        const data = await res.json();
        chat.innerHTML += `<p><b>AI解析結果:</b> ${data.reply}</p>`;
      } catch (err) {
        console.error(err);
        chat.innerHTML += `<p style="color:red;">解析エラー: ${err.message}</p>`;
      }
      chat.scrollTop = chat.scrollHeight;
    }

    // ====== カメラ起動・停止 ======
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraOn = true;
        toggleBtn.textContent = "⏹ カメラOFF";
        toggleBtn.classList.add("off");
        console.log("✅ カメラ起動");
        if (!autoCaptureInterval) {
          autoCaptureInterval = detectFocusAndCapture(video, canvas);
        }
      } catch (err) {
        alert("カメラを許可してください: " + err);
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
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
      console.log("🛑 カメラ停止");
    }

    // ====== トグルボタン操作 ======
    toggleBtn.addEventListener("click", () => {
      if (cameraOn) stopCamera();
      else startCamera();
    });
  
