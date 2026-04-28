import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "ollama", // Ollama doesn't require a real API key
  baseURL: "http://localhost:11434/v1",
  dangerouslyAllowBrowser: true, // Needed for frontend usage
});

const MODEL_NAME = "llama3.2";

export async function getAiResponse(message: string, context: any) {
  try {
    const prompt = `You are the Organic Agroflow AI assistant.
Context: ${JSON.stringify(context)}

User Message: ${message}

Provide a helpful, concise response. If the user is requesting an action like creating an order, you can output a JSON block like {"action": "REQUEST_ORDER", "cropName": "..."} or {"action": "ACCEPT_ORDER"} in your response text to trigger frontend actions.`;

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenAI Response error:", error);
    throw new Error(error.message || "Failed to generate AI response.");
  }
}

export async function transcribeAudio(audioBlob: Blob) {
  try {
    // The OpenAI SDK expects a File object for transcription
    const file = new File([audioBlob], "audio.webm", { type: audioBlob.type });

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
    });

    return response.text;
  } catch (error: any) {
    console.error("OpenAI Audio transcription error:", error);
    throw new Error(error.message || "Failed to transcribe audio.");
  }
}
