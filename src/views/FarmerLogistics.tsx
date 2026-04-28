import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Navigation, 
  Zap, 
  Navigation2,
  Plus,
  Compass,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Route,
  User,
  ShieldCheck,
  Phone
} from 'lucide-react';
import { ActionModal } from '../components/ActionModal';
import { Order, Crop, Driver } from '../types';

export default function FarmerLogistics({ 
  orders = [], 
  setOrders, 
  crops = [], 
  addNotification,
  drivers = [],
  formatCurrency,
  profile,
  setCurrentTab
}: { 
  orders?: Order[], 
  setOrders?: (id: string, data: any) => Promise<void>, 
  crops?: Crop[],
  addNotification?: (msg: string, sev?: 'low'|'high'|'critical', type?: string) => void,
  drivers?: Driver[],
  formatCurrency: (amountINR: number) => string,
  profile?: any,
  setCurrentTab?: (tab: string) => void
}) {
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string, actionFn?: () => void}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [selectedDriverForHistory, setSelectedDriverForHistory] = useState<Driver | null>(null);
  const [sortBy, setSortBy] = useState<'wholesaler' | 'crop' | 'none'>('none');

  const acceptedOrders = React.useMemo(() => {
    const filtered = orders.filter(o => o.status === 'accepted');
    if (sortBy === 'wholesaler') {
       return [...filtered].sort((a, b) => (a.wholesalerId || '').localeCompare(b.wholesalerId || ''));
    }
    if (sortBy === 'crop') {
       return [...filtered].sort((a, b) => (a.cropName || '').localeCompare(b.cropName || ''));
    }
    return filtered;
  }, [orders, sortBy]);
  const pendingAssignments = orders.filter(o => o.status === 'pending_delivery_acceptance' || o.status === 'logistics_assigned');
  const activeShipments = orders.filter(o => o.status === 'shipped');

  // Group active shipments by batch (OTP or dispatchTime)
  const groupedActive = React.useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    activeShipments.forEach(o => {
      const key = o.otp || String(o.dispatchTime) || o.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return groups;
  }, [activeShipments]);

  const handleToggleSelect = (order: Order) => {
    if (selectedOrderIds.includes(order.id)) {
      setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
      return;
    }
    
    // Limit to 3 (check against current state, not prev in updater)
    if (selectedOrderIds.length >= 3) {
      if (addNotification) addNotification("You can select maximum 3 items for a single shipment.", "high", "error");
      return;
    }

    // Check if same wholesaler
    const firstId = selectedOrderIds[0];
    const firstOrder = orders.find(o => o.id === firstId);
    if (firstOrder && firstOrder.wholesalerId !== order.wholesalerId) {
      if (addNotification) addNotification("All selected items must be for the same wholesaler.", "high", "error");
      return;
    }

    setSelectedOrderIds(prev => [...prev, order.id]);
  };

  const handleAssignDriver = (driver: Driver) => {
    if (selectedOrderIds.length === 0) return;
    
    if (setOrders) {
      const totalTransCharges = Math.floor(500 + Math.random() * 1500); 
      const chargesPerItem = Math.floor(totalTransCharges / selectedOrderIds.length);
      
      selectedOrderIds.forEach(id => {
        setOrders(id, { 
          status: 'pending_delivery_acceptance', 
          driverId: driver.id, 
          driverName: driver.name,
          transportationCharges: chargesPerItem, 
          isPickedUp: false,
        });
      });
      
      if (addNotification) {
        addNotification(`Batch of ${selectedOrderIds.length} items sent to ${driver.name}. Total Charges: ${formatCurrency(totalTransCharges)}`, 'low', 'logistics');
      }
      
      setSelectedOrderIds([]);
      setModalConfig({
        isOpen: true,
        title: 'Delivery Batch Requested',
        desc: `A delivery request for ${selectedOrderIds.length} items has been sent. Total Charges: ${formatCurrency(totalTransCharges)}.`,
        actionLabel: 'OK'
      });
    }
  };

  const getDriverOrderCount = (driverId: string) => {
    return orders.filter(o => 
      o.driverId === driverId && 
      (o.status === 'pending_delivery_acceptance' || o.status === 'shipped') &&
      o.farmerId === (profile?.id || 'f1')
    ).length;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
             <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
             <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Dispatch Operations Active</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white">
            Logistics <span className="text-emerald-main italic">Terminal</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Authorized for <span className="text-white">{acceptedOrders.length} pending units</span> and <span className="text-white">{activeShipments.length} live route streams</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-main/10 text-emerald-main px-4 py-2 rounded-2xl border border-emerald-main/20">
          <Zap className="w-4 h-4 fill-emerald-main shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="font-bold text-[10px] uppercase tracking-widest">Neural Link Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Section: Pending Assignment */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Ready for Dispatch</h3>
              </div>
              
              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Sort By</p>
                 <button 
                   onClick={() => setSortBy(sortBy === 'wholesaler' ? 'none' : 'wholesaler')}
                   className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'wholesaler' ? 'bg-emerald-main text-black' : 'hover:bg-white/5 text-slate-400'}`}
                 >
                   Wholesaler
                 </button>
                 <button 
                   onClick={() => setSortBy(sortBy === 'crop' ? 'none' : 'crop')}
                   className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'crop' ? 'bg-emerald-main text-black' : 'hover:bg-white/5 text-slate-400'}`}
                 >
                   Asset Type
                 </button>
              </div>
            </div>
            
            {acceptedOrders.length === 0 && pendingAssignments.length === 0 ? (
              <div className="glass p-12 text-center border-dashed border-white/10">
                <p className="text-[#94a3b8] text-sm">No confirmed orders waiting for assignment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {/* Orders waiting for driver to be assigned */}
                {acceptedOrders.map(order => {
                  const crop = crops.find(c => c.id === order.cropId);
                  const isSelected = selectedOrderIds.includes(order.id);
                  const displayCropName = order.cropName || crop?.name || 'Crop';
                  const displayCropUnit = order.cropUnit || crop?.unit || 'Units';

                  return (
                    <motion.div 
                      key={order.id} 
                      layout
                      className={`glass p-5 flex flex-col gap-4 border transition-all ${isSelected ? 'border-emerald-main/50 bg-emerald-main/5' : 'border-white/5'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleToggleSelect(order)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-main border-emerald-main text-black' : 'border-white/20 hover:border-white/40'}`}
                          >
                            {isSelected && <ShieldCheck size={14} />}
                          </button>
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-main border border-white/5">
                            <Truck size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-emerald-main uppercase tracking-widest mb-1">Order #{order.id.slice(-4)}</p>
                            <h4 className="text-lg font-bold text-white">{order.quantity} {displayCropUnit} of {displayCropName}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">To Wholesaler</p>
                          <p className="text-sm font-bold text-white">{order.wholesalerId}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Orders awaiting driver acceptance */}
                {pendingAssignments.map(order => {
                  const crop = crops.find(c => c.id === order.cropId);
                  const displayCropName = order.cropName || crop?.name || 'Crop';
                  const displayCropUnit = order.cropUnit || crop?.unit || 'Units';
                  
                  const statusLabel = order.status === 'logistics_assigned' ? 'Awaiting Handover' : 'Awaiting Driver Acceptance';
                  const statusColor = order.status === 'logistics_assigned' ? 'text-emerald-main' : 'text-blue-500';

                  return (
                    <motion.div 
                      key={order.id} 
                      layout
                      className={`glass p-5 flex flex-col gap-4 border transition-all ${order.status === 'logistics_assigned' ? 'border-emerald-main/20 bg-emerald-main/5' : 'border-blue-500/20 bg-blue-500/5'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 ${statusColor}`}>
                            {order.status === 'logistics_assigned' ? <ShieldCheck size={24} /> : <Clock size={24} />}
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusColor}`}>Order #{order.id.slice(-4)}</p>
                            <h4 className="text-lg font-bold text-white">{order.quantity} {displayCropUnit} of {displayCropName}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Logistics Fare</p>
                          <p className="text-sm font-bold text-emerald-main">{formatCurrency(order.transportationCharges || 0)}</p>
                        </div>
                      </div>

                      {order.status === 'logistics_assigned' && order.otp && (
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                          <div>
                            <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-1">Authentication OTP</p>
                            <p className="text-2xl font-black text-white tracking-[0.3em] font-mono">{order.otp}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Security Protocol</p>
                             <p className="text-[10px] font-bold text-slate-400">Share this with {order.driverName}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-4">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-white/5 ${statusColor}`}>
                             <User size={12} />
                           </div>
                           <div>
                             <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">{statusLabel}</p>
                             <p className="text-xs font-bold text-white">{order.driverName}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full animate-pulse ${order.status === 'logistics_assigned' ? 'bg-emerald-main' : 'bg-blue-500'}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{order.status.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (setOrders) {
                              setOrders(order.id, { 
                                status: 'accepted', 
                                driverId: null, 
                                driverName: null,
                                transportationCharges: 0,
                                otp: null
                              });
                              if (addNotification) addNotification(`Assignment retracted for Order #${order.id.slice(-4)}.`, 'low', 'logistics');
                            }
                          }}
                          className="mt-3 w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                        >
                          Cancel Assignment
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {selectedOrderIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 glass border-emerald-main/30 bg-emerald-main/5 sticky bottom-4 z-40"
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h4 className="text-xl font-bold flex items-center gap-2 text-white">
                       <ShieldCheck className="text-emerald-main" /> {selectedOrderIds.length} Items Selected
                    </h4>
                    <p className="text-[10px] text-[#94a3b8] mt-1 uppercase font-black tracking-widest">Assign up to 3 to a single driver</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
                    {drivers.filter(d => d.status === 'Available' && getDriverOrderCount(d.id) < 3).map(driver => (
                      <div 
                        key={driver.id} 
                        className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-emerald-main/50 cursor-pointer group transition-all flex items-center justify-between gap-4"
                        onClick={() => handleAssignDriver(driver)}
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-emerald-main/20 flex items-center justify-center text-emerald-main">
                             <User size={14} />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-white group-hover:text-emerald-main">{driver.name}</p>
                             <p className="text-[9px] text-[#94a3b8] uppercase">{driver.experience} Exp.</p>
                           </div>
                        </div>
                        <div className="bg-emerald-main text-black text-[9px] font-black px-3 py-1 rounded-lg uppercase">Assign Batch</div>
                      </div>
                    ))}
                    {drivers.filter(d => d.status === 'Available' && getDriverOrderCount(d.id) < 3).length === 0 && (
                      <div className="col-span-full py-4 px-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest text-center italic">No Available Drivers with Capacity</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          {/* Section: Live Tracking for Active Shipments */}
          {activeShipments.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-[#f8fafc]">In-Transit Progress</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(groupedActive).map(([batchKey, batch]) => {
                  const firstOrder = batch[0];
                  const displayCropNames = batch.map(o => o.cropName || crops.find(c => c.id === o.cropId)?.name || 'Crop').join(', ');
                  const totalQuantity = batch.reduce((acc, o) => acc + o.quantity, 0);
                  
                  return (
                    <div key={batchKey} className="glass p-0 overflow-hidden border-emerald-main/20">
                      <div className="p-5 flex justify-between items-center border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-main/10 rounded-lg text-emerald-main">
                            <Navigation size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">
                              {batch.length > 1 ? `Bulk Shipment (${batch.length} items)` : displayCropNames} 
                              <span className="text-[#94a3b8] font-normal mx-2">|</span> 
                              {firstOrder.driverName}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
                                In Transit • Total: {totalQuantity} Units
                              </p>
                              {firstOrder.otp && !firstOrder.isPickedUp && (
                                <div className="bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                                  <ShieldCheck size={10} className="text-orange-500" />
                                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">SHARE OTP: {firstOrder.otp}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">ETA</p>
                          <p className="text-sm font-black text-emerald-main">42m</p>
                        </div>
                      </div>
                      
                      <div className="p-5 bg-[#0a1210] relative h-32 overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 128">
                          <path d="M0,64 L800,64 M400,0 L400,128" stroke="#16ba81" strokeWidth="1" strokeDasharray="10 10" fill="none" />
                          <path d="M50,96 L150,64 L300,32 L450,64 L650,96" stroke="#16ba81" strokeWidth="2" fill="none" />
                        </svg>
                        <div className="relative z-10 flex flex-col justify-center h-full">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[8px] font-black uppercase text-[#94a3b8] tracking-[0.2em]">Route Progress</span>
                              <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">65% Delivered</span>
                           </div>
                           <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: "65%" }}
                               className="h-full bg-emerald-main shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                             />
                           </div>
                           <button 
                             onClick={() => setCurrentTab?.('Map View')}
                             className="mt-4 w-full py-3 bg-emerald-main/10 border border-emerald-main/20 text-emerald-main rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-main hover:text-black transition-all flex items-center justify-center gap-2"
                           >
                             <Compass size={14} /> Open Real-Time Map View
                           </button>
                           <button 
                             onClick={() => {
                               if (setOrders) {
                                 batch.forEach(o => {
                                   setOrders(o.id, { 
                                     status: 'accepted', 
                                     driverId: null, 
                                     driverName: null,
                                     otp: null,
                                     isPickedUp: false
                                   });
                                 });
                                 if (addNotification) addNotification(`Convoy recalled. Shipments returned to local inventory for re-routing.`, 'high', 'logistics');
                               }
                             }}
                             className="mt-2 w-full py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                           >
                             Abort & Recall shipment
                           </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
           {/* Fleet Status */}
           <div className="glass p-6 bg-emerald-deep/40 relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                 <div className="w-10 h-10 bg-emerald-main rounded-xl flex items-center justify-center text-black">
                    <User size={20} />
                 </div>
                 <div className="text-right">
                    <p className="font-black text-base text-emerald-main">{drivers.filter(d => d.status === 'Available').length}</p>
                    <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">Drivers Nearby</p>
                 </div>
              </div>
              
              <div className="space-y-3">
                {drivers.map(driver => (
                  <div key={driver.id} className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${driver.status === 'Available' ? 'bg-emerald-main' : 'bg-white/20'}`} />
                        <p className={`text-[11px] font-bold ${driver.status === 'Available' ? 'text-white' : 'text-white/40'}`}>{driver.name}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#94a3b8]">{driver.rating} ★</span>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedDriverForHistory(driver)}
                      className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Clock size={12} /> Trip History
                    </button>
                  </div>
                ))}
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4">
                 <p className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-widest mb-1">Health index</p>
                 <p className="text-base font-black text-white">96%</p>
              </div>
              <div className="glass p-4">
                 <p className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-widest mb-1">Logistics Rate</p>
                 <p className="text-base font-black text-emerald-main">Optimal</p>
              </div>
           </div>

           {/* Logi AI */}
           <div className="bg-emerald-deep/20 border border-emerald-main/20 p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                 <Zap className="w-3.5 h-3.5 text-emerald-main fill-emerald-main" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-main">Smart Dispatch</p>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed font-medium">
                "{activeShipments.length > 0 ? `Optimizing routes for your active shipments. Route NH-12 is currently the fastest path.` : 'Ready to suggest the best logistics partners once you accept orders from wholesalers.'}"
              </p>
           </div>
        </div>
      </div>

      <ActionModal 
        {...modalConfig} 
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))} 
        onAction={() => setModalConfig(prev => ({...prev, isOpen: false}))}
      />

      {/* Driver Trip History Modal */}
      <AnimatePresence>
        {selectedDriverForHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDriverForHistory(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass p-8 border-emerald-main/30 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-main/20 rounded-2xl flex items-center justify-center text-emerald-main">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{selectedDriverForHistory.name}</h3>
                    <p className="text-[#94a3b8] text-sm mt-1 uppercase font-black tracking-widest">{selectedDriverForHistory.experience} Experience</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDriverForHistory(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-[#94a3b8] transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Total Trips</p>
                  <p className="text-2xl font-black text-white">
                    {orders.filter(o => o.driverId === selectedDriverForHistory.id && o.status === 'delivered').length}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Total Earnings</p>
                  <p className="text-2xl font-black text-emerald-main">
                    {formatCurrency(orders.filter(o => o.driverId === selectedDriverForHistory.id && o.status === 'delivered')
                      .reduce((acc, curr) => acc + (curr.transportationCharges || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest px-1">Recent Trip Log</h4>
                {orders.filter(o => o.driverId === selectedDriverForHistory.id && o.status === 'delivered').length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-xs text-[#94a3b8]">No completed trips on record for this driver.</p>
                  </div>
                ) : (
                  orders.filter(o => o.driverId === selectedDriverForHistory.id && o.status === 'delivered').map((trip) => (
                    <div key={trip.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-main/10 rounded-lg flex items-center justify-center text-emerald-main">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{trip.cropName || 'Produce'}</p>
                          <p className="text-[10px] text-[#94a3b8]">Order #{trip.id.slice(-4).toUpperCase()} • Delivered</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-main">+{formatCurrency(trip.transportationCharges || 0)}</p>
                        <p className="text-[9px] text-[#94a3b8]">Fare</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setSelectedDriverForHistory(null)}
                className="mt-8 w-full bg-emerald-main text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
              >
                Close Logs
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
