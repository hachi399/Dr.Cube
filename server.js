import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "10mb" }));

// OpenAI経由で画像を分析
app.post("/analyze", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "この画像を説明してください。" },
              { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}` }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error analyzing image");
  }
});

// ルートアクセス確認用
app.get("/", (req, res) => {
  res.send("✅ Renderサーバー稼働中");
});

// Renderポート対応
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

