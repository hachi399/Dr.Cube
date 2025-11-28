
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

      chat.innerHTML += `<p><b>あなた:</b> ${userMessage}</p>`;
      input.value = "";

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      chat.innerHTML += `<p><b>AI:</b> ${data.reply}</p>`;
      chat.scrollTop = chat.scrollHeight;
    }

document.getElementById("input").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    
    sendMessage();
  }
});
   
    
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

    

document.addEventListener("mouseup", (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    e.stopPropagation();  // 👈 他イベントへの伝播を止める
    // AI送信処理など...
  }
}, false);
