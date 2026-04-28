import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
    const result = await model.generateContent("Hello!");
    console.log("SUCCESS:", await result.response.text());
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}
run();
