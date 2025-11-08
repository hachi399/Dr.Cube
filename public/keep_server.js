
  // ====== サーバー維持（自動Ping）機能 ======
  const KEEP_ALIVE_INTERVAL = 1000 * 60 * 10; // 10分ごと（単位: ミリ秒）
  const PING_MESSAGE = "__keep_alive__";

  async function keepServerAlive() {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: PING_MESSAGE }),
      });
      console.log("🟢 サーバー維持Ping送信:", new Date().toLocaleTimeString());
    } catch (err) {
      console.error("🔴 サーバー維持Ping失敗:", err.message);
    }
  }

  // ページ読み込み後、定期的に実行
  setInterval(keepServerAlive, KEEP_ALIVE_INTERVAL);

