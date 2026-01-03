
import { GoogleGenAI } from "@google/genai";

export const createChatSession = (apiKey: string) => {
  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "あなたは親切で有能なAIアシスタントです。ユーザーの質問に日本語で丁寧かつ的確に答えてください。Markdown形式を使用して、読みやすく構造化された回答を心がけてください。",
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    },
  });
};
