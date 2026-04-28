/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  FARMER = 'farmer',
  WHOLESALER = 'wholesaler',
  RETAILER = 'retailer',
  ADMIN = 'admin',
  DELIVERY = 'delivery',
}

export interface UserProfile {
  uid?: string;
  id?: string;
  name: string;
  avatar?: string;
  address: string;
  phone: string;
  role: UserRole;
  totalLand?: string;
  landDetails?: string;
  coords: [number, number];
  email?: string;
  createdAt?: number;
}

export interface WeatherData {
  temp: number;
  condition: string;
  rainProbability: number;
  humidity?: number;
  locationName?: string;
  forecast: Array<{
    day: string;
    temp: number;
    condition: string;
  }>;
}

export interface Crop {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  status: 'growing' | 'harvested' | 'dispatched' | 'delivered' | 'sold';
  expiryTime?: number; // timestamp
  pricePerUnit: number;
  estimatedHarvestDate?: string;
  growthStage?: string;
  farmerName?: string;
  farmerLocation?: string;
}

export interface Order {
  id: string;
  cropId: string;
  cropName?: string;
  cropUnit?: string;
  farmerId?: string;
  buyerName?: string;
  wholesalerId?: string;
  retailerId?: string;
  sellerRole?: 'farmer' | 'wholesaler' | 'retailer';
  buyerRole?: 'wholesaler' | 'retailer';
  quantity: number;
  status: 'requested' | 'accepted' | 'pending_delivery_acceptance' | 'shipped' | 'received' | 'delivered' | 'rejected' | 'emergency_requested' | 'logistics_assigned' | 'negotiating' | 'completed' | 'instant_sell_requested';
  rejectionReason?: string;
  dispatchTime?: number;
  estimatedDelivery?: number;
  currentLocation?: { lat: number; lng: number };
  valueINR?: number; 
  negotiatedPrice?: number;
  retailerStatus?: 'pending' | 'accepted' | 'rejected';
  transportationCharges?: number;
  driverName?: string;
  driverId?: string;
  otp?: string;
  isPickedUp?: boolean;
  pickedUpAt?: number;
  viabilityDeadline?: number;
  farmerCoords?: [number, number];
  wholesalerCoords?: [number, number];
  retailerCoords?: [number, number];
  retailerAddress?: string;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  experience: string;
  phone: string;
  status: 'Available' | 'In Transit' | 'On Break' | 'Offline' | 'Pending';
  availability?: boolean;
  orders?: Order[];
}

export interface Alert {
  id: string;
  type: 'flood' | 'drought' | 'demand' | 'opportunity' | 'news';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string | number;
  imageUrl?: string;
  articleUrl?: string;
}

export interface RevenueData {
  period: string;
  revenue: number;
  profit?: number;
  yield?: number;
}
