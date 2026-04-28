import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  const modelsToTest = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello!");
      const response = await result.response;
      console.log(`[SUCCESS] ${modelName}:`, response.text().trim());
    } catch (e: any) {
      console.error(`[ERROR] ${modelName}:`, e.message);
    }
  }
}
run();
