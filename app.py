# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()

# === CORS設定 ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hachi399.github.io"], 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Access-Control-Allow-Origin"]
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
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "あなたは画像を分析し、内容を丁寧に説明するAIアシスタントです。"
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_message or "この画像を解析してください。"},
                            {"type": "image_url", "image_url": {"url": image_b64}}
                        ]
                    }
                ]
            )

            # contentが文字列か配列かを判定して安全に取得
            content = completion.choices[0].message.content
            if isinstance(content, list):
                ai_reply = "".join([c.get("text", "") for c in content if "text" in c])
            else:
                ai_reply = content

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
