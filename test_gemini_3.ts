import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  const modelName = "gemini-2.5-flash";
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello!");
    const response = await result.response;
    console.log(`${modelName} success:`, response.text());
  } catch (e: any) {
    console.error(`${modelName} error:`, e.message);
  }
}
run();
