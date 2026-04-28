import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AICropGuide } from '../components/AICropGuide';
import { OrganicComplianceNode } from '../components/OrganicComplianceNode';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  TrendingUp, 
  AlertTriangle, 
  Leaf, 
  Plus,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  RefreshCw,
  X,
  Truck
} from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { getWeatherData, getMockAlerts } from '../services/weatherService';
import { WeatherData, Alert, RevenueData, Order, Driver } from '../types';
import { ActionModal } from '../components/ActionModal';
import { getExpandedRevenue, getWeatherForecast, getMarketDemand } from '../services/analyticsData';
import FarmerInventory from './FarmerInventory';
import FarmerLogistics from './FarmerLogistics';
import FarmerAnalytics from './FarmerAnalytics';
import LogisticsMap from '../components/LogisticsMap';
import ActiveShipmentTracker from '../components/ActiveShipmentTracker';

export default function FarmerDashboard({ 
  currentTab, 
  setCurrentTab, 
  crops, 
  setCrops, 
  handleUpdateCrop,
  handleAddCrop,
  profile, 
  alerts = [], 
  refreshAlerts, 
  weather, 
  orders = [], 
  setOrders, 
  handleUpdateOrder,
  handleAddOrder,
  handleDeleteOrder,
  addNotification,
  clearAlert,
  drivers = [],
  handleAddDriver,
  handleUpdateDriver,
  handleDeleteDriver,
  formatCurrency
}: { 
  currentTab: string, 
  setCurrentTab?: (tab: string) => void, 
  crops?: any[], 
  setCrops?: any, 
  handleUpdateCrop?: (id: string, data: any) => Promise<void>,
  handleAddCrop?: (data: any) => Promise<void>,
  profile?: any, 
  alerts?: Alert[], 
  refreshAlerts?: () => void, 
  weather?: WeatherData | null, 
  orders?: Order[], 
  setOrders?: any, 
  handleUpdateOrder?: (id: string, data: any) => Promise<void>,
  handleAddOrder?: (data: any) => Promise<void>,
  handleDeleteOrder?: (id: string) => Promise<void>,
  addNotification?: (message: string, severity?: 'low'|'high'|'critical', type?: string) => void,
  clearAlert?: (id: string) => void,
  drivers?: Driver[],
  handleAddDriver?: (data: any) => Promise<void>,
  handleUpdateDriver?: (id: string, data: any) => Promise<void>,
  handleDeleteDriver?: (id: string) => Promise<void>,
  formatCurrency: (amountINR: number) => string
}) {
  const { t } = useTranslation();
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string, actionFn?: () => void}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });

  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState(t('Rejection Reason Default'));

  const liveOrdersCount = orders.filter(o => o.status === 'accepted' || o.status === 'requested').length;
  const dispatchRevenueINR = orders.filter(o => o.status === 'shipped' || o.status === 'received')
    .reduce((acc, order) => acc + (order.valueINR || 0), 0);

  const expandedRevenue = getExpandedRevenue();
  const weatherForecast = getWeatherForecast();
  const [marketDemand, setMarketDemand] = useState(getMarketDemand());

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketDemand(prev => prev.map(item => ({
        ...item,
        demand: Math.min(100, Math.max(0, item.demand + (Math.random() - 0.5) * 10))
      })));
    }, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAcceptOrder = (orderId: string) => {
    if (handleUpdateOrder) {
      handleUpdateOrder(orderId, { status: 'accepted' });
      addNotification?.("Order accepted successfully!", "low", "demand");
    }
  };

  const handleRejectOrder = () => {
    if (orderToReject && handleUpdateOrder) {
      handleUpdateOrder(orderToReject.id, { 
        status: 'rejected', 
        rejectionReason: rejectionReason,
        negotiatedPrice: orderToReject.valueINR
      });
      setOrderToReject(null);
      addNotification?.(`Order for ${orderToReject.cropName} declined. Counter-offer sent: ${orderToReject.valueINR} INR.`, "high", "demand");
    }
  };  
  if (currentTab === 'Inventory') {
    return <FarmerInventory crops={crops} setCrops={handleUpdateCrop} handleAddCrop={handleAddCrop} profile={profile} orders={orders} setOrders={handleAddOrder} addNotification={addNotification} formatCurrency={formatCurrency} role="farmer" />;
  }

  if (currentTab === 'Logistics') {
    return <FarmerLogistics orders={orders} setOrders={(id: string, data: any) => handleUpdateOrder?.(id, data)} crops={crops} addNotification={addNotification} drivers={drivers} formatCurrency={formatCurrency} profile={profile} setCurrentTab={setCurrentTab} />;
  }

  if (currentTab === 'Analytics') {
    return <FarmerAnalytics />;
  }

  if (currentTab === 'Map View') {
    const farmerCoords = profile?.coords || [28.7041, 77.1025];
    const wholesalerCoords: [number, number] = [19.0760, 72.9989]; // Mumbai
    return (
      <div className="h-[80vh] w-full rounded-[2.5rem] overflow-hidden p-2 bg-white/5 border border-white/10">
        <LogisticsMap 
          farmerCoords={farmerCoords as [number, number]} 
          wholesalerCoords={wholesalerCoords} 
          isPickedUp={false} 
          activeOrders={orders}
        />
      </div>
    );
  }

  if (currentTab !== 'Dashboard') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-2">{currentTab} Module</h2>
        <p className="text-[#94a3b8]">This module is currently in development.</p>
        <button className="mt-6 px-4 py-2 bg-emerald-main text-black rounded-lg font-bold">Request Early Access</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Welcome Block */}
        <div className="lg:col-span-8 glass p-10 relative overflow-hidden flex flex-col justify-center min-h-[280px] rounded-[2.5rem]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-main/5 blur-[120px] rounded-full pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10"
          >
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-6">
               <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
               <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">{t("Field Scan Active")}</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4 leading-none">
              {t("Good morning")}, <span className="text-emerald-main italic">{profile?.name?.split(' ')[0] || t('Farmer')}</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
              {t("Your agricultural ecosystem is performing at")} <span className="text-white">{t("peak efficiency")}</span>. {t("AI monitoring suggests optimal soil nitrogen levels for the current cycle.")}
            </p>
            <div className="flex gap-4 mt-8">
               <button onClick={() => setCurrentTab?.('Inventory')} className="px-6 py-3 bg-emerald-main text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-main/20 hover:scale-105 active:scale-95 transition-all">
                  {t("Asset Inventory")}
               </button>
               <button onClick={() => setCurrentTab?.('Logistics')} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                  {t("Fleet Status")}
               </button>
            </div>
          </motion.div>
        </div>

        {/* Climate Monitoring Block */}
        <div className="lg:col-span-4 glass p-8 flex flex-col justify-between relative overflow-hidden rounded-[2.5rem] bg-emerald-main/[0.02] border-emerald-main/10">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-emerald-main uppercase tracking-[0.2em] mb-2">Atmospheric Node</p>
              <h3 className="text-4xl font-black text-white font-mono">{weather?.temp || '28'}<span className="text-emerald-main/50">°C</span></h3>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{t("Location")}: {profile?.location || 'M-Sector 4'}</p>
            </div>
            <div className="w-14 h-14 bg-emerald-main/10 rounded-2xl flex items-center justify-center text-emerald-main border border-emerald-main/20 shadow-2xl">
               <Cloud size={28} strokeWidth={1.5} />
            </div>
          </div>
          <div className="relative z-10 pt-6">
            <div className="flex justify-between items-end mb-3">
               <p className="text-[10px] font-black text-emerald-main uppercase tracking-widest flex items-center gap-2">
                 <Droplets size={12} /> {t("Humidity Index")}
               </p>
               <span className="text-xs font-black text-white font-mono">{weather?.humidity || '65%'}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: weather?.humidity || '65%' }}
                 className="h-full bg-emerald-main shadow-[0_0_15px_rgba(16,185,129,0.5)]"
               />
            </div>
            <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5">
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">{t("Next Precipitation")}: 18h 42m</p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Wholesaler Order Requests - MOVED TO TOP */}
      {orders.filter(o => o.status === 'requested').length > 0 && (
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-emerald-main" /> {t("Wholesaler Requests")}
              </h3>
              <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-2 py-1 rounded-full border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                {orders.filter(o => o.status === 'requested').length} {t("ACTION REQUIRED")}
              </span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.filter(o => o.status === 'requested').map(order => {
                const requestedCrop = crops?.find(c => c.id === order.cropId);
                const displayCropName = order.cropName || requestedCrop?.name || t('Crop Request');
                const displayCropUnit = order.cropUnit || requestedCrop?.unit || t('Units');
                
                return (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -2 }}
                    className="glass p-5 border-white/5 hover:border-emerald-main/30 flex flex-col gap-4 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-main/10 grid place-items-center text-emerald-main">
                           <Truck size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{displayCropName}</h4>
                          <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{order.quantity} {displayCropUnit}</p>
                          <p className="text-[9px] text-[#64748b] font-medium uppercase mt-1">{t("Requester")}: {order.buyerName || t("Wholesaler")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest leading-none mb-1">{t("Offer")}</p>
                         <p className="text-sm font-black text-emerald-main">{formatCurrency(order.valueINR || 0)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleAcceptOrder(order.id)}
                         className="flex-1 bg-emerald-main text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-emerald-main/10"
                       >
                         {t("Accept")}
                       </button>
                       <button 
                         onClick={() => setOrderToReject(order)}
                         className="flex-1 bg-white/5 text-white/50 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                       >
                         {t("Decline")}
                       </button>
                    </div>
                  </motion.div>
                );
              })}
           </div>
        </section>
      )}

      {/* Live Transit Status */}
      {orders.filter(o => o.status === 'shipped').length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
              <Truck className="w-5 h-5 text-emerald-main" /> {t("Live Transit Status")}
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-main animate-ping" />
              <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">{t("GPS Tracking Active")}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.filter(o => o.status === 'shipped').map(order => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 border-emerald-main/20 bg-emerald-main/[0.03] rounded-[2rem] relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-main/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-main/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-main rounded-2xl flex items-center justify-center text-black shadow-lg shadow-emerald-main/20">
                      <Truck size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-main uppercase tracking-[0.2em] mb-1">{order.id}</p>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{order.cropName}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("Status")}</p>
                     <span className="bg-emerald-main/10 text-emerald-main text-[10px] font-black px-3 py-1 rounded-full border border-emerald-main/20">
                       IN TRANSIT
                     </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">{t("Carrier")}</span>
                    <span className="text-white font-black">{order.driverName || "Standard Express"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-widest">{t("Payload")}</span>
                    <span className="text-white font-black">{order.quantity} {order.cropUnit || "Units"}</span>
                  </div>
                </div>

                {/* Google Maps ETA Integration */}
                <div className="pt-6 border-t border-white/5">
                  <ActiveShipmentTracker 
                    origin={order.farmerCoords || [19.0760, 72.8777]} 
                    destination={order.wholesalerCoords || [19.2183, 72.9781]}
                    orderId={order.id}
                  />
                </div>
                
                <button 
                  onClick={() => setCurrentTab?.('Map View')}
                  className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] hover:bg-emerald-main hover:text-black hover:border-emerald-main transition-all group-item"
                >
                  {t("Open Telemetry Map")}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("Total Assets")} value={profile?.totalLand || "120"} unit={t("Acres")} change="+0.0%" positive />
        <StatCard label={t("Network Demand")} value={liveOrdersCount.toString()} unit={t("Nodes")} change="+1" positive />
        <StatCard label={t("Market Yield")} value={formatCurrency(dispatchRevenueINR)} unit={t("INR")} change="+12%" positive />
        <div className="glass p-5 border-emerald-main/30 bg-emerald-main/5 flex flex-col justify-center rounded-2xl group hover:bg-emerald-main/10 transition-colors">
            <p className="text-[10px] font-black text-emerald-main uppercase tracking-widest mb-1">{t("Intelligence Vector")}</p>
            <h4 className="text-lg font-black text-white leading-tight uppercase tracking-tighter">{t("Optimal Harvest Window")}</h4>
            <p className="text-[10px] text-emerald-main font-bold mt-2 uppercase tracking-[0.2em] animate-pulse">{t("Executing Yield Max...")}</p>
        </div>
      </div>

      {/* Order Rejection Modal */}
      {orderToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOrderToReject(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-bg-dark border border-border-main p-6 rounded-2xl shadow-2xl glass"
          >
             <h3 className="text-xl font-bold mb-2 text-white">{t("Decline Order Request")}</h3>
             <p className="text-[#94a3b8] text-sm mb-6">{t("Provide feedback to the wholesaler about why you're declining this order.")}</p>
             
             <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1 block">{t("Rejection Reason / Counter-Offer")}</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white focus:outline-none focus:border-red-500/50 min-h-[100px]"
                    placeholder={t("e.g. Demand is high, requesting 10% more on wholesale price...")}
                  />
               </div>
               
               <div className="flex gap-3">
                  <button 
                    onClick={handleRejectOrder}
                    className="flex-1 bg-red-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    {t("Confirm Decline")}
                  </button>
                  <button 
                    onClick={() => setOrderToReject(null)}
                    className="flex-1 bg-white/10 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    {t("Cancel")}
                  </button>
               </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* Middle Section: News Feed & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold">{t("Real-time News Feed")}</h3>
              <button onClick={refreshAlerts} className="p-1.5 bg-white/5 rounded-md hover:bg-white/10 transition-colors" title={t("Refresh news")}>
                <RefreshCw size={14} className="text-[#94a3b8] hover:text-white" />
              </button>
            </div>
            <button onClick={() => setCurrentTab && setCurrentTab('News Feed')} className="text-xs text-emerald-500 font-bold uppercase tracking-widest hover:underline">{t("View All News")}</button>
          </div>
          <div className="space-y-3">
            {alerts.filter(a => a.type === 'news').length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-[#94a3b8] text-xs">{t("Fetching real-time agricultural news...")}</p>
              </div>
            ) : (
              alerts.filter(a => a.type === 'news').map((alert) => {
                const isNews = alert.type === 'news';
                let bg = "bg-emerald-500/5";
                let border = "border-emerald-500/20";
                let textClass = "text-[#f8fafc]";
                
                if (alert.severity === 'critical') {
                  bg = "bg-red-600/10";
                  border = "border-red-600/30";
                } else if (alert.severity === 'high') {
                  bg = "bg-orange-500/10";
                  border = "border-orange-500/30";
                }
                
                return (
                  <motion.div 
                    key={alert.id}
                    whileHover={{ x: 5 }}
                    className={`p-4 rounded-2xl border ${bg} ${border} flex flex-col gap-2 relative group-news-item`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border ${border} text-emerald-main`}>
                          {isNews ? 'BREAKING' : alert.type}
                        </span>
                        <span className="text-[9px] text-[#94a3b8] font-bold">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAlert?.(alert.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded-full text-[#94a3b8] hover:text-white transition-colors"
                        title="Clear notification"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className={`text-sm ${textClass} font-medium leading-relaxed pr-2`}>{alert.message}</p>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <AICropGuide weather={weather} marketDemand={marketDemand} />
        <OrganicComplianceNode profile={profile} crops={crops || []} />
      </div>





      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-3xl max-h-[80vh] bg-bg-dark rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-bg-dark sticky top-0 z-10">
              <h2 className="text-2xl font-black">Real-time Agricultural News</h2>
              <button 
                onClick={() => setIsAlertsModalOpen(false)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {alerts.filter(a => a.type === 'news').length === 0 ? (
                <p className="text-[#94a3b8] text-center">Fetching news updates...</p>
              ) : (
                alerts.filter(a => a.type === 'news').map((alert) => {
                  let bg = "bg-emerald-500/5";
                  let border = "border-emerald-500/20";
                  let textClass = "text-[#f8fafc]";
                  
                  if (alert.severity === 'critical') {
                     bg = "bg-red-600/10";
                     border = "border-red-600/30";
                  } else if (alert.severity === 'high') {
                     bg = "bg-orange-500/10";
                     border = "border-orange-500/30";
                  }

                  const alertImages: Record<string, string> = {
                    flood: "https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&q=80&w=400",
                    drought: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&q=80&w=400",
                    demand: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400",
                    news: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=400",
                    opportunity: "https://images.unsplash.com/photo-1627920769843-169824f11413?auto=format&fit=crop&q=80&w=400",
                  };

                  const imgUrl = alert.imageUrl || alertImages[alert.type] || alertImages.news;

                  return (
                    <div key={alert.id} className={`rounded-2xl border ${bg} ${border} overflow-hidden flex flex-col md:flex-row group relative`}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAlert?.(alert.id);
                        }}
                        className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Dismiss"
                      >
                        <X size={16} />
                      </button>
                      <div className="md:w-1/3 h-48 md:h-auto shrink-0 relative overflow-hidden">
                        <img src={imgUrl} alt={alert.type} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4 md:hidden">
                           <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-black/50 text-white backdrop-blur-sm`}>
                              {alert.type}
                           </span>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                             <div className="hidden md:flex items-center gap-3">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white backdrop-blur-md`}>
                                  {alert.type === 'news' ? 'AgroFlow News' : alert.type}
                                </span>
                             </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${border} text-emerald-main`}>
                              {alert.severity} Impact
                            </span>
                          </div>
                          <p className={`text-base md:text-lg leading-relaxed ${textClass} font-medium`}>{alert.message}</p>
                        </div>
                        <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mt-6">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <ActionModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        desc={modalConfig.desc}
        actionLabel={modalConfig.actionLabel}
      />
    </div>
  );
}

function StatCard({ label, value, unit, change, positive }: any) {
  return (
    <div className="glass p-5 group transition-all hover:border-emerald-main/50 relative overflow-hidden glass-hover">
      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-main/5 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-emerald-main/10 transition-colors" />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10">{label}</p>
      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-3xl font-black text-white font-mono tracking-tighter">{value}</span>
        <span className="text-xs font-bold text-slate-500 uppercase">{unit}</span>
      </div>
      <div className={`mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider relative z-10 ${positive ? 'text-emerald-main' : 'text-rose-500'}`}>
        <div className={`p-1 rounded-md ${positive ? 'bg-emerald-main/10' : 'bg-rose-500/10'}`}>
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        </div>
        <span>{change} <span className="opacity-50">vs last cycle</span></span>
      </div>
    </div>
  );
}

function FilterBtn({ label, active }: any) {
  return (
    <button className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${active ? 'bg-emerald-main text-black border-emerald-main shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent text-[#94a3b8] border-white/10 hover:border-white/30'}`}>
      {label}
    </button>
  )
}

function SparkleIcon(props: any) {
  return (
    <svg 
      {...props}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
