# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()

# === CORS設定 ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 公開時は ["https://あなたのgithub.io"] に変更
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === OpenAIクライアント ===
client = OpenAI(api_key=os.getenv("CHATGPT_API_KEY"))

@app.get("/")
def root():
    return {"message": "API is running correctly!"}


@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")
    image_b64 = data.get("image", None)

    try:
        if image_b64:
            # ===== 画像解析リクエスト =====
            completion = client.chat.completions.create(
                model="gpt-4o-mini",  # 画像対応モデル
                messages=[
                    {"role": "system", "content": "あなたは画像を分析し、内容を丁寧に説明するAIアシスタントです。"},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_message or "この画像を解析してください。"},
                            {"type": "image_url", "image_url": image_b64}
                        ]
                    }
                ]
            )
            ai_reply = completion.choices[0].message.content[0].text

        else:
            # ===== 通常テキストチャット =====
            completion = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "あなたは親切で知的なAIアシスタントです。"},
                    {"role": "user", "content": user_message}
                ]
            )
            ai_reply = completion.choices[0].message.content

        return {"reply": ai_reply}

    except Exception as e:
        return {"reply": f"エラーが発生しました: {str(e)}"}
