# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import openai
import os

app = FastAPI()

# CORS設定（GitHub Pagesと通信できるようにする）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # セキュリティを強化するなら後で限定する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "あなたは親切なAIアシスタントです。"},
            {"role": "user", "content": user_message}
        ]
    )
    
    ai_reply = response["choices"][0]["message"]["content"]
    return {"reply": ai_reply}
