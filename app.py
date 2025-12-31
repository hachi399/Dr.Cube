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
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Access-Control-Allow-Origin"],
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
    mode = data.get("mode", "default")  # ← ここでモードを受け取る（"default", "kids" など）

    try:
        # =========================
        # 画像付きリクエストの場合
        # =========================
        if image_b64:
            # mode によって画像説明のスタイルを変えたい場合
            if mode == "kids":
                system_prompt = (
                    "あなたは小学生にもわかるように、絵文字や図を使ってやさしく画像を説明するAIです。"
                    "むずかしい言葉は使わず、楽しく、分かりやすく説明してください。"
                )
            else:
                system_prompt = "あなたは画像を分析し、内容を丁寧に説明するAIアシスタントです。"

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_message or "この画像を解析してください。",
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": image_b64},
                            },
                        ],
                    },
                ],
            )

            content = completion.choices[0].message.content
            if isinstance(content, list):
                ai_reply = "".join([c.get("text", "") for c in content if "text" in c])
            else:
                ai_reply = content

        # =========================
        # テキストのみチャットの場合
        # =========================
        else:
            # --- mode に応じてプロンプト＆モデルをスイッチ ---
            if mode == "kids":
                # 小学生向けの説明モード（絵文字・図・表を積極活用）
                system_prompt = (
                    "あなたは説明がとても上手なAIです。小学生でもわかるように、"
                    "やさしい言葉と絵文字や図、簡単な表を使って楽しく説明してください。"
                    "専門用語はできるだけ使わず、使う場合は必ずかんたんに説明してください。"
                )
                model_name = "gpt-4o-mini"

            elif mode == "business":
                # ビジネス文書モード
                system_prompt = (
                    "あなたはビジネス向けの丁寧で簡潔な文章を作成するAIです。"
                    "敬体（です・ます調）で、論理的かつ読みやすく説明してください。"
                )
                model_name = "gpt-4o-mini"

            elif mode == "creative":
                # 創作・アイデア出しモード
                system_prompt = (
                    "あなたは創造的でユーモアのある文章を作成するAIです。"
                    "発想力豊かに、面白く、時には比喩や物語も交えて回答してください。"
                )
                model_name = "gpt-4o-mini"

            else:
                # デフォルト（従来の通常チャット）
                system_prompt = "あなたは親切で知的なAIアシスタントです。"
                model_name = "gpt-3.5-turbo"

            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            ai_reply = completion.choices[0].message.content

        return {"reply": ai_reply}

    except Exception as e:
        return {"reply": f"エラーが発生しました: {str(e)}"}