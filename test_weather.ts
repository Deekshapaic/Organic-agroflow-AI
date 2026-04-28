import { getWeatherData } from "./src/services/weatherService";

async function run() {
  console.log("Testing weather service...");
  const data = await getWeatherData();
  console.log("Weather data:", data);
}
run();
