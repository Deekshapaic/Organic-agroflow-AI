import dotenv from "dotenv";

dotenv.config({ path: './.env' });

async function run() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.VITE_GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("List models error:", e.message);
  }
}
run();
