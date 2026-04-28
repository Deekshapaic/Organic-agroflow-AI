/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Cloud, 
  MapPin, 
  ShoppingCart, 
  TrendingUp, 
  User, 
  LayoutDashboard, 
  Package, 
  Truck, 
  Settings,
  Bell,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  LogOut,
  Leaf,
  BarChart3,
  Search,
  Plus,
  Menu,
  X,
  LogIn
} from 'lucide-react';
import { UserRole, Crop, Order, Alert, WeatherData, Driver, UserProfile } from './types';
import { getWeatherData, getMockAlerts, getRealTimeAlerts } from './services/weatherService';
import FarmerDashboard from './views/FarmerDashboard';
import WholesalerDashboard from './views/WholesalerDashboard';
import RetailerDashboard from './views/RetailerDashboard';
import AdminDashboard from './views/AdminDashboard';
import DeliveryDashboard from './views/DeliveryDashboard';
import ProfileView from './views/ProfileView';
import AlertsView from './views/AlertsView';
import ChatBot from './components/ChatBot';
import { WeatherWidget, FloatingWeatherWidget } from './components/WeatherWidget';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { firestoreService } from './services/firestoreService';
import { collection, getDocs, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [systemAlerts, setSystemAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [clearedAlertIds, setClearedAlertIds] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  const [sharedCrops, setSharedCrops] = useState<any[]>([]);
  const [sharedOrders, setSharedOrders] = useState<Order[]>([]);
  const [sharedDrivers, setSharedDrivers] = useState<Driver[]>([]);

  const [profile, setProfile] = useState<UserProfile>({
    name: 'User',
    avatar: '',
    address: '123 Default Street, Region',
    phone: '+91 98765 43210',
    totalLand: '45.2',
    landDetails: '',
    coords: [12.9716, 77.5946] as [number, number],
    role: UserRole.FARMER // Default
  });

  const alerts = [...notifications, ...systemAlerts].filter(a => !clearedAlertIds.includes(a.id));

  const formatCurrency = (amountINR: number) => {
    if (currency === 'USD') {
      return `$${(amountINR / 83).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `₹${amountINR.toLocaleString('en-IN')}`;
  };

  const clearAlert = (id: string) => {
    setClearedAlertIds(prev => [...prev, id]);
  };

  const [toast, setToast] = useState<{message: string, show: boolean}>({ message: '', show: false });

  const addNotification = (message: string, severity: 'low'|'high'|'critical' = 'low', type: any = 'opportunity') => {
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      message,
      severity,
      type: type as any,
      timestamp: new Date().toISOString()
    }, ...prev]);
    
    setToast({ message, show: true });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setRole(null);
      setUser(null);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  useEffect(() => {
    console.log("VITE_GEMINI_API_KEY loaded:", !!(import.meta as any).env.VITE_GEMINI_API_KEY);
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load profile from Firestore
        const profileRef = doc(db, 'users', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile;
          setProfile(profileData);
          setRole(profileData.role);
          addNotification(`Welcome back, ${profileData.name || currentUser.displayName || 'User'}!`, 'low', 'opportunity');
        } else {
          // If logged in but no profile, we'll wait for role selection
          console.log("Logged in but no profile found in Firestore.");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    let unsubCrops: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubDrivers: (() => void) | null = null;

    unsubCrops = firestoreService.subscribeToCollection('crops', setSharedCrops);
    unsubOrders = firestoreService.subscribeToCollection('orders', setSharedOrders);
    unsubDrivers = firestoreService.subscribeToCollection('drivers', setSharedDrivers);
    
    // Seed initial data if needed (Public Mode)
    const seedData = async () => {
      try {
        const cropsSnap = await getDocs(collection(db, 'crops'));
        if (cropsSnap.empty) {
          const initialCrops = [
            { name: 'Basmati Rice', type: 'grain', quantity: 120, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-05-15', growthStage: 'Maturation', pricePerUnit: 450, farmerName: 'Ram Singh', farmerId: 'public_farmer', farmerLocation: 'Punjab' },
            { name: 'Wheat', type: 'grain', quantity: 80, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-20', growthStage: 'Seedling', pricePerUnit: 320, farmerName: 'Amit Patel', farmerId: 'public_farmer', farmerLocation: 'Gujarat' },
            { name: 'Sugarcane', type: 'crop', quantity: 200, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-09-10', growthStage: 'Vegetative', pricePerUnit: 150, farmerName: 'Arun Kumar', farmerId: 'public_farmer', farmerLocation: 'Uttar Pradesh' },
            { name: 'Apple', type: 'fruit', quantity: 50, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-10', growthStage: 'Maturation', pricePerUnit: 1200, farmerName: 'Suresh Kumar', farmerId: 'public_farmer', farmerLocation: 'Himachal Pradesh' },
            { name: 'Carrot', type: 'vegetable', quantity: 30, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-20', growthStage: 'Vegetative', pricePerUnit: 250, farmerName: 'Meena Devi', farmerId: 'public_farmer', farmerLocation: 'Rajasthan' },
            { name: 'Beetroot', type: 'vegetable', quantity: 25, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-15', growthStage: 'Maturation', pricePerUnit: 300, farmerName: 'Rahul Verma', farmerId: 'public_farmer', farmerLocation: 'Haryana' },
            { name: 'Tomato', type: 'vegetable', quantity: 40, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-05', growthStage: 'Flowering', pricePerUnit: 180, farmerName: 'Lakshmi Bai', farmerId: 'public_farmer', farmerLocation: 'Karnataka' },
            // Adding 50 more varied crops for global market supply
            { name: 'Mango (Alphonso)', type: 'fruit', quantity: 60, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-20', growthStage: 'Maturation', pricePerUnit: 2500, farmerName: 'Vijay Mali', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Mustard Seeds', type: 'crop', quantity: 45, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-07-05', growthStage: 'Vegetative', pricePerUnit: 550, farmerName: 'Deepak Sharma', farmerId: 'public_farmer', farmerLocation: 'Madhya Pradesh' },
            { name: 'Onion', type: 'vegetable', quantity: 150, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-12', growthStage: 'Maturation', pricePerUnit: 200, farmerName: 'Kishore Kadam', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Potato', type: 'vegetable', quantity: 300, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-15', growthStage: 'Tuber Initiation', pricePerUnit: 120, farmerName: 'Sanjay Gupta', farmerId: 'public_farmer', farmerLocation: 'West Bengal' },
            { name: 'Cotton', type: 'crop', quantity: 90, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-10-25', growthStage: 'Squaring', pricePerUnit: 6000, farmerName: 'Ravindra Singh', farmerId: 'public_farmer', farmerLocation: 'Telangana' },
            { name: 'Grapes', type: 'fruit', quantity: 75, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-03-30', growthStage: 'Maturation', pricePerUnit: 1500, farmerName: 'Nitin Gadkari', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Cauliflower', type: 'vegetable', quantity: 20, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-12', growthStage: 'Curd Formation', pricePerUnit: 400, farmerName: 'Priya Reddy', farmerId: 'public_farmer', farmerLocation: 'Andhra Pradesh' },
            { name: 'Spinach', type: 'vegetable', quantity: 15, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-22', growthStage: 'Maturation', pricePerUnit: 220, farmerName: 'Anita Ghosh', farmerId: 'public_farmer', farmerLocation: 'Assam' },
            { name: 'Maize', type: 'grain', quantity: 110, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-08-18', growthStage: 'Silking', pricePerUnit: 280, farmerName: 'Ramesh Babu', farmerId: 'public_farmer', farmerLocation: 'Bihar' },
            { name: 'Soybean', type: 'crop', quantity: 130, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-09-05', growthStage: 'Pod Fill', pricePerUnit: 420, farmerName: 'Sunil Raut', farmerId: 'public_farmer', farmerLocation: 'Madhya Pradesh' },
            { name: 'Bajra', type: 'grain', quantity: 55, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-05', growthStage: 'Maturation', pricePerUnit: 190, farmerName: 'Gopal Lal', farmerId: 'public_farmer', farmerLocation: 'Rajasthan' },
            { name: 'Jowar', type: 'grain', quantity: 65, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-07-28', growthStage: 'Boot Stage', pricePerUnit: 210, farmerName: 'Kavita Patil', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Black Pepper', type: 'crop', quantity: 10, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-01', growthStage: 'Maturation', pricePerUnit: 4800, farmerName: 'Mathew Abraham', farmerId: 'public_farmer', farmerLocation: 'Kerala' },
            { name: 'Cardamom', type: 'crop', quantity: 5, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-11-15', growthStage: 'Fruiting', pricePerUnit: 12000, farmerName: 'Shanti Pillai', farmerId: 'public_farmer', farmerLocation: 'Kerala' },
            { name: 'Tea Leaves', type: 'crop', quantity: 40, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-25', growthStage: 'Maturation', pricePerUnit: 3500, farmerName: 'Biren Das', farmerId: 'public_farmer', farmerLocation: 'Assam' },
            { name: 'Coffee Beans', type: 'crop', quantity: 35, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-12-20', growthStage: 'Berry Ripening', pricePerUnit: 4200, farmerName: 'Gowda Swamy', farmerId: 'public_farmer', farmerLocation: 'Karnataka' },
            { name: 'Chilli', type: 'vegetable', quantity: 28, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-18', growthStage: 'Maturation', pricePerUnit: 950, farmerName: 'Y.S. Rao', farmerId: 'public_farmer', farmerLocation: 'Andhra Pradesh' },
            { name: 'Ginger', type: 'crop', quantity: 18, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-08-30', growthStage: 'Rhizome Growth', pricePerUnit: 1100, farmerName: 'Zoram Thanga', farmerId: 'public_farmer', farmerLocation: 'Mizoram' },
            { name: 'Turmeric', type: 'crop', quantity: 22, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-03-25', growthStage: 'Maturation', pricePerUnit: 1300, farmerName: 'Selvam Mani', farmerId: 'public_farmer', farmerLocation: 'Tamil Nadu' },
            { name: 'Garlic', type: 'vegetable', quantity: 12, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-05', growthStage: 'Bulb Growth', pricePerUnit: 800, farmerName: 'Hukam Singh', farmerId: 'public_farmer', farmerLocation: 'Himachal Pradesh' },
            { name: 'Cabbage', type: 'vegetable', quantity: 45, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-28', growthStage: 'Head Development', pricePerUnit: 150, farmerName: 'Rekha Devi', farmerId: 'public_farmer', farmerLocation: 'Uttarakhand' },
            { name: 'Brinjal', type: 'vegetable', quantity: 38, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-14', growthStage: 'Maturation', pricePerUnit: 240, farmerName: 'Bibek Roy', farmerId: 'public_farmer', farmerLocation: 'Odisha' },
            { name: 'Lady Finger', type: 'vegetable', quantity: 32, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-15', growthStage: 'Fruiting', pricePerUnit: 350, farmerName: 'Somnath Bharti', farmerId: 'public_farmer', farmerLocation: 'Delhi' },
            { name: 'Capsicum', type: 'vegetable', quantity: 14, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-22', growthStage: 'Vegetative', pricePerUnit: 520, farmerName: 'Vineet Goyal', farmerId: 'public_farmer', farmerLocation: 'Chandigarh' },
            { name: 'Cucumber', type: 'vegetable', quantity: 50, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-20', growthStage: 'Maturation', pricePerUnit: 180, farmerName: 'Dharam Pal', farmerId: 'public_farmer', farmerLocation: 'Haryana' },
            { name: 'Watermelon', type: 'fruit', quantity: 85, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-05', growthStage: 'Maturation', pricePerUnit: 140, farmerName: 'Karthik Raja', farmerId: 'public_farmer', farmerLocation: 'Tamil Nadu' },
            { name: 'Banana', type: 'fruit', quantity: 120, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-07-10', growthStage: 'Fruit Bunching', pricePerUnit: 380, farmerName: 'S. K. Iyer', farmerId: 'public_farmer', farmerLocation: 'Kerala' },
            { name: 'Papaya', type: 'fruit', quantity: 40, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-30', growthStage: 'Fruit Growth', pricePerUnit: 450, farmerName: 'Nagesh Kumar', farmerId: 'public_farmer', farmerLocation: 'Telangana' },
            { name: 'Orange', type: 'fruit', quantity: 95, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-03-20', growthStage: 'Maturation', pricePerUnit: 850, farmerName: 'Manohar Parrikar', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Pineapple', type: 'fruit', quantity: 30, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-08-15', growthStage: 'Fruiting', pricePerUnit: 1100, farmerName: 'Bishnu Prasad', farmerId: 'public_farmer', farmerLocation: 'Tripura' },
            { name: 'Pomegranate', type: 'fruit', quantity: 25, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-09-22', growthStage: 'Fruit Maturity', pricePerUnit: 1800, farmerName: 'Rahul Shinde', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Guava', type: 'fruit', quantity: 55, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-10', growthStage: 'Maturation', pricePerUnit: 420, farmerName: 'Chunnu Singh', farmerId: 'public_farmer', farmerLocation: 'Chhattisgarh' },
            { name: 'Litchi', type: 'fruit', quantity: 12, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-25', growthStage: 'Fruit Ripening', pricePerUnit: 2200, farmerName: 'Lalu Prasad', farmerId: 'public_farmer', farmerLocation: 'Bihar' },
            { name: 'Coconut', type: 'crop', quantity: 500, unit: 'Hundreds', status: 'harvested', estimatedHarvestDate: '2026-04-01', growthStage: 'Maturation', pricePerUnit: 2500, farmerName: 'Raghu Rama', farmerId: 'public_farmer', farmerLocation: 'Andhra Pradesh' },
            { name: 'Areca Nut', type: 'crop', quantity: 15, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-10-10', growthStage: 'Developing', pricePerUnit: 45000, farmerName: 'Bopaiah K.', farmerId: 'public_farmer', farmerLocation: 'Karnataka' },
            { name: 'Cashew Nut', type: 'crop', quantity: 20, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-15', growthStage: 'Maturation', pricePerUnit: 12000, farmerName: 'Goel Pinto', farmerId: 'public_farmer', farmerLocation: 'Goa' },
            { name: 'Rubber', type: 'crop', quantity: 8, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-20', growthStage: 'Maturation', pricePerUnit: 18000, farmerName: 'Kurien Joseph', farmerId: 'public_farmer', farmerLocation: 'Kerala' },
            { name: 'Tobacco', type: 'crop', quantity: 40, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-08-05', growthStage: 'Curing Stage', pricePerUnit: 2200, farmerName: 'Venkata Swamy', farmerId: 'public_farmer', farmerLocation: 'Andhra Pradesh' },
            { name: 'Saffron', type: 'crop', quantity: 0.1, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-11-20', growthStage: 'Maturation', pricePerUnit: 1800000, farmerName: 'Muzaffar Baig', farmerId: 'public_farmer', farmerLocation: 'Jammu & Kashmir' },
            { name: 'Barley', type: 'grain', quantity: 35, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-10', growthStage: 'Heading', pricePerUnit: 290, farmerName: 'Surjeet Singh', farmerId: 'public_farmer', farmerLocation: 'Punjab' },
            { name: 'Sunflower Seeds', type: 'crop', quantity: 42, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-07-15', growthStage: 'Seed Filling', pricePerUnit: 750, farmerName: 'Sanjay Dutt', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Sesame Seeds', type: 'crop', quantity: 18, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-03-28', growthStage: 'Maturation', pricePerUnit: 1400, farmerName: 'Lalit Modi', farmerId: 'public_farmer', farmerLocation: 'Gujarat' },
            { name: 'Groundnut', type: 'crop', quantity: 120, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-10-05', growthStage: 'Pod Setting', pricePerUnit: 650, farmerName: 'Harish Rawat', farmerId: 'public_farmer', farmerLocation: 'Gujarat' },
            { name: 'Chickpea', type: 'grain', quantity: 140, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-10', growthStage: 'Maturation', pricePerUnit: 520, farmerName: 'Vasudev Singh', farmerId: 'public_farmer', farmerLocation: 'Madhya Pradesh' },
            { name: 'Green Gram', type: 'grain', quantity: 30, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-06-30', growthStage: 'Vegetative', pricePerUnit: 850, farmerName: 'Uma Bharti', farmerId: 'public_farmer', farmerLocation: 'Uttar Pradesh' },
            { name: 'Black Gram', type: 'grain', quantity: 35, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-04-05', growthStage: 'Maturation', pricePerUnit: 920, farmerName: 'Pawan Kalyan', farmerId: 'public_farmer', farmerLocation: 'Andhra Pradesh' },
            { name: 'Lentil', type: 'grain', quantity: 28, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-05-20', growthStage: 'Pod Development', pricePerUnit: 780, farmerName: 'Nitish Kumar', farmerId: 'public_farmer', farmerLocation: 'Bihar' },
            { name: 'Arhar/Tur Dal', type: 'grain', quantity: 95, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-12-15', growthStage: 'Flowering', pricePerUnit: 1050, farmerName: 'Sushil Modi', farmerId: 'public_farmer', farmerLocation: 'Maharashtra' },
            { name: 'Peas', type: 'vegetable', quantity: 25, unit: 'Tons', status: 'harvested', estimatedHarvestDate: '2026-03-30', growthStage: 'Maturation', pricePerUnit: 580, farmerName: 'J.P. Nadda', farmerId: 'public_farmer', farmerLocation: 'Himachal Pradesh' },
            { name: 'Sweet Potato', type: 'vegetable', quantity: 60, unit: 'Tons', status: 'growing', estimatedHarvestDate: '2026-09-12', growthStage: 'Tuber Development', pricePerUnit: 160, farmerName: 'B. S. Yediyurappa', farmerId: 'public_farmer', farmerLocation: 'Odisha' },
          ];
          for (const c of initialCrops) await addDoc(collection(db, 'crops'), c);
        }

        const ordersSnap = await getDocs(collection(db, 'orders'));
        if (ordersSnap.empty) {
          const initialOrders = [
            { cropName: 'Apple', quantity: 5, status: 'requested', buyerName: 'Big Mart Retail', date: new Date().toISOString(), valueINR: 6000, farmerName: 'Suresh Kumar', farmerId: 'public_farmer', wholesalerId: 'public_wholesaler' },
            { cropName: 'Tomato', quantity: 12, status: 'accepted', buyerName: 'Fresh Veggies Co', date: new Date().toISOString(), valueINR: 2160, farmerName: 'Lakshmi Bai', farmerId: 'public_farmer', wholesalerId: 'public_wholesaler' },
            { cropName: 'Carrot', quantity: 8, status: 'shipped', buyerName: 'Organic Hub', date: new Date().toISOString(), valueINR: 2000, farmerName: 'Meena Devi', farmerId: 'public_farmer', wholesalerId: 'public_wholesaler' },
            { cropName: 'Beetroot', quantity: 15, status: 'requested', buyerName: 'Healthy Salads', date: new Date().toISOString(), valueINR: 4500, farmerName: 'Rahul Verma', farmerId: 'public_farmer', retailerId: 'public_retailer' }
          ];
          for (const o of initialOrders) await addDoc(collection(db, 'orders'), o);
        }

        const d1Snap = await getDoc(doc(db, 'drivers', 'd1'));
        if (!d1Snap.exists()) {
          const initialDrivers = [
            { name: 'Rajesh Kumar', rating: 4.8, experience: '5 years', phone: '+91 98765 43210', status: 'Available', id: 'd1' },
            { name: 'Suresh Raina', rating: 4.9, experience: '3 years', phone: '+91 98765 43211', status: 'In Transit', id: 'd2' }
          ];
          for (const d of initialDrivers) await setDoc(doc(db, 'drivers', d.id), d);
        }
      } catch (e) {
        console.error("Seeding failed:", e);
      }
    };
    seedData();

    return () => {
      unsubAuth();
      unsubCrops?.();
      unsubOrders?.();
      unsubDrivers?.();
    };
  }, []);

  const refreshAlertsAndWeather = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setProfile(prev => ({ ...prev, coords: [lat, lng] }));
          getRealTimeAlerts(lat.toString(), lng.toString()).then(setSystemAlerts);
          getWeatherData(lat.toString(), lng.toString()).then(setWeather);
        },
        (error) => {
          console.warn("Geolocation denied or error in App, using profile address", error);
          const loc = profile?.address || 'Bengaluru';
          getRealTimeAlerts(undefined, undefined, loc).then(setSystemAlerts);
          getWeatherData(undefined, undefined, loc).then(setWeather);
        }
      );
    } else {
      const loc = profile?.address || 'Bengaluru';
      getRealTimeAlerts(undefined, undefined, loc).then(setSystemAlerts);
      getWeatherData(undefined, undefined, loc).then(setWeather);
    }
  };

  useEffect(() => {
    refreshAlertsAndWeather();
  }, [profile?.address]);

  const handleRoleSelect = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setCurrentTab('Dashboard');
    
    let defaultAddress = '123 Default Street, Region';
    let defaultCoords: [number, number] = [12.9716, 77.5946];

    if (selectedRole === UserRole.WHOLESALER) {
      defaultAddress = 'Vashi APMC Market, Navi Mumbai, Maharashtra 400703';
      defaultCoords = [19.0760, 72.9989]; 
    }

    const newProfile: UserProfile = {
      uid: user?.uid,
      id: user?.uid || `public_${selectedRole}`,
      name: user?.displayName || `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} User`,
      avatar: user?.photoURL || '',
      address: defaultAddress,
      phone: '+91 98765 43210',
      totalLand: '45.2',
      landDetails: '',
      coords: defaultCoords,
      role: selectedRole,
      email: user?.email || undefined
    };

    setProfile(newProfile);

    // Persist to Firestore if user is authenticated
    if (user?.uid) {
      await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
      addNotification(`Profile synchronized with ${selectedRole} account.`, 'low', 'opportunity');
    }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    if (user?.uid) {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      addNotification("Profile updated successfully in cloud storage.", "low", "opportunity");
    }
  };

  const [isDriverRegisterOpen, setIsDriverRegisterOpen] = useState(false);
  const [driverRegForm, setDriverRegForm] = useState({ name: '', phone: '', experience: '1-3 Years' });

  const handleDriverRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate adding to a queue for Admin
    addNotification(`Your driver registration for ${driverRegForm.name} has been submitted for Admin approval.`, 'high', 'logistics');
    setIsDriverRegisterOpen(false);
  };

  const handleAddCrop = async (crop: any) => {
    await firestoreService.addDocument('crops', { ...crop, farmerId: user?.uid });
  };

  const handleUpdateCrop = async (cropId: string, data: any) => {
    await firestoreService.updateDocument('crops', cropId, data);
  };

  const handleAddOrder = async (order: any) => {
    await firestoreService.addDocument('orders', order);
  };

  const handleUpdateOrder = async (orderId: string, data: any) => {
    await firestoreService.updateDocument('orders', orderId, data);
  };

  const handleDeleteOrder = async (orderId: string) => {
    await firestoreService.deleteDocument('orders', orderId);
  };

  const handleUpdateDriver = async (driverId: string, data: any) => {
    await firestoreService.updateDocument('drivers', driverId, data);
  };

  const handleAddDriver = async (driver: any) => {
    await firestoreService.addDocument('drivers', driver);
  };

  const handleDeleteDriver = async (driverId: string) => {
    await firestoreService.deleteDocument('drivers', driverId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-main border-t-transparent rounded-full animate-spin" />
          <p className="text-emerald-main font-black tracking-widest uppercase text-xs">Organic Agroflow Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-[#020403] text-white flex items-center justify-center p-6 relative overflow-hidden hero-gradient">
        {/* Background Atmosphere */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[50rem] h-[50rem] bg-emerald-main/10 blur-[180px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-emerald-main/15 blur-[150px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl w-full z-10"
        >
          <div className="text-center mb-16 space-y-4">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-main animate-ping" />
              <span className="text-emerald-main font-black tracking-[0.2em] uppercase text-[10px]">Organic Intelligence • Public Node</span>
            </motion.div>
            <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tighter leading-[0.85] text-white uppercase italic">
              ORGANIC<br />
              <span className="text-emerald-main not-italic text-gradient">AGROFLOW</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed uppercase tracking-[0.25em]">
              Next-Gen <span className="text-white">Sustainable</span> Agriculture
            </p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
            <RoleCard 
              title="Farmer" 
              desc="Cultivate yields with AI soil health & market price predictions." 
              icon={<Leaf className="w-6 h-6" />} 
              onClick={() => handleRoleSelect(UserRole.FARMER)}
              color="emerald"
              bgImage="https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800"
            />
            <RoleCard 
              title="Wholesaler" 
              desc="Orchestrate regional supply & seasonal demand forecasting." 
              icon={<ShoppingCart className="w-6 h-6" />} 
              onClick={() => handleRoleSelect(UserRole.WHOLESALER)}
              color="emerald"
              bgImage="https://images.unsplash.com/photo-1516322311271-4c680fd0bf33?auto=format&fit=crop&q=80&w=800"
            />
            <RoleCard 
              title="Retailer" 
              desc="Procure stock and manage high-velocity branch sales." 
              icon={<ShoppingCart className="w-6 h-6" />} 
              onClick={() => handleRoleSelect(UserRole.RETAILER)}
              color="emerald"
              bgImage="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
            />
            <RoleCard 
              title="Admin" 
              desc="Govern system consensus & driver recruitment protocols." 
              icon={<Settings className="w-6 h-6" />} 
              onClick={() => handleRoleSelect(UserRole.ADMIN)}
              color="emerald"
              bgImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800"
            />
            <RoleCard 
              title="Logistics Agent" 
              desc="Optimize delivery paths using AI smart-dispatch nodes." 
              icon={<Truck className="w-6 h-6" />} 
              onClick={() => handleRoleSelect(UserRole.DELIVERY)}
              color="emerald"
              bgImage="https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=800"
            />
            <motion.div 
              whileHover={{ y: -8, scale: 1.01 }}
              className="glass p-8 flex flex-col justify-center items-center text-center border-dashed border-emerald-main/30 hover:border-emerald-main/60 transition-all cursor-pointer group rounded-[2.5rem] bg-emerald-main/5" 
              onClick={() => setIsDriverRegisterOpen(true)}
            >
               <div className="w-16 h-16 bg-emerald-main/10 rounded-2xl flex items-center justify-center text-emerald-main mb-6 group-hover:bg-emerald-main group-hover:text-black transition-all duration-500">
                  <Plus size={32} strokeWidth={3} />
               </div>
               <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Join the Fleet</h3>
               <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold leading-relaxed">
                  Apply as a <span className="text-emerald-main">Logistics partner</span><br />for regional node access.
               </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Registration Modal */}
        <AnimatePresence>
          {isDriverRegisterOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDriverRegisterOpen(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg glass p-10 border-emerald-main/30 rounded-[3rem]"
              >
                <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Fleet Enrollment</h3>
                <p className="text-slate-500 text-sm mb-8 font-medium">Connect your assets to the FairFlow network.</p>
                
                <form onSubmit={handleDriverRegistration} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-main/50 transition-all font-bold"
                      value={driverRegForm.name}
                      onChange={e => setDriverRegForm({...driverRegForm, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contact Terminal</label>
                      <input 
                        required
                        type="tel" 
                        placeholder="+91"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-main/50 transition-all font-bold"
                        value={driverRegForm.phone}
                        onChange={e => setDriverRegForm({...driverRegForm, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Exp Rank</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-main/50 transition-all font-bold appearance-none"
                        value={driverRegForm.experience}
                        onChange={e => setDriverRegForm({...driverRegForm, experience: e.target.value})}
                      >
                        <option value="Entry Level" className="bg-[#020403]">Entry Level</option>
                        <option value="1-3 Years" className="bg-[#020403]">1-3 Years</option>
                        <option value="3-5 Years" className="bg-[#020403]">3-5 Years</option>
                        <option value="5+ Years" className="bg-[#020403]">5+ Years</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-6">
                    <button type="submit" className="w-full bg-emerald-main text-black py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Dispatch Application
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-[#f8fafc] flex">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -280,
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 bottom-0 w-[240px] bg-[#080c0b] border-r border-border-main flex flex-col z-[70] h-screen shadow-2xl"
      >
        <div className="p-5 flex items-center justify-between border-b border-border-main">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-main flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tighter text-white uppercase italic">ORGANIC <span className="text-emerald-main not-italic">AGROFLOW</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {['Dashboard', 'Inventory', 'Logistics', 'Analytics', 'Map View', 'Profile', 'News Feed']
            .filter(tab => {
              if (role === UserRole.DELIVERY) return !['Logistics', 'Map View', 'Inventory'].includes(tab);
              if (role === UserRole.WHOLESALER) return tab !== 'Map View';
              if (role === UserRole.RETAILER) return !['Logistics', 'Map View'].includes(tab);
              return true;
            })
            .map((tab) => (
            <NavItem 
              key={tab}
              icon={
                tab === 'Dashboard' ? <LayoutDashboard /> :
                tab === 'Inventory' ? <Package /> :
                tab === 'Logistics' ? <Truck /> :
                tab === 'Analytics' ? <BarChart3 /> :
                tab === 'Profile' ? <User /> :
                tab === 'Map View' ? <MapPin /> :
                tab === 'News Feed' ? <Bell /> : <Bell />
              } 
              label={tab} 
              active={currentTab === tab} 
              onClick={() => {
                setCurrentTab(tab);
                setSidebarOpen(false);
              }}
              count={tab === 'News Feed' ? alerts.filter(a => a.type === 'news').length : undefined}
              isSidebarOpen={true}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setRole(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Switch Role</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 bg-bg-dark relative overflow-y-auto h-screen scrollbar-hide w-full">
        <header className="h-[60px] border-b border-border-main flex items-center justify-between px-6 sticky top-0 bg-bg-dark/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4 text-[#94a3b8]">
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-2 border border-white/10 active:scale-95">
              <Menu size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Menu</span>
            </button>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
              <span className="text-emerald-main">Dashboard</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-white capitalize">{role}</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-slate-400 capitalize">{currentTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <LanguageSelector />
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 mr-2">
              <button 
                onClick={() => setCurrency('INR')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${currency === 'INR' ? 'bg-emerald-main text-black shadow-lg' : 'text-[#94a3b8] hover:text-white'}`}
              >
                INR
              </button>
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${currency === 'USD' ? 'bg-emerald-main text-black shadow-lg' : 'text-[#94a3b8] hover:text-white'}`}
              >
                USD
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-emerald-main/10 px-3 py-1 rounded-full border border-emerald-main/20 text-[11px]">
              <span className="text-emerald-main animate-pulse">●</span> FairFlow AI Status: <span className="text-emerald-main font-black">Online</span>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-border-main cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentTab('Profile')}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold">{profile.name}</p>
                <p className="text-[10px] text-emerald-main font-bold uppercase tracking-wider leading-none">Verified {role}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-main/20 flex items-center justify-center border border-emerald-main/30 text-emerald-main font-bold overflow-hidden shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile.name?.charAt(0).toUpperCase() || role.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${currentTab}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentTab === 'Profile' ? (
                <ProfileView 
          profile={profile} 
          setProfile={handleUpdateProfile} 
          role={role} 
        />
              ) : currentTab === 'Alerts' || currentTab === 'News Feed' ? (
                <AlertsView 
                  alerts={alerts.filter(a => a.type === 'news')} 
                  orders={role === UserRole.FARMER ? sharedOrders.filter(o => o.status === 'requested') : []}
                  crops={sharedCrops} 
                  setOrders={setSharedOrders} 
                  role={role} 
                  clearAlert={clearAlert}
                />
              ) : (
                <>
                  {role === UserRole.FARMER && (
                    <FarmerDashboard 
                      currentTab={currentTab} 
                      setCurrentTab={setCurrentTab} 
                      crops={sharedCrops} 
                      setCrops={setSharedCrops} 
                      handleAddCrop={handleAddCrop}
                      handleUpdateCrop={handleUpdateCrop}
                      profile={profile} 
                      alerts={alerts} 
                      refreshAlerts={refreshAlertsAndWeather} 
                      weather={weather} 
                      orders={sharedOrders} 
                      setOrders={setSharedOrders} 
                      handleAddOrder={handleAddOrder}
                      handleUpdateOrder={handleUpdateOrder}
                      handleDeleteOrder={handleDeleteOrder}
                      addNotification={addNotification} 
                      clearAlert={clearAlert}
                      drivers={sharedDrivers}
                      handleAddDriver={handleAddDriver}
                      handleUpdateDriver={handleUpdateDriver}
                      handleDeleteDriver={handleDeleteDriver}
                      formatCurrency={formatCurrency}
                    />
                  )}
                  {role === UserRole.WHOLESALER && (
                    <WholesalerDashboard 
                      currentTab={currentTab} 
                      setCurrentTab={setCurrentTab} 
                      crops={sharedCrops} 
                      orders={sharedOrders} 
                      setOrders={setSharedOrders} 
                      handleAddOrder={handleAddOrder}
                      handleUpdateOrder={handleUpdateOrder}
                      profile={profile} 
                      addNotification={addNotification} 
                      alerts={alerts} 
                      clearAlert={clearAlert} 
                      formatCurrency={formatCurrency} 
                    />
                  )}
                  {role === UserRole.RETAILER && (
                    <RetailerDashboard 
                      currentTab={currentTab} 
                      setCurrentTab={setCurrentTab} 
                      crops={sharedCrops} 
                      setCrops={setSharedCrops} 
                      orders={sharedOrders} 
                      setOrders={setSharedOrders} 
                      handleAddOrder={handleAddOrder}
                      handleUpdateOrder={handleUpdateOrder}
                      handleDeleteOrder={handleDeleteOrder}
                      profile={profile} 
                      addNotification={addNotification} 
                      alerts={alerts} 
                      clearAlert={clearAlert} 
                      formatCurrency={formatCurrency} 
                    />
                  )}
                  {role === UserRole.ADMIN && (
                    <AdminDashboard 
                      currentTab={currentTab} 
                      crops={sharedCrops} 
                      formatCurrency={formatCurrency} 
                      drivers={sharedDrivers}
                      setDrivers={setSharedDrivers}
                      handleAddDriver={handleAddDriver}
                      handleUpdateDriver={handleUpdateDriver}
                      handleDeleteDriver={handleDeleteDriver}
                      orders={sharedOrders}
                      setOrders={setSharedOrders}
                      handleUpdateOrder={handleUpdateOrder}
                      addNotification={addNotification}
                      users={[
                        { id: 'f1', name: 'Ram Singh', role: 'farmer', status: 'Active', location: 'Punjab' },
                        { id: 'f2', name: 'Amit Patel', role: 'farmer', status: 'Active', location: 'Gujarat' },
                        { id: 'w1', name: 'Delhi Wholesale Hub', role: 'wholesaler', status: 'Active', location: 'Delhi' },
                        { id: 'r1', name: 'Premium Veggies Store', role: 'retailer', status: 'Active', location: 'Mumbai' },
                        { id: 'd1', name: 'Rajesh Kumar', role: 'delivery', status: 'Active', location: 'In Transit' },
                      ]}
                    />
                  )}
                  {role === UserRole.DELIVERY && (
                    <DeliveryDashboard 
                      currentTab={currentTab} 
                      orders={sharedOrders} 
                      setOrders={setSharedOrders} 
                      handleUpdateOrder={handleUpdateOrder}
                      crops={sharedCrops} 
                      addNotification={addNotification} 
                      drivers={sharedDrivers}
                      setDrivers={setSharedDrivers}
                      handleUpdateDriver={handleUpdateDriver}
                      profile={profile}
                      formatCurrency={formatCurrency}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Global Weather Widget below dashboards */}
          {currentTab !== 'Profile' && (
            role === UserRole.FARMER ? (
              <div className="mt-8 pt-4">
                <WeatherWidget weather={weather} />
              </div>
            ) : (
              <FloatingWeatherWidget weather={weather} />
            )
          )}
        </div>

        <ChatBot 
          currentRole={role} 
          crops={sharedCrops} 
          orders={sharedOrders} 
          setOrders={setSharedOrders} 
          handleAddOrder={handleAddOrder}
          handleUpdateOrder={handleUpdateOrder}
          addNotification={addNotification} 
        />
      </main>

      {/* Global Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-main text-bg-dark px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-main/20 flex items-center gap-2 text-sm max-w-[90%] w-max text-center"
          >
            <Bell size={16} className="shrink-0" />
            <span className="truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleCard({ title, desc, icon, onClick, color, bgImage }: any) {
  const colors: any = {
    emerald: 'hover:border-emerald-main/50 hover:bg-emerald-main/10 group-hover:text-emerald-main',
  };

  return (
    <motion.button
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group text-left p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl border border-white/5 transition-all duration-500 card-hover shadow-2xl relative overflow-hidden`}
    >
      {/* Background Image Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
        <img src={bgImage} alt="" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000" />
      </div>

      <div className="relative z-10">
        <div className={`w-16 h-16 rounded-2xl bg-emerald-main/10 flex items-center justify-center mb-8 transition-all duration-500 group-hover:bg-emerald-main group-hover:text-black`}>
          {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
        </div>
        <h3 className="text-2xl font-black mb-3 text-white tracking-tight group-hover:text-emerald-light transition-colors uppercase italic">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 group-hover:text-slate-200 transition-colors uppercase tracking-wider font-medium">{desc}</p>
        
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-main opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-500">
          Enter Network <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </motion.button>
  );
}

function NavItem({ icon, label, active, count, onClick, isSidebarOpen }: any) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} className={`w-full flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} px-3 py-2.5 rounded-lg transition-all duration-200 group ${active ? 'bg-emerald-deep text-emerald-main' : 'text-[#94a3b8] hover:text-white hover:bg-white/5'}`}>
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { size: 18, className: "flex-shrink-0" })}
        {isSidebarOpen && <span className="font-medium text-sm">{t(label)}</span>}
      </div>
      {isSidebarOpen && count && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-main text-black' : 'bg-emerald-main/20 text-emerald-main'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function LanguageSelector() {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase font-bold text-[#94a3b8] hidden md:block">{t("Select Language")}:</span>
      <select 
        value={i18n.language} 
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg text-[11px] px-2 py-1 text-white focus:outline-none"
      >
        <option value="en">English</option>
        <option value="kn">Kannada</option>
        <option value="hi">Hindi</option>
        <option value="ta">Tamil</option>
      </select>
    </div>
  );
}
