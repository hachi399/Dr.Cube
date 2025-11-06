# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()

# === CORS設定（GitHub Pagesとの連携に必要） ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 公開時は ["https://あなたのgithub.io"] に変更
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === OpenAIクライアント初期化 ===
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
def root():
    return {"message": "API is running correctly!"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")

    try:
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
