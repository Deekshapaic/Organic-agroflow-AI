import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  BarChart3, 
  ChevronRight,
  ArrowUpRight,
  Truck,
  Plus,
  RefreshCw,
  X,
  Clock,
  ShieldAlert,
  Zap,
  ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { ActionModal } from '../components/ActionModal';
import { Order, Alert, Crop } from '../types';
import { getExpandedRevenue, getMarketDemand } from '../services/analyticsData';
import RetailerAnalytics from './RetailerAnalytics';
import { OrganicProvenance } from '../components/OrganicProvenance';

export default function RetailerDashboard({ 
  currentTab, 
  setCurrentTab, 
  crops = [], 
  setCrops,
  orders = [], 
  setOrders, 
  handleUpdateOrder,
  handleAddOrder,
  handleDeleteOrder,
  profile, 
  addNotification, 
  alerts = [], 
  clearAlert,
  formatCurrency
}: { 
  currentTab: string, 
  setCurrentTab?: (tab: string) => void, 
  crops?: Crop[], 
  setCrops?: any,
  orders?: Order[], 
  setOrders?: any, 
  handleUpdateOrder?: (id: string, data: any) => Promise<void>,
  handleAddOrder?: (data: any) => Promise<void>,
  handleDeleteOrder?: (id: string) => Promise<void>,
  profile?: any, 
  addNotification?: (msg: string, sev?: 'low'|'high'|'critical', type?: string) => void, 
  alerts?: Alert[], 
  clearAlert?: (id: string) => void,
  formatCurrency: (amountINR: number) => string
}) {
  const { t } = useTranslation();
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string, actionFn?: () => void}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isLiquidationModalOpen, setIsLiquidationModalOpen] = useState(false);

  const [buyForm, setBuyForm] = useState({ orderId: '', cropId: '', quantity: 1, pricePerUnit: 100 });
  const [transferForm, setTransferForm] = useState({ cropId: '', quantity: 1, branchId: 'Branch B' });
  const [liquidationForm, setLiquidationForm] = useState({ 
    cropId: '', 
    quantity: 1, 
    targetWholesaler: 'w1',
    isCustom: false,
    customCropName: '',
    customUnit: 'Units',
    customPrice: 100
  });

  // Calculate retailer's actual stock based on delivered orders
  const retailerInventory = React.useMemo(() => {
    const stockMap = new Map<string, { id: string, cropId: string, name: string, unit: string, quantity: number, pricePerUnit: number, stockTracker: number, type: string, viabilityDeadline?: number }>();
    const myId = profile?.id || 'r1';
    
    crops.forEach(c => {
      if (!stockMap.has(c.id)) {
        stockMap.set(c.id, { ...c, id: c.id, cropId: c.id, stockTracker: 0, type: c.type });
      }
    });

    orders.filter(o => 
      o.buyerRole === 'retailer' && 
      o.retailerId === myId && 
      o.status === 'delivered'
    ).forEach(o => {
      const existing = stockMap.get(o.cropId) || { id: o.cropId, cropId: o.cropId, name: o.cropName || '', unit: o.cropUnit || 'Units', quantity: 0, pricePerUnit: 0, stockTracker: 0, type: 'vegetable' };
      
      const totalCost = (existing.stockTracker * existing.pricePerUnit) + (o.valueINR || 0);
      existing.stockTracker += o.quantity;
      existing.quantity += o.quantity;
      existing.pricePerUnit = totalCost / existing.stockTracker;
      
      // Track earliest deadline for the crop stock
      if (o.viabilityDeadline) {
        if (!existing.viabilityDeadline || o.viabilityDeadline < existing.viabilityDeadline) {
          existing.viabilityDeadline = o.viabilityDeadline;
        }
      }
      
      stockMap.set(o.cropId, existing);
    });

    return Array.from(stockMap.values());
  }, [orders, crops, profile]);

  const handleBuyOrder = (e: React.FormEvent, isEmergency: boolean = false) => {
    e.preventDefault();
    const crop = crops.find(c => c.id === buyForm.cropId);
    if (!crop || !handleAddOrder) return;

    const newOrder = {
      cropId: crop.id,
      cropName: crop.name,
      cropUnit: crop.unit,
      wholesalerId: 'w1', // Purchasing from wholesaler
      retailerId: profile?.id || profile?.uid || 'r1',
      buyerRole: 'retailer' as const,
      sellerRole: 'wholesaler' as const,
      quantity: buyForm.quantity,
      status: (isEmergency ? 'emergency_requested' : 'requested') as any,
      valueINR: buyForm.quantity * buyForm.pricePerUnit
    };

    handleAddOrder(newOrder);
    if (addNotification) {
      addNotification(`${isEmergency ? 'Emergency restock request' : 'New purchase request'} for ${buyForm.quantity} ${crop.unit} of ${crop.name} at ${formatCurrency(buyForm.pricePerUnit)}/unit sent to Wholesaler.`, 'high', 'demand');
    }
    setIsBuyModalOpen(false);
  };

  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    const crop = crops.find(c => c.id === transferForm.cropId);
    if (!crop || !handleAddOrder) return;

    const newOrder = {
      cropId: crop.id,
      cropName: crop.name,
      cropUnit: crop.unit,
      retailerId: profile?.id || profile?.uid || 'r1', // Sender
      buyerRole: 'retailer' as const, // Branch receiving
      sellerRole: 'retailer' as const, // Branch sending
      quantity: transferForm.quantity,
      status: 'accepted' as const,
      valueINR: transferForm.quantity * crop.pricePerUnit
    };

    handleAddOrder(newOrder);
    if (addNotification) {
      addNotification(`Branch transfer initiated for ${transferForm.quantity} ${crop.unit} of ${crop.name} to ${transferForm.branchId}. Delivery agent will be assigned.`, 'low', 'opportunity');
    }
    setIsTransferModalOpen(false);
  };

  const handleLiquidation = (e: React.FormEvent) => {
    e.preventDefault();
    
    let cropName = '';
    let cropUnit = '';
    let pricePerUnit = 0;
    let cropId = liquidationForm.cropId;

    if (liquidationForm.isCustom) {
      cropName = liquidationForm.customCropName || 'Custom Asset';
      cropUnit = liquidationForm.customUnit || 'Units';
      pricePerUnit = liquidationForm.customPrice;
      cropId = 'custom-' + Date.now();
    } else {
      const crop = crops.find(c => c.id === liquidationForm.cropId);
      if (!crop) return;
      cropName = crop.name;
      cropUnit = crop.unit;
      pricePerUnit = crop.pricePerUnit;
    }

    if (!handleAddOrder) return;

    const newOrder = {
      cropId,
      cropName,
      cropUnit,
      retailerId: profile?.id || profile?.uid || 'r1',
      wholesalerId: liquidationForm.targetWholesaler,
      buyerRole: 'wholesaler' as const,
      sellerRole: 'retailer' as const,
      quantity: liquidationForm.quantity,
      status: 'requested' as const,
      valueINR: liquidationForm.quantity * (liquidationForm.isCustom ? pricePerUnit : (pricePerUnit * 0.8)),
      isLiquidation: true
    };

    handleAddOrder(newOrder);
    if (addNotification) {
      addNotification(`Strategic liquidation initiated for ${liquidationForm.quantity} ${cropUnit} of ${cropName} back to Wholesaler.`, 'high', 'demand');
    }
    setIsLiquidationModalOpen(false);
  };

  const handleAcceptWholesaleOffer = async (order: Order) => {
    if (!handleUpdateOrder) return;
    await handleUpdateOrder(order.id, { 
      status: 'accepted',
      retailerStatus: 'accepted'
    });
    addNotification?.(`Stock purchase for ${order.cropName} confirmed. Logistics assignment pending from wholesaler.`, 'high', 'logistics');
  };

  const handleRejectWholesaleOffer = async (order: Order) => {
    if (!handleUpdateOrder) return;
    await handleUpdateOrder(order.id, { 
      status: 'rejected',
      retailerStatus: 'rejected',
      rejectionReason: 'Retailer requested price negotiation later.'
    });
    addNotification?.(`Offer for ${order.cropName} rejected. Wholesaler has been notified for negotiation.`, 'low', 'demand');
  };

  if (currentTab === 'Analytics') {
    return <RetailerAnalytics {...{ crops, setCrops, orders, setOrders, profile, addNotification, alerts, clearAlert, formatCurrency }} />;
  }

  if (currentTab === 'Dashboard') {
    const totalPurchases = orders.filter(o => o.buyerRole === 'retailer' && o.status !== 'delivered').length;
    const lowStockCount = retailerInventory.filter(c => c.stockTracker < 20).length;
    const inTransitCount = orders.filter(o => (o.buyerRole === 'retailer' || o.sellerRole === 'retailer') && o.status === 'shipped').length;
    const totalSpent = orders.filter(o => o.buyerRole === 'retailer').reduce((acc, o) => acc + (o.valueINR || 0), 0);

    const expandedRevenue = getExpandedRevenue();
    const marketDemand = getMarketDemand();

    return (
      <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-1">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inbound Logistics Active</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
              {t("Retail")} <span className="text-blue-400">{t("Optimization Hub")}</span>
            </h2>
            <p className="text-[#94a3b8] mt-2 text-sm font-medium leading-relaxed max-w-lg">
               Aggregating <span className="text-white">live consumer velocity</span> across local sectors. Stock buffers are within safety margins.
            </p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setCurrentTab?.('Inventory')} className="px-6 py-3 bg-emerald-main text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-main/20">
               Strategic Inventory
            </button>
          </div>
        </div>

        {/* Incoming Wholesaler Offers */}
        {orders.filter(o => (o.status === 'negotiating' || o.status === 'instant_sell_requested') && o.buyerRole === 'retailer').length > 0 && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <Truck size={14} /> Wholesale Supply Stream
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.filter(o => (o.status === 'negotiating' || o.status === 'instant_sell_requested') && o.buyerRole === 'retailer').map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-6 border-blue-500/30 bg-blue-500/[0.02] rounded-3xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
                  
                  <div className="flex justify-between items-start mb-6 text-white overflow-hidden">
                    <div className="min-w-0 pr-2">
                      <h4 className="text-lg font-black uppercase tracking-tight truncate">{order.cropName}</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 truncate">Premium Wholesaler Node</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black font-mono">{formatCurrency(order.valueINR || 0)}</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{order.quantity} {order.cropUnit}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleAcceptWholesaleOffer(order)}
                      className="flex-1 py-3 bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleRejectWholesaleOffer(order)}
                      className="flex-1 py-3 bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-white/10"
                    >
                      Negotiate
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SmallCard label="Active Purchase Streams" value={totalPurchases.toString()} sub="Network Active" positive />
          <SmallCard label="Deficit Alerts" value={lowStockCount.toString()} sub="Restock Required" warning={lowStockCount > 0} />
          <SmallCard label="In-Transit Units" value={inTransitCount.toString()} sub="Logistics Verified" positive />
          <SmallCard label="System Liquidity" value={formatCurrency(totalSpent)} sub="MTD Value" positive />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Recent Activities */}
           <div className="lg:col-span-2 glass overflow-hidden relative">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Live Logistics Stream</h3>
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-main animate-pulse" />
                </div>
              </div>
              <div className="p-0">
                 {orders.filter(o => o.buyerRole === 'retailer' || o.sellerRole === 'retailer').slice(-6).reverse().map(order => (
                   <div key={order.id} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${order.status === 'delivered' ? 'bg-emerald-main/10 border-emerald-main/20 text-emerald-main' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            {order.sellerRole === 'retailer' ? <RefreshCw size={16} /> : <ShoppingCart size={16} />}
                         </div>
                         <div>
                            <p className="font-black text-sm text-white">{order.cropName}</p>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                              {order.quantity} {order.cropUnit} • {order.sellerRole === 'retailer' ? 'Internal Transfer' : 'External Purchase'}
                            </p>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-black text-white">{formatCurrency(order.valueINR || 0)}</p>
                        <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-md border mt-1.5 inline-block
                          ${order.status === 'delivered' ? 'bg-emerald-main/10 border-emerald-main/20 text-emerald-main' : 
                            order.status === 'shipped' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                            'bg-white/5 border-white/10 text-slate-500'}
                        `}>
                          {order.status}
                        </span>
                      </div>
                   </div>
                 ))}
                 {orders.filter(o => o.buyerRole === 'retailer' || o.sellerRole === 'retailer').length === 0 && (
                   <div className="py-20 text-center">
                     <p className="text-slate-500 text-sm font-medium italic">No recent logistical packets found.</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Efficiency Card */}
           <div className="glass p-8 flex flex-col justify-between border-dashed border-white/10 relative overflow-hidden bg-emerald-main/[0.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-main/5 blur-3xl rounded-full" />
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">Stock Efficiency</h3>
                <div className="flex items-center gap-4 mb-6">
                   <div className="text-4xl font-black text-emerald-main font-mono">94%</div>
                   <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Healthy</p>
                      <p className="text-xs font-bold text-emerald-main/70">Wastage Refined</p>
                   </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                   FairFlow AI optimizes inventory rotation based on near-expiry logic and consumer velocity data.
                </p>
              </div>
              <button 
                onClick={() => setCurrentTab?.('Inventory')}
                className="w-full py-4 bg-emerald-main text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(99,102,241,0.3)] mt-8"
              >
                Stock Reconciliation
              </button>
           </div>
           {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'delivered').length > 0 && (
             <div className="lg:col-span-1">
                <OrganicProvenance order={orders.filter(o => o.buyerRole === 'retailer' && o.status === 'delivered')[0]} />
             </div>
           )}
        </div>
      </div>
    );
  }

  if (currentTab === 'Inventory') {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Stock Control Protocol</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-white">
              Inventory <span className="text-blue-400">Tactical Node</span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
              Authorized to reconcile local assets and initiate inter-branch transfers.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (crops.length > 0) {
                  setBuyForm({ orderId: '', cropId: crops[0].id, quantity: 1, pricePerUnit: crops[0].pricePerUnit || 100 });
                  setIsBuyModalOpen(true);
                }
              }}
              className="bg-emerald-main text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-xl"
            >
              <Plus size={14} /> Buy Stock
            </button>
            <button 
              onClick={() => {
                if (crops.length > 0) {
                  setTransferForm({ cropId: crops[0].id, quantity: 1, branchId: 'Branch B' });
                  setIsTransferModalOpen(true);
                }
              }}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} /> Branch Transfer
            </button>
            <button 
              onClick={() => {
                if (retailerInventory.length > 0) {
                  const firstWithStock = retailerInventory.find(i => i.stockTracker > 0) || retailerInventory[0];
                  setLiquidationForm({ 
                    cropId: firstWithStock.id, 
                    quantity: Math.floor(firstWithStock.stockTracker * 0.2), 
                    targetWholesaler: 'w1',
                    isCustom: false,
                    customCropName: '',
                    customUnit: 'Units',
                    customPrice: 100
                  });
                  setIsLiquidationModalOpen(true);
                }
              }}
              className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
            >
              <Zap size={14} /> Sell Excess to Wholesaler
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Asset Reconciliation</h3>
                <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/10">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-time Telemetry</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {retailerInventory.map(crop => (
                  <div key={crop.id} className={`p-5 rounded-2xl border transition-all flex flex-col group relative overflow-hidden ${crop.stockTracker < 20 ? 'bg-rose-500/[0.03] border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]' : 'bg-white/[0.02] border-white/5 hover:border-emerald-main/20'}`}>
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                        {crop.type === 'grain' ? '🌾' : crop.type === 'vegetable' ? '🥬' : '🍎'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-white uppercase tracking-tight">{crop.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Asset ID: {crop.id.slice(0, 8)}</p>
                      </div>
                      {crop.stockTracker < 20 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase text-rose-500 tracking-widest">Low</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                       <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Volumetric Stock</p>
                         <p className={`text-lg font-black font-mono ${crop.stockTracker < 20 ? 'text-rose-400' : 'text-emerald-main'}`}>
                           {crop.stockTracker} {crop.unit}
                         </p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Market Valuation</p>
                         <p className="text-lg font-black text-white font-mono">{formatCurrency(crop.pricePerUnit)}</p>
                       </div>
                    </div>

                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-6">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 ${crop.stockTracker < 20 ? 'bg-rose-500' : 'bg-emerald-main'}`}
                         style={{ width: `${Math.min(100, (crop.stockTracker / 100) * 100)}%` }} 
                       />
                    </div>

                    {crop.viabilityDeadline ? (
                      <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <Clock size={16} className={Date.now() > crop.viabilityDeadline - (1000 * 60 * 60 * 24) ? "text-orange-500 animate-pulse" : "text-blue-400"} />
                            <div>
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Viability Horizon</p>
                               <p className={`text-[10px] font-bold ${Date.now() > crop.viabilityDeadline - (1000 * 60 * 60 * 24) ? "text-orange-500" : "text-white"}`}>
                                  {Date.now() > crop.viabilityDeadline ? "EXPIRED" : `${Math.floor((crop.viabilityDeadline - Date.now()) / (1000 * 60 * 60 * 24))} Days Remaining`}
                               </p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${Date.now() > crop.viabilityDeadline ? "text-rose-500" : "text-emerald-main"}`}>
                               {Date.now() > crop.viabilityDeadline ? "Critical" : "Optimal"}
                            </p>
                         </div>
                      </div>
                    ) : (
                      <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                         <ShieldAlert size={16} className="text-slate-600" />
                         <p className="text-[10px] font-bold text-slate-500 italic">No viability telemetry found for this asset.</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                       <button 
                          onClick={() => {
                            setBuyForm({ orderId: '', cropId: crop.id, quantity: 50, pricePerUnit: crop.pricePerUnit });
                            setIsBuyModalOpen(true);
                          }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${crop.stockTracker < 20 ? 'bg-rose-500 text-white border-white/10' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-emerald-main hover:text-white'}`}
                       >
                          Procure
                       </button>
                       {crop.stockTracker > 0 && (
                          <button 
                             onClick={() => {
                                setLiquidationForm({ 
                                  cropId: crop.id, 
                                  quantity: crop.stockTracker, 
                                  targetWholesaler: 'w1',
                                  isCustom: false,
                                  customCropName: '',
                                  customUnit: 'Units',
                                  customPrice: 100
                                });
                                setIsLiquidationModalOpen(true);
                             }}
                             className="flex-1 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                          >
                             Liquidate
                          </button>
                       )}
                    </div>
                    {crop.stockTracker < 20 && (
                      <button 
                       onClick={() => {
                          setBuyForm({ orderId: '', cropId: crop.id, quantity: 50, pricePerUnit: crop.pricePerUnit });
                          // This is a bit hacky because handleBuyOrder is in a form submit handler.
                          // I'll create a dedicated emergency handler
                          const e = { preventDefault: () => {} } as React.FormEvent;
                          handleBuyOrder(e, true);
                       }}
                       className="w-full mt-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border bg-rose-700 text-white border-white/10 animate-pulse hover:bg-rose-800"
                    >
                       Emergency Restock
                    </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Negotiation Items */}
            {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'rejected').map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl bg-rose-500/[0.03] border border-rose-500/20 hover:border-rose-500/40 relative overflow-hidden group transition-all"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      if (handleDeleteOrder) {
                        handleDeleteOrder(order.id);
                      }
                    }}
                    className="text-rose-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">
                    Negotiation Protocol
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mb-2 uppercase tracking-tight">{order.cropName} Notification</h4>
                <p className="text-xs text-rose-200/50 font-medium mb-6 italic leading-relaxed">
                  "{order.rejectionReason || 'Wholesaler has returned the request for negotiation or stock update.'}"
                </p>
                <button 
                  onClick={() => {
                    setBuyForm({ 
                      orderId: order.id,
                      cropId: order.cropId, 
                      quantity: order.quantity, 
                      pricePerUnit: (order.valueINR || 0) / order.quantity 
                    });
                    setIsBuyModalOpen(true);
                  }}
                  className="w-full py-4 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-rose-400 transition-all shadow-xl shadow-rose-500/20 border border-white/10"
                >
                  Adjust & Resubmit
                </button>
              </motion.div>
            ))}

            <div className="glass rounded-3xl p-6 border border-white/5 relative overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Pending Operations</h3>
                  <div className="p-2 bg-white/5 rounded-xl text-slate-400">
                    <Truck size={14} />
                  </div>
               </div>

               <div className="space-y-4">
                {orders.filter(o => (o.buyerRole === 'retailer' || o.sellerRole === 'retailer') && ['requested', 'accepted', 'shipped'].includes(o.status)).slice(0, 4).map(order => (
                  <div key={order.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative group flex flex-col hover:bg-white/[0.04] transition-all">
                    <div className="flex justify-between items-start mb-3">
                       <div>
                          <p className="font-black text-white text-sm uppercase tracking-tight">{order.cropName}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{order.quantity} {order.cropUnit}</p>
                       </div>
                       <span className={`text-[8px] px-2 py-0.5 rounded-lg border font-black uppercase tracking-[0.2em]
                         ${order.status === 'requested' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-emerald-main/10 border-emerald-main/20 text-emerald-main'}
                       `}>{order.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1.5 grayscale opacity-50">
                         {order.sellerRole === 'retailer' ? <RefreshCw size={10} /> : <ShoppingCart size={10} />}
                         <span className="text-[9px] text-slate-500 font-bold uppercase">{order.sellerRole === 'retailer' ? 'Transfer' : 'Purchase'}</span>
                      </div>
                      
                      {order.status === 'shipped' && order.isPickedUp && order.buyerRole === 'retailer' && (
                        <button 
                          onClick={() => {
                            if (handleUpdateOrder) {
                              handleUpdateOrder(order.id, { status: 'delivered' });
                              addNotification?.("Shipment received successfully. Stock updated.", "low", "opportunity");
                            }
                          }}
                          className="bg-emerald-main text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-main/20"
                        >
                          Receive
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {orders.filter(o => (o.buyerRole === 'retailer' || o.sellerRole === 'retailer') && ['requested', 'accepted', 'shipped'].includes(o.status)).length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">No active ops</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buy Stock Modal */}
        {isBuyModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold">Buy from Wholesaler</h3>
                <button onClick={() => setIsBuyModalOpen(false)} className="text-[#94a3b8] hover:text-white">
                   <ChevronRight className="rotate-45" /> {/* lazy X */}
                </button>
              </div>
              <form onSubmit={handleBuyOrder} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Select Crop</label>
                  <select 
                    value={buyForm.cropId}
                    onChange={(e) => {
                      const c = crops.find(crop => crop.id === e.target.value);
                      setBuyForm({...buyForm, orderId: '', cropId: e.target.value, quantity: 1, pricePerUnit: c?.pricePerUnit || 100});
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50 appearance-none"
                  >
                    <option value="" disabled>Select crop...</option>
                    {crops.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.name} - {formatCurrency(c.pricePerUnit)}/{c.unit}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={buyForm.quantity}
                      onChange={(e) => setBuyForm({...buyForm, quantity: parseInt(e.target.value) || 0})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Target Price / Unit</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={buyForm.pricePerUnit}
                      onChange={(e) => setBuyForm({...buyForm, pricePerUnit: parseInt(e.target.value) || 0})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsBuyModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-white/5">Cancel</button>
                  <button type="submit" className="bg-emerald-main text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-shadow">Submit Order</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Transfer Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold">Transfer to Another Branch</h3>
                <button onClick={() => setIsTransferModalOpen(false)} className="text-[#94a3b8] hover:text-white">
                   <X />
                </button>
              </div>
              <form onSubmit={handleTransferStock} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Select Crop</label>
                  <select 
                    value={transferForm.cropId}
                    onChange={(e) => {
                      setTransferForm({...transferForm, cropId: e.target.value});
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    <option value="" disabled>Select crop...</option>
                    {crops.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.name} - In Stock: {retailerInventory.find(ri => ri.id === c.id)?.stockTracker}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={transferForm.quantity}
                      onChange={(e) => setTransferForm({...transferForm, quantity: parseInt(e.target.value) || 0})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Destination Branch</label>
                    <input 
                      type="text" 
                      value={transferForm.branchId}
                      onChange={(e) => setTransferForm({...transferForm, branchId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="e.g. Branch B"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-white/5">Cancel</button>
                  <button type="submit" className="bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-shadow">Initiate Transfer & Request Delivery Agent</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Liquidation Modal */}
        {isLiquidationModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0f172a] border border-white/10 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold uppercase tracking-tighter">Strategic Liquidation</h3>
                <button onClick={() => setIsLiquidationModalOpen(false)} className="text-[#94a3b8] hover:text-white">
                   <X />
                </button>
              </div>
              <form onSubmit={handleLiquidation} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 mb-2">
                   <div className="flex items-center gap-2">
                      <Zap size={14} className="text-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Reconciliation</span>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setLiquidationForm({...liquidationForm, isCustom: !liquidationForm.isCustom})}
                     className={`w-12 h-6 rounded-full transition-colors relative ${liquidationForm.isCustom ? 'bg-rose-500' : 'bg-slate-700'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${liquidationForm.isCustom ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>

                {!liquidationForm.isCustom ? (
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Select Excess Asset</label>
                    <select 
                      value={liquidationForm.cropId}
                      onChange={(e) => {
                        setLiquidationForm({...liquidationForm, cropId: e.target.value});
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50 appearance-none shadow-inner"
                    >
                      <option value="" disabled>Select crop...</option>
                      {retailerInventory.filter(i => i.stockTracker > 0).map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.name} - Available: {c.stockTracker} {c.unit}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Asset Nominal Name</label>
                      <input 
                        type="text" 
                        value={liquidationForm.customCropName}
                        onChange={(e) => setLiquidationForm({...liquidationForm, customCropName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50"
                        placeholder="e.g. Rare Saffron Hybrid"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Unit Type</label>
                        <input 
                          type="text" 
                          value={liquidationForm.customUnit}
                          onChange={(e) => setLiquidationForm({...liquidationForm, customUnit: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50"
                          placeholder="kg, boxes, quintals"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Target Unit Price</label>
                        <input 
                          type="number" 
                          value={liquidationForm.customPrice}
                          onChange={(e) => setLiquidationForm({...liquidationForm, customPrice: parseInt(e.target.value) || 0})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={!liquidationForm.isCustom ? (retailerInventory.find(ri => ri.id === liquidationForm.cropId)?.stockTracker || 1) : undefined}
                      value={liquidationForm.quantity}
                      onChange={(e) => setLiquidationForm({...liquidationForm, quantity: parseInt(e.target.value) || 0})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Reconciliation Node</label>
                    <select 
                      value={liquidationForm.targetWholesaler}
                      onChange={(e) => setLiquidationForm({...liquidationForm, targetWholesaler: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50 appearance-none"
                    >
                      <option value="w1" className="bg-[#0f172a]">Delhi Wholesale Hub</option>
                      <option value="w2" className="bg-[#0f172a]">Mumbai Agri-Center</option>
                      <option value="w3" className="bg-[#0f172a]">Strategic Reserve HUB</option>
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldAlert size={12} /> Liquidity Advisory
                   </p>
                   <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                     {liquidationForm.isCustom 
                       ? "Custom reconciliation allows liquidation of non-standard assets verified by physical terminal inspectors."
                       : "Standard liquidation is processed at a 20% system discount for immediate node balancing."}
                   </p>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsLiquidationModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#94a3b8] hover:text-white hover:bg-white/5">Abort</button>
                  <button type="submit" className="bg-rose-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-shadow">Finalize Recon</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-12 text-[#94a3b8] font-bold">
      Section '{currentTab}' under development for Retailer.
    </div>
  );
}

function SmallCard({ label, value, sub, positive, warning }: any) {
  return (
    <div className="glass p-5 group transition-all hover:border-emerald-main/40 relative overflow-hidden rounded-2xl bg-white/[0.02]">
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-emerald-main/10 transition-colors pointer-events-none" />
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={`text-2xl font-black font-mono tracking-tighter ${warning ? 'text-orange-500' : 'text-white'}`}>{value}</h3>
      </div>
      <p className={`mt-2 text-[9px] font-black uppercase tracking-[0.2em] ${warning ? 'text-orange-500 animate-pulse' : 'text-emerald-main'}`}>
        {sub}
      </p>
    </div>
  );
}
