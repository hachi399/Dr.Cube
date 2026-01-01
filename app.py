# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import matplotlib.pyplot as plt
import numpy as np
import io
import base64

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


# ============================================================
# ① 通常チャット & 画像解析（スイッチ式）
# ============================================================
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")
    image_b64 = data.get("image", None)
    mode = data.get("mode", "default")

    try:
        # =========================
        # 画像解析
        # =========================
        if image_b64:
            if mode == "kids":
                system_prompt = (
                    "あなたは小学生にもわかるように、絵文字や図を使ってやさしく画像を説明するAIです。"
                )
            else:
                system_prompt = "あなたは画像を分析し、内容を丁寧に説明するAIアシスタントです。"

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_message or "この画像を解析してください。"},
                            {"type": "image_url", "image_url": {"url": image_b64}},
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
        # テキストチャット
        # =========================
        else:
            if mode == "kids":
                system_prompt = (
                    "あなたは説明がとても上手なAIです。小学生でもわかるように、"
                    "絵文字や図や表を使って楽しく説明してください。"
                )
                model_name = "gpt-4o-mini"

            elif mode == "business":
                system_prompt = (
                    "あなたはビジネス向けの丁寧で簡潔な文章を作成するAIです。"
                )
                model_name = "gpt-4o-mini"

            elif mode == "creative":
                system_prompt = (
                    "あなたは創造的でユーモアのある文章を作成するAIです。"
                )
                model_name = "gpt-4o-mini"

            else:
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


# ============================================================
# ② グラフ生成 API（本物の画像を返す）
# ============================================================
@app.post("/graph")
async def graph(request: Request):
    """
    例：
    {
        "formula": "2*x+3",
        "xmin": -10,
        "xmax": 10
    }
    """
    data = await request.json()
    formula = data.get("formula", "2*x+3")
    xmin = data.get("xmin", -10)
    xmax = data.get("xmax", 10)

    try:
        # x の値を生成
        x = np.linspace(xmin, xmax, 200)

        # 文字列の式を Python として評価
        y = eval(formula)

        # グラフ生成
        fig, ax = plt.subplots()
        ax.plot(x, y, label=f"y = {formula}")
        ax.set_xlabel("x")
        ax.set_ylabel("y")
        ax.set_title("Graph")
        ax.grid(True)
        ax.legend()

        # 画像をバイナリに変換
        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode()

        plt.close(fig)

        return {"image": img_b64}

    except Exception as e:
        return {"error": f"グラフ生成中にエラー: {str(e)}"}