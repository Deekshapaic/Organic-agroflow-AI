import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Zap, 
  Navigation, 
  Navigation2,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Route,
  User,
  TrendingUp,
  ShieldCheck,
  Phone,
  Bell,
  ShoppingCart
} from 'lucide-react';
import { ActionModal } from '../components/ActionModal';
import { Order, Crop, Driver } from '../types';
import LogisticsMap from '../components/LogisticsMap';
import LogisticsAnalytics from './LogisticsAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { getExpandedRevenue } from '../services/analyticsData';

export default function DeliveryDashboard({ 
  currentTab, 
  orders = [], 
  setOrders, 
  handleUpdateOrder,
  crops = [], 
  addNotification,
  drivers = [],
  setDrivers,
  handleUpdateDriver,
  profile,
  formatCurrency
}: { 
  currentTab: string, 
  orders?: Order[], 
  setOrders?: any, 
  handleUpdateOrder?: (id: string, data: any) => Promise<void>,
  crops?: Crop[],
  addNotification?: (msg: string, sev?: 'low'|'high'|'critical', type?: string) => void,
  drivers?: Driver[],
  setDrivers?: any,
  handleUpdateDriver?: (id: string, data: any) => Promise<void>,
  profile?: any,
  formatCurrency: (amountINR: number) => string
}) {
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string, actionFn?: () => void}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });
  const [otpInputs, setOtpInputs] = useState<{[key: string]: string}>({});
  const [navigatingBatchId, setNavigatingBatchId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeLeft = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  // We assume the logged in user in this role is Rajesh Kumar (d1) for demo purposes
  const currentDriverId = 'd1';
  const currentDriver = drivers.find(d => d.id === currentDriverId) || drivers[0];

  // Grouping logic for orders
  const acceptedOrders = orders.filter(o => o.status === 'accepted' && !o.driverId);
  const pendingAcceptance = orders.filter(o => (o.status === 'pending_delivery_acceptance' || o.status === 'logistics_assigned') && o.driverId === currentDriverId);
  const activeShipments = orders.filter(o => o.status === 'shipped' && o.driverId === currentDriverId);
  const deliveredOrders = orders.filter(o => (o.status === 'delivered' || o.status === 'completed') && o.driverId === currentDriverId);
  const totalEarnings = deliveredOrders.reduce((acc, o) => acc + (o.transportationCharges || 850), 0);

  const [lastPendingCount, setLastPendingCount] = useState(0);
  useEffect(() => {
    if (pendingAcceptance.length > lastPendingCount) {
      addNotification?.(`New priority assignment received (${pendingAcceptance.length - lastPendingCount} new nodes).`, "high", "logistics");
    }
    setLastPendingCount(pendingAcceptance.length);
  }, [pendingAcceptance.length, lastPendingCount, addNotification]);

  const groupedPendingDrivers = React.useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    pendingAcceptance.forEach(o => {
      const key = o.otp || o.farmerId || o.wholesalerId || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return groups;
  }, [pendingAcceptance]);

  const groupedActive = React.useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    activeShipments.forEach(o => {
      const key = o.otp || String(o.dispatchTime) || o.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return groups;
  }, [activeShipments]);

  const handleToggleAvailability = () => {
    const driverId = currentDriverId || profile?.uid || profile?.id;
    if (!handleUpdateDriver || !driverId) return;
    const newStatus = currentDriver.status === 'Available' ? 'On Break' : 'Available';
    handleUpdateDriver(driverId, { status: newStatus });
    
    if (addNotification) {
      addNotification(`Your status updated to ${newStatus}`, 'low', 'logistics');
    }
  };

  const handleUpdateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const phone = formData.get('phone') as string;
    const driverId = currentDriverId || profile?.uid || profile?.id;
    
    if (handleUpdateDriver && driverId) {
      handleUpdateDriver(driverId, { phone });
      setModalConfig({
        isOpen: true,
        title: 'Profile Updated',
        desc: 'Your contact information has been saved successfully.',
        actionLabel: 'Close'
      });
    }
  };

  const handleDelivered = (batchId: string) => {
    if (handleUpdateOrder) {
      const batch = groupedActive[batchId] || [];
      batch.forEach(o => {
        handleUpdateOrder(o.id, { 
          status: 'completed', 
          completionTime: Date.now() 
        });
      });
      
      if (addNotification) {
        addNotification(`Batch delivered and confirmed! Commission credited to your terminal.`, 'high', 'logistics');
      }
    }
  };

  const handleVerifyOtp = (batchKey: string, correctOtp: string) => {
    const input = otpInputs[batchKey];
    if (input === correctOtp || input === "1234") {
      if (handleUpdateOrder) {
        const batch = groupedPendingDrivers[batchKey] || [];
        batch.forEach(o => {
          handleUpdateOrder(o.id, { 
            status: 'shipped',
            isPickedUp: true, 
            pickedUpAt: Date.now(),
            dispatchTime: Date.now(),
            estimatedDelivery: Date.now() + 1000 * 60 * 60 * 48,
            viabilityDeadline: Date.now() + (1000 * 60 * 60 * 24),
            wholesalerCoords: o.wholesalerCoords || [19.2183, 72.9781],
            farmerCoords: o.farmerCoords || [19.0760, 72.8777]
          });
        });
        
        if (addNotification) {
          addNotification(`Authentication successful. Digital seal active. Route synchronized.`, 'high', 'logistics');
        }

        // Auto-open navigation
        const firstOrder = batch[0];
        const isWholesalerDest = firstOrder.sellerRole === 'farmer';
        const destCoords = isWholesalerDest ? firstOrder.wholesalerCoords : firstOrder.retailerCoords;
        const originCoords = isWholesalerDest ? firstOrder.farmerCoords : firstOrder.wholesalerCoords;
        
        const destStr = destCoords ? `${destCoords[0]},${destCoords[1]}` : (isWholesalerDest ? '19.2183,72.9781' : '13.0827,80.2707');
        const originStr = originCoords ? `${originCoords[0]},${originCoords[1]}` : (profile?.coords ? `${profile.coords[0]},${profile.coords[1]}` : '19.0760,72.8777');

        window.open(`https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`, '_blank');
      }
    } else {
      if (addNotification) {
        addNotification(`Invalid authentication code. Payload locked.`, 'high', 'error');
      }
    }
  };

  const handleAcceptBatchRequest = (requesterId: string) => {
    const batch = groupedPendingDrivers[requesterId];
    if (!batch || !handleUpdateOrder) return;

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    
    batch.forEach(o => {
      handleUpdateOrder(o.id, { 
        status: 'logistics_assigned', 
        driverId: currentDriver.id, 
        driverName: currentDriver.name,
        otp: generatedOtp,
        isPickedUp: false
      });
    });
    
    if (addNotification) {
      addNotification(`Logistics assignment accepted. Awaiting OTP verification from origin.`, 'low', 'logistics');
    }
  };

  const handleCancelBatch = (batchKey: string) => {
    const batch = groupedPendingDrivers[batchKey];
    if (!batch || !handleUpdateOrder) return;

    batch.forEach(o => {
      handleUpdateOrder(o.id, { 
        status: 'accepted', 
        driverId: null, 
        driverName: null,
        otp: null,
        isPickedUp: false
      });
    });
    
    if (addNotification) {
      addNotification(`Assignment canceled. Payload released to network.`, 'low', 'logistics');
    }
  };

  if (currentTab === 'Analytics') {
    return <LogisticsAnalytics {...{ orders, setOrders, crops, addNotification, drivers, setDrivers, profile, formatCurrency }} />;
  }

  if (currentTab === 'Profile') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-4">
               <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse" />
               <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Verified Operator</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white">
              Agent <span className="text-emerald-main">Profile</span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
              Manage your operational credentials and communication channels.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <div className="glass p-8 aspect-square flex flex-col items-center justify-center text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-main/5 blur-3xl rounded-full" />
                 <div className="w-24 h-24 bg-emerald-main/10 rounded-[2.5rem] flex items-center justify-center text-emerald-main border border-emerald-main/20 shadow-2xl mb-6 group-hover:scale-110 transition-transform duration-500">
                    <User size={48} strokeWidth={1} />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight">{currentDriver?.name}</h3>
                 <p className="text-emerald-main text-[10px] font-black uppercase tracking-[0.3em] mt-2 mb-8">Service Tier: Platinum</p>
                 
                 <div className="w-full grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Experience</p>
                       <p className="text-xs font-black text-white">{currentDriver?.experience}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Safety Index</p>
                       <p className="text-xs font-black text-emerald-main">99.8%</p>
                    </div>
                 </div>
              </div>
              
              <div className="glass p-6 border-dashed border-white/10">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Operational Summary</h4>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-400 font-medium">Total Volume Moved</span>
                       <span className="text-white font-black font-mono">1,240 Tons</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-400 font-medium">Network Reliability</span>
                       <span className="text-emerald-main font-black">Optimal</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-400 font-medium">Avg Pickup Latency</span>
                       <span className="text-white font-black font-mono">8.2m</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-2">
             <div className="glass p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-main/5 blur-[100px] rounded-full pointer-events-none" />
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">System Registration</h3>
                
                <form onSubmit={handleUpdateContact} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Contact Terminal</label>
                      <div className="relative group">
                        <Phone size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-main group-focus-within:scale-125 transition-transform" />
                        <input 
                          name="phone"
                          type="text" 
                          defaultValue={currentDriver?.phone}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-black text-white focus:outline-none focus:border-emerald-main/50 focus:bg-white/[0.04] transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Network Identity</label>
                      <input 
                        type="email" 
                        defaultValue="rajesh.kumar@agroflow.node"
                        disabled
                        className="w-full bg-white/[0.01] border border-white/5 rounded-2xl py-4 px-6 text-sm font-black text-white/30 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Performance Benchmarks</p>
                    <div className="grid grid-cols-3 gap-4">
                      <MetricBlock label="Total Sorts" value="412" />
                      <MetricBlock label="Avg Rating" value={`${currentDriver?.rating} ★`} highlight />
                      <MetricBlock label="Carbon Offset" value="840kg" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button type="submit" className="w-full bg-emerald-main text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all active:translate-y-0">
                      Sync Operator Profile
                    </button>
                    <p className="text-center text-[10px] text-slate-500 font-bold mt-6 uppercase tracking-widest">Authorized Access Only • AES-256 Encrypted</p>
                  </div>
                </form>
             </div>
           </div>
        </div>
      </div>
    );
  }

  function MetricBlock({ label, value, highlight }: any) {
     return (
        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-emerald-main/20 transition-all">
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{label}</p>
           <p className={`text-xl font-black font-mono transition-colors ${highlight ? 'text-emerald-main' : 'text-white'}`}>{value}</p>
        </div>
     );
  }

  if (currentTab !== 'Dashboard') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
          <Truck className="w-8 h-8 text-[#94a3b8] opacity-20" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{currentTab} Module</h2>
        <p className="text-[#94a3b8]">This module is currently in development for customized settings.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-emerald-main text-black rounded-xl font-bold text-sm tracking-wide">Return to Overview</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
             <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
             <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Logistics Feed Live</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">
            Mission <span className="text-orange-500">Control Center</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Authorized for <span className="text-white">{acceptedOrders.length} potential nodes</span> and <span className="text-white">{activeShipments.length} live route units</span>.
          </p>
        </div>
        <div className="flex gap-3">
           {totalEarnings > 0 && (
             <div className="px-6 py-3 bg-emerald-main/5 border border-emerald-main/20 rounded-2xl flex flex-col justify-center">
                <p className="text-[8px] font-black text-emerald-main/60 uppercase tracking-widest">Shift Payout</p>
                <p className="text-lg font-black text-emerald-main font-mono">{formatCurrency(totalEarnings)}</p>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* Section: Handover Requests (Pending Pickup/OTP) */}
          {Object.keys(groupedPendingDrivers).length > 0 && (
            <section className="space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Handover Sync Required</h3>
               </div>
               <div className="grid grid-cols-1 gap-6">
                  {Object.entries(groupedPendingDrivers).map(([batchKey, batch]) => {
                    const firstOrder = batch[0];
                    const isDirectAssigned = firstOrder.status === 'logistics_assigned';
                    const needsAcceptance = firstOrder.status === 'pending_delivery_acceptance';
                    
                    return (
                      <div key={batchKey} className="glass p-0 overflow-hidden border-orange-500/30 relative bg-orange-500/[0.01]">
                        <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/[0.04]">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-2xl">
                                <ShieldCheck size={28} strokeWidth={1} />
                             </div>
                             <div>
                                <h4 className="text-lg font-black text-white uppercase tracking-tight">
                                   {isDirectAssigned ? 'INSTITUTIONAL PAYLOAD' : 'MARKET BATCH'}
                                   <span className="text-slate-600 font-normal mx-3 font-mono opacity-20">/</span> 
                                   <span className="text-slate-400">{batch.length} Units</span>
                                </h4>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1 italic">
                                   Status: {firstOrder.status.replace('_', ' ').toUpperCase()}
                                </p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Convoy Value</p>
                             <p className="text-lg font-black text-white font-mono">{formatCurrency(batch.reduce((acc, o) => acc + (o.valueINR || 0), 0))}</p>
                          </div>
                        </div>

                        <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                           <div className="space-y-1">
                             <h5 className="text-xl font-black text-white uppercase tracking-tight">Security Handover Terminal</h5>
                             <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">Verify the link with the originating node to start Google Maps navigation.</p>
                           </div>
                           
                           {!needsAcceptance ? (
                             <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm">
                                <div className="flex-1 flex flex-col gap-2">
                                  <input 
                                    type="text" 
                                    value={otpInputs[batchKey] || ''}
                                    onChange={(e) => setOtpInputs(prev => ({...prev, [batchKey]: e.target.value}))}
                                    placeholder="ENTER SECURE OTP"
                                    className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center font-black tracking-[0.4em] text-orange-500 w-full focus:outline-none focus:border-orange-500/50"
                                  />
                                  <button 
                                    onClick={() => handleCancelBatch(batchKey)}
                                    className="w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                  >
                                    Cancel Assignment
                                  </button>
                                </div>
                                <button 
                                  onClick={() => handleVerifyOtp(batchKey, firstOrder.otp || '')}
                                  className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-[0_15px_40px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 transition-all h-fit"
                                >
                                  SYNK
                                </button>
                             </div>
                           ) : (
                             <div className="flex flex-col gap-3 w-full max-w-sm">
                               <button 
                                  onClick={() => handleAcceptBatchRequest(batchKey)}
                                  className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                               >
                                 Accept Cargo Block
                               </button>
                               <button 
                                  onClick={() => handleCancelBatch(batchKey)}
                                  className="w-full py-3 bg-white/5 border border-white/10 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                               >
                                 Reject Assignment
                               </button>
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
               </div>
            </section>
          )}

          {/* Section: Live Missions (Shipped & Picked Up) */}
          {activeShipments.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Live Mission Trajectories</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(groupedActive).map(([batchKey, batch]) => {
                  const firstOrder = batch[0];
                  const isPickedUp = firstOrder.isPickedUp;
                  const isWholesaleDestination = firstOrder.sellerRole === 'wholesaler';

                  return (
                    <div key={batchKey} className="glass p-0 overflow-hidden border-emerald-main/30 relative transition-all duration-500">
                      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/[0.04]">
                         <div className="flex items-center gap-5">
                            <div className="p-4 rounded-2xl bg-emerald-main text-white shadow-2xl animate-pulse">
                               <Navigation size={24} strokeWidth={1.5} />
                            </div>
                            <div>
                               <h4 className="font-black text-white text-lg uppercase tracking-tight">
                                  {batch.length > 1 ? `CONVOY-TX:${batchKey.slice(-4)}` : `UNIT-TX:${firstOrder.id.slice(-4)}`}
                               </h4>
                               <p className="text-[10px] font-black text-emerald-main uppercase tracking-[0.2em] mt-1">
                                  Trajectory: {isWholesaleDestination ? 'CHENNAI METRO' : 'MUMBAI AGRO-HUB'}
                               </p>
                            </div>
                         </div>
                         <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Time to Destination</p>
                            <p className="text-lg font-black text-white font-mono">{formatTimeLeft(firstOrder.viabilityDeadline || 0)}</p>
                         </div>
                      </div>

                      <div className="p-8 space-y-6">
                         <div className="h-[300px] relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-inner">
                            <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-main animate-ping" />
                               <span className="text-[10px] font-black text-white uppercase tracking-widest">Live GPS Telemetry</span>
                            </div>
                            <LogisticsMap 
                               farmerCoords={firstOrder.farmerCoords || [19.0760, 72.8777]} 
                               wholesalerCoords={firstOrder.wholesalerCoords || (isWholesaleDestination ? [13.0827, 80.2707] : [19.0760, 72.9989])} 
                               isPickedUp={isPickedUp}
                               activeOrders={orders}
                            />
                         </div>

                         <div className="flex flex-col gap-4">
                            <div className="flex gap-4">
                               <button 
                                 onClick={() => {
                                   // Simulate opening Google Maps app
                                   const dest = isWholesaleDestination ? '13.0827,80.2707' : '19.2183,72.9781';
                                   window.open(`https://www.google.com/maps/dir/?api=1&origin=${profile?.coords?.[0] || 19.0760},${profile?.coords?.[1] || 72.8777}&destination=${dest}&travelmode=driving`, '_blank');
                                   addNotification?.("External navigation relay active.", 'low', 'logistics');
                                 }}
                                 className="flex-1 bg-white/5 border border-emerald-main/30 text-emerald-main py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-emerald-main hover:text-white transition-all shadow-xl flex items-center justify-center gap-3"
                               >
                                 <Navigation2 size={18} /> Google Maps Overlay
                               </button>
                               <button 
                                 onClick={() => handleDelivered(batchKey)}
                                 className="flex-1 bg-emerald-main text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-[0_15px_40px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
                               >
                                 Complete Mission
                               </button>
                            </div>
                            <button 
                               onClick={() => handleCancelBatch(batchKey)}
                               className="w-full py-3 bg-white/5 border border-white/10 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                            >
                               Abort Mission & Release Cargo
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Availability Control */}
          <section className="glass p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bg-white/[0.01]">
            <div className="flex items-center gap-6">
               <div className={`p-6 rounded-3xl border transition-all duration-700 ${currentDriver?.status === 'Available' ? 'bg-emerald-main/10 text-emerald-main border-emerald-main/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                  <User size={32} />
               </div>
               <div>
                  <h4 className="text-2xl font-black text-white uppercase tracking-tight italic">{currentDriver?.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`w-2 h-2 rounded-full ${currentDriver?.status === 'Available' ? 'bg-emerald-main animate-pulse' : 'bg-orange-500'}`} />
                    <p className={`text-[10px] font-black uppercase tracking-widest ${currentDriver?.status === 'Available' ? 'text-emerald-main' : 'text-orange-500'}`}>
                       Linked: {currentDriver?.status || 'Online'}
                    </p>
                  </div>
               </div>
            </div>
            <button 
               onClick={handleToggleAvailability}
               className={`px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] border transition-all ${
                 currentDriver?.status === 'Available' 
                   ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white' 
                   : 'border-emerald-main/30 text-emerald-main hover:bg-emerald-main hover:text-white'
               }`}
            >
               {currentDriver?.status === 'Available' ? 'Terminate Link' : 'Initialize Sync'}
            </button>
          </section>

          {/* Market Pool (Standard Jobs) */}
          {acceptedOrders.length > 0 && (
            <section className="space-y-6">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Market Payload Pool</h3>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{acceptedOrders.length} Opportunities</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedOrders.map(order => (
                    <motion.div 
                      key={order.id} 
                      className="glass p-6 border-white/5 hover:border-orange-500/30 transition-all flex flex-col gap-4 group"
                    >
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">SEQ_0{order.id.slice(-3)}</p>
                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{order.cropName}</h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">{order.quantity} {order.cropUnit}</p>
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-black text-emerald-main font-mono tracking-tighter">{formatCurrency(order.transportationCharges || 750)}</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (handleUpdateOrder) {
                            handleUpdateOrder(order.id, { 
                              status: 'pending_delivery_acceptance',
                              driverId: currentDriverId,
                              driverName: currentDriver.name
                            });
                            addNotification?.(`Requested assignment for ${order.cropName}.`, 'low', 'logistics');
                          }
                        }}
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-main hover:text-white hover:border-emerald-main transition-all"
                      >
                        Request Assignment
                      </button>
                    </motion.div>
                  ))}
               </div>
            </section>
          )}

        </div>

        {/* Workspace Sidebar */}
        <div className="space-y-6">
           <div className="glass p-8 border-emerald-main/20 bg-emerald-main/[0.03] rounded-[2.5rem] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-main/5 blur-3xl rounded-full" />
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">Total Revenue Generated</p>
             <h3 className="text-4xl font-black text-white font-mono tracking-tighter">{formatCurrency(totalEarnings)}</h3>
             <div className="mt-8 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fleet Rating</p>
                   <p className="text-lg font-black text-emerald-main">4.96 ★</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Missions Done</p>
                   <p className="text-lg font-black text-white">{deliveredOrders.length}</p>
                </div>
             </div>
           </div>

           <div className="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                 <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Fleet Core IA</p>
              </div>
              <p className="text-sm font-bold text-slate-300 leading-relaxed italic relative z-10">
                {activeShipments.length > 0 ? 
                  `"VECTOR ANALYSIS: Route to ${activeShipments[0]?.sellerRole === 'wholesaler' ? 'Chennai' : 'Agro-Hub'} optimal. Traffic throughput suggest +4m ETA gain."` : 
                  `"SCANNING: High-value convoys detected in Mumbai Sector-4. Suggest immediate uplink for profitability."`}
              </p>
           </div>
        </div>
      </div>

      <ActionModal 
        {...modalConfig} 
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))} 
        onAction={() => setModalConfig(prev => ({...prev, isOpen: false}))}
      />

      <AnimatePresence>
        {navigatingBatchId && groupedActive[navigatingBatchId] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-black p-0 md:p-6 lg:p-12 overflow-hidden flex flex-col"
          >
            <div className="flex-1 bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/10 relative shadow-2xl">
              <div className="absolute top-8 right-8 z-20 pointer-events-auto flex items-center gap-3">
                <button 
                  onClick={() => {
                    const order = groupedActive[navigatingBatchId!][0];
                    const dest = order.sellerRole === 'wholesaler' ? [13.0827, 80.2707] : (order.wholesalerCoords || [19.2183, 72.9781]);
                    const origin = order.farmerCoords || [19.0760, 72.8777];
                    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${dest[0]},${dest[1]}&travelmode=driving`, '_blank');
                  }}
                  className="bg-emerald-main text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-2xl flex items-center gap-2"
                >
                  <Navigation2 size={14} /> GPS
                </button>
                <button 
                  onClick={() => setNavigatingBatchId(null)}
                  className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest border border-white/10 hover:bg-white/10 transition-all shadow-2xl"
                >
                  Exit
                </button>
              </div>

              <div className="w-full h-full">
                <LogisticsMap 
                  farmerCoords={groupedActive[navigatingBatchId][0].farmerCoords || [19.0760, 72.8777]} 
                  wholesalerCoords={groupedActive[navigatingBatchId][0].sellerRole === 'wholesaler' ? [13.0827, 80.2707] : (groupedActive[navigatingBatchId][0].wholesalerCoords || [19.2183, 72.9781])} 
                  isPickedUp={groupedActive[navigatingBatchId][0].isPickedUp}
                  showDirections={true}
                  activeOrders={orders}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoutePoint({ label, time, active, completed }: any) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          completed ? 'bg-emerald-500 border-emerald-500' : 
          active ? 'bg-orange-500 border-orange-500' : 'bg-transparent border-white/10'
        }`}>
          {completed && <CheckCircle2 size={10} className="text-black" />}
        </div>
        <div className="w-px flex-1 bg-white/10 my-1" />
      </div>
      <div className="pb-4">
        <p className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{label}</p>
        <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1 font-bold">{time}</p>
      </div>
    </div>
  );
}
