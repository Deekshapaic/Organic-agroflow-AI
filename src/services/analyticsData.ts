import { RevenueData, WeatherData, Order, Crop } from '../types';

// Expanded Revenue Data for deeper analytics
export const getExpandedRevenue = () => [
  { period: 'Jan', revenue: 4200, profit: 1200, yield: 85 },
  { period: 'Feb', revenue: 3800, profit: 1100, yield: 82 },
  { period: 'Mar', revenue: 2500, profit: 800, yield: 78 },
  { period: 'Apr', revenue: 3200, profit: 1500, yield: 88 },
  { period: 'May', revenue: 1900, profit: 900, yield: 80 },
  { period: 'Jun', revenue: 2600, profit: 1300, yield: 84 },
  { period: 'Jul', revenue: 3800, profit: 1800, yield: 91 },
  { period: 'Aug', revenue: 4500, profit: 2100, yield: 94 },
  { period: 'Sep', revenue: 4100, profit: 1900, yield: 92 },
  { period: 'Oct', revenue: 3200, profit: 1400, yield: 87 },
  { period: 'Nov', revenue: 2800, profit: 1100, yield: 83 },
  { period: 'Dec', revenue: 3500, profit: 1600, yield: 89 },
];

// Weather Forecast Data
export const getWeatherForecast = () => [
  { day: 'Mon', temp: 28, humidity: 65, rainProb: 10 },
  { day: 'Tue', temp: 29, humidity: 62, rainProb: 5 },
  { day: 'Wed', temp: 27, humidity: 70, rainProb: 40 },
  { day: 'Thu', temp: 26, humidity: 75, rainProb: 80 },
  { day: 'Fri', temp: 25, humidity: 72, rainProb: 60 },
  { day: 'Sat', temp: 27, humidity: 68, rainProb: 20 },
  { day: 'Sun', temp: 29, humidity: 64, rainProb: 5 },
];

// Market Demand Data per Crop
export const getMarketDemand = () => [
  { crop: 'Basmati Rice', demand: 92, supply: 65, priceTrend: 12 },
  { crop: 'Soybeans', demand: 85, supply: 80, priceTrend: -2 },
  { crop: 'Wheat', demand: 78, supply: 90, priceTrend: -5 },
  { crop: 'Cotton', demand: 95, supply: 40, priceTrend: 18 },
  { crop: 'Sugarcane', demand: 88, supply: 85, priceTrend: 4 },
];

// Logistics Velocity Data
export const getLogisticsVelocity = () => [
  { label: 'Sector 1', time: 42, efficiency: 94 },
  { label: 'Sector 2', time: 58, efficiency: 88 },
  { label: 'Sector 3', time: 35, efficiency: 97 },
  { label: 'Sector 4', time: 65, efficiency: 82 },
  { label: 'Sector 5', time: 48, efficiency: 91 },
];

export const getRegionalGrowth = () => [
  { region: 'North', growth: 12.5 },
  { region: 'South', growth: 8.4 },
  { region: 'East', growth: -2.3 },
  { region: 'West', growth: 15.1 },
  { region: 'Central', growth: 5.7 },
];
