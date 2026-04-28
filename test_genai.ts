import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
  const models = ['gemini-flash-latest', 'gemma-2-9b-it', 'aqa', 'gemini-2.5-flash-lite'];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: 'Hello'
      });
      console.log(`SUCCESS ${model}:`, response.text);
      return;
    } catch (e: any) {
      console.error(`ERROR ${model}:`, e.message);
    }
  }
}
run();
