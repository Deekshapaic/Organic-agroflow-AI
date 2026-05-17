import { GoogleGenerativeAI } from "@google/generative-ai";

export interface DemandPrediction {
  cropId: string;
  predictedDemand: "High" | "Medium" | "Low";
  priceTrend: "Up" | "Down" | "Stable";
  confidence: number;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Use a known working model. Based on test_gemini_3.ts, gemini-2.5-flash works.
const MODEL_NAME = "gemini-2.5-flash";

export async function getAiResponse(message: string, context: any) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `You are the Organic Agroflow AI assistant.
Context: ${JSON.stringify(context)}

User Message: ${message}

Provide a helpful, concise response. If the user is requesting an action like creating an order, you can output a JSON block like {"action": "REQUEST_ORDER", "cropName": "..."} or {"action": "ACCEPT_ORDER"} in your response text to trigger frontend actions.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("AI Response error:", error);
    
    // Check if it's a quota/rate limit error
    if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('rate limit')) {
      // Return intelligent fallback response based on context
      return getFallbackResponse(message, context);
    }
    
    throw new Error(error.message || "Failed to generate AI response.");
  }
}

// Intelligent fallback responses when API quota is exceeded
function getFallbackResponse(message: string, context: any): string {
  const lowerMessage = message.toLowerCase();
  const role = context.role || 'user';
  
  // Order-related queries
  if (lowerMessage.includes('order') || lowerMessage.includes('request')) {
    if (role === 'wholesaler') {
      return `I can help you place an order! To request crops from farmers, please:
1. Browse available inventory in the Farmer Inventory section
2. Select the crop you need
3. Click "Request Order" to initiate the purchase

Would you like me to help you find specific crops? {"action": "REQUEST_ORDER"}`;
    }
    if (role === 'farmer') {
      return `I can help you manage orders! You have pending order requests that need your attention. Review them in your Orders section and accept or decline based on your inventory availability.`;
    }
  }
  
  // Inventory queries
  if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
    return `Your current inventory is displayed in the dashboard. You can:
- Add new crops with quantity and pricing
- Update existing inventory levels
- Track organic certification status
- Monitor demand predictions for each crop`;
  }
  
  // Analytics queries
  if (lowerMessage.includes('analytic') || lowerMessage.includes('report') || lowerMessage.includes('data')) {
    return `The Analytics dashboard provides comprehensive insights including:
- Revenue trends over time
- Demand forecasting for your crops
- Supply chain efficiency metrics
- Market price predictions

Navigate to the Analytics tab to view detailed reports.`;
  }
  
  // Logistics queries
  if (lowerMessage.includes('delivery') || lowerMessage.includes('logistics') || lowerMessage.includes('track')) {
    return `Track your deliveries in real-time using our Logistics Map feature:
- View active shipments on the map
- Monitor estimated delivery times
- Check route optimization
- Receive automated status updates`;
  }
  
  // Compliance queries
  if (lowerMessage.includes('organic') || lowerMessage.includes('compliance') || lowerMessage.includes('certification')) {
    return `Organic compliance tracking ensures product integrity:
- Digital certification verification
- Complete provenance history
- Automated compliance checks
- QR code generation for transparency

View the Organic Compliance section for detailed tracking.`;
  }
  
  // General help
  return `I'm your AgroFlow AI assistant! I can help you with:

🌾 **Inventory Management** - Track and manage your crops
📊 **Analytics & Insights** - View demand predictions and trends
🚚 **Logistics Tracking** - Monitor deliveries in real-time
✅ **Organic Compliance** - Verify certifications and provenance
📦 **Order Management** - Place and fulfill orders

*Note: AI features are temporarily limited due to API quota. Full AI capabilities will resume shortly.*

What would you like to know more about?`;
}

let demandPredictionsCache: any = null;
let demandPredictionsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getDemandPredictions(crops?: any[]) {
  if (demandPredictionsCache && (Date.now() - demandPredictionsCacheTime) < CACHE_TTL) {
    return demandPredictionsCache;
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Based on these crops: ${JSON.stringify(crops || [])}, predict market demand for the upcoming season. Return a JSON array of objects with {cropId, predictedDemand (High/Medium/Low), priceTrend (Up/Down/Stable), confidence (0-100)}. Only return valid JSON.`;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    
    demandPredictionsCache = data;
    demandPredictionsCacheTime = Date.now();
    return data;
  } catch (error) {
    console.error("Demand prediction error (falling back to mock data):", error);
    // Fallback data if rate limit exceeded
    const fallback = (crops || []).map(c => ({
      cropId: c.id,
      predictedDemand: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)],
      priceTrend: ["Up", "Down", "Stable"][Math.floor(Math.random() * 3)],
      confidence: Math.floor(Math.random() * 40) + 50 // 50-90
    }));
    
    demandPredictionsCache = fallback;
    demandPredictionsCacheTime = Date.now();
    return fallback;
  }
}

let cropRecCache: any = null;
let cropRecCacheTime = 0;

export async function getCropRecommendation(weather: any, marketDemand: any[]) {
  if (cropRecCache && (Date.now() - cropRecCacheTime) < CACHE_TTL) {
    return cropRecCache;
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Weather: ${JSON.stringify(weather)}\nMarket Demand: ${JSON.stringify(marketDemand)}\nBased on this, recommend 3 crops to plant. Return a JSON array of objects with {cropName, reason, expectedYield}. Only return valid JSON.`;
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);
    
    cropRecCache = data;
    cropRecCacheTime = Date.now();
    return data;
  } catch (error) {
    console.error("Crop recommendation error (falling back to mock data):", error);
    const fallback = [
      { cropName: "Tomatoes", reason: "Good for current weather and high market demand.", expectedYield: "2000 kg/acre" },
      { cropName: "Wheat", reason: "Stable staple crop with reliable pricing.", expectedYield: "1500 kg/acre" },
      { cropName: "Soybeans", reason: "High demand expected next season.", expectedYield: "1200 kg/acre" }
    ];
    cropRecCache = fallback;
    cropRecCacheTime = Date.now();
    return fallback;
  }
}

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio
        }
      },
      { text: "Please transcribe this audio exactly as spoken." }
    ]);
    return result.response.text();
  } catch (error: any) {
    console.error("Audio transcription error:", error);
    throw new Error(error.message || "Failed to transcribe audio.");
  }
}