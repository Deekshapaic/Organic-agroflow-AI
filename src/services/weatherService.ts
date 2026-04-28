import { GoogleGenerativeAI } from "@google/generative-ai";
import { WeatherData, Alert } from '../types';

export async function getWeatherData(latStr?: string, lngStr?: string, defaultLoc: string = "Bengaluru"): Promise<WeatherData> {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found, returning mock weather");
    return getMockWeather();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const locationQuery = (latStr && lngStr) ? `latitude ${latStr} and longitude ${lngStr}` : defaultLoc;
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }] as any
    });

    const result = await model.generateContent(`Search for the current weather and upcoming 1-week forecast for ${locationQuery}. Provide the current temperature in Celsius, a short condition description (like 'Sunny', 'Rainy', 'Cloudy'), the rain probability (0-100), the city/location name, and a 7-day forecast. Respond in valid JSON format matching the following structure: { "locationName": string, "temp": number, "condition": string, "rainProbability": number, "forecast": Array<{ "day": string, "temp": number, "condition": string }> }. No markdown, just raw JSON.`);
    const response = await result.response;
    const text = response.text()?.trim().replace(/```json/g, "").replace(/```/g, "").trim();
    if (text) {
      return JSON.parse(text) as WeatherData;
    }
    return getMockWeather();
  } catch (error) {
    console.error("Error fetching weather:", error);
    return getMockWeather();
  }
}

function getMockWeather(): WeatherData {
  return {
    temp: 28,
    condition: "Partly Cloudy",
    rainProbability: 15,
    locationName: "Bengaluru, IN",
    forecast: [
      { day: "Mon", temp: 29, condition: "Sunny" },
      { day: "Tue", temp: 27, condition: "Cloudy" },
      { day: "Wed", temp: 26, condition: "Rainy" },
      { day: "Thu", temp: 28, condition: "Partly Cloudy" },
      { day: "Fri", temp: 30, condition: "Sunny" },
      { day: "Sat", temp: 31, condition: "Clear" },
      { day: "Sun", temp: 29, condition: "Sunny" }
    ]
  };
}

export async function getRealTimeAlerts(latStr?: string, lngStr?: string, defaultLoc: string = "Bengaluru"): Promise<Alert[]> {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return getMockAlerts();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const locationQuery = (latStr && lngStr) ? `near latitude ${latStr} and longitude ${lngStr}` : defaultLoc;
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }] as any
    });

    const result = await model.generateContent(`Search for the latest real-time news related to agriculture, digital supply chains, and agriculture technology trends specifically in or around ${locationQuery}. Filter for news that would be relevant to a platform like "AgroFlow AI". 
      Generate exactly 4 real-time news alerts. 
      For each news item, provide:
      - id (unique string)
      - type ('news', 'demand', 'opportunity', 'flood', 'drought')
      - message (headline)
      - severity ('low', 'medium', 'high', 'critical')
      - timestamp (current time)
      - articleUrl (link to the news article)
      
      Respond only with a JSON array of these alert objects. No markdown, just raw JSON.`);
    
    const response = await result.response;
    const text = response.text()?.trim().replace(/```json/g, "").replace(/```/g, "").trim();
    if (text) {
      const alerts = JSON.parse(text);
      return Array.isArray(alerts) ? alerts : getMockAlerts();
    }
    return getMockAlerts();
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return getMockAlerts();
  }
}

export function getMockAlerts(): Alert[] {
  return [
    {
      id: "a1",
      type: "opportunity",
      message: "High demand for Organic Tomatoes in Mumbai market. 15% price surge expected.",
      severity: "high",
      timestamp: Date.now() - 3600000,
      articleUrl: "#"
    },
    {
      id: "a2",
      type: "flood",
      message: "Heavy rainfall alert for Nashik region. Potential impact on onion storage.",
      severity: "critical",
      timestamp: Date.now() - 7200000,
      articleUrl: "#"
    },
    {
      id: "a3",
      type: "news",
      message: "Government announces new subsidy for cold storage infrastructure.",
      severity: "low",
      timestamp: Date.now() - 14400000,
      articleUrl: "#"
    },
    {
      id: "a4",
      type: "demand",
      message: "Export window opening for Pomegranates to UAE markets next week.",
      severity: "medium",
      timestamp: Date.now() - 21600000,
      articleUrl: "#"
    }
  ];
}
