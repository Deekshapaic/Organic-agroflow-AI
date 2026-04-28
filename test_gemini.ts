import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro"
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello!");
      const response = await result.response;
      console.log(`${modelName} success:`, response.text());
    } catch (e: any) {
      console.error(`${modelName} error:`, e.message);
    }
  }
}
run();
