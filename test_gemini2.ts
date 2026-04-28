import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const result = await model.generateContent("Hello!");
    const response = await result.response;
    console.log("1.5-pro-latest response:", response.text());
  } catch (e: any) {
    console.error("1.5-pro-latest error:", e.message);
  }
}
run();
