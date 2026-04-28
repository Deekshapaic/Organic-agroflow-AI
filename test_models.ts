import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`);
  const data = await response.json();
  const models = data.models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent")).map((m: any) => m.name.replace('models/', ''));
  
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello!");
      const text = await result.response.text();
      console.log(`SUCCESS with ${modelName}: ${text}`);
      process.exit(0);
    } catch (e: any) {
      console.log(`Failed ${modelName}: ${e.message}`);
    }
  }
}
run();
