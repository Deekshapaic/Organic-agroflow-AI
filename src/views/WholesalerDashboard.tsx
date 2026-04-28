import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  ShoppingCart, 
  MapPin, 
  TrendingUp, 
  BarChart3, 
  ChevronRight,
  ArrowUpRight,
  Truck,
  Layers,
  Search,
  Filter,
  X,
  Plus,
  Globe,
  RefreshCcw
} from 'lucide-react';
import { ActionModal } from '../components/ActionModal';
import { Order, Alert } from '../types';
import { getDemandPredictions, DemandPrediction } from '../services/geminiService';
import { getLogisticsVelocity, getMarketDemand, getExpandedRevenue } from '../services/analyticsData';
import WholesalerAnalytics from './WholesalerAnalytics';
import LogisticsMap from '../components/LogisticsMap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const retailDemand = [
  { name: 'Zepto', demand: 45, status: 'Increasing' },
  { name: 'Blinkit', demand: 38, status: 'Stable' },
  { name: 'DMart', demand: 62, status: 'High' },
  { name: 'BigBasket', demand: 25, status: 'Decreasing' },
];

export default function WholesalerDashboard({ 
  currentTab, 
  setCurrentTab, 
  crops = [], 
  orders = [], 
  setOrders, 
  handleUpdateOrder,
  handleAddOrder,
  profile, 
  addNotification, 
  alerts = [], 
  clearAlert,
  formatCurrency
}: { 
  currentTab: string, 
  setCurrentTab?: (tab: string) => void, 
  crops?: any[], 
  orders?: Order[], 
  setOrders?: any, 
  handleUpdateOrder?: (id: string, data: any) => Promise<void>,
  handleAddOrder?: (data: any) => Promise<void>,
  profile?: any, 
  addNotification?: (msg: string, sev?: 'low'|'high'|'critical', type?: string) => void, 
  alerts?: Alert[], 
  clearAlert?: (id: string) => void,
  formatCurrency: (amountINR: number) => string
}) {
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string, actionFn?: () => void}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('crop'); // 'crop', 'farmer', 'location'
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellForm, setSellForm] = useState({ orderId: '', cropId: '', quantity: 1, pricePerUnit: 100, retailer: '' });

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ 
    orderId: '', 
    cropId: '', 
    customCropName: '', 
    customUnit: 'kg',
    quantity: 1, 
    pricePerUnit: 100, 
    isCustom: false 
  });

  const [predictions, setPredictions] = useState<DemandPrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  const logisticsVelocity = getLogisticsVelocity();
  const marketDemand = getMarketDemand();
  const expandedRevenue = getExpandedRevenue();

  React.useEffect(() => {
    const fetchPredictions = async () => {
      setIsLoadingPredictions(true);
      const data = await getDemandPredictions();
      setPredictions(data);
      setIsLoadingPredictions(false);
    };
    fetchPredictions();
  }, []);

  // Calculate Wholesaler's actual owned inventory
  const ownedInventory = React.useMemo(() => {
    const stockMap = new Map<string, { cropId: string, name: string, unit: string, quantity: number, pricePerUnit: number, viabilityDeadline?: number }>();
    const myId = profile?.id || 'w1';
    
    // 1. Add completed purchases from farmers
    orders.filter(o => 
      o.wholesalerId === myId && 
      o.status === 'delivered' && 
      o.buyerRole !== 'retailer' &&
      o.sellerRole !== 'wholesaler'
    ).forEach(o => {
      const existing = stockMap.get(o.cropId) || { cropId: o.cropId, name: o.cropName || '', unit: o.cropUnit || 'Units', quantity: 0, pricePerUnit: 0 };
      
      // Update quantity and weighted average price
      const totalCost = (existing.quantity * existing.pricePerUnit) + (o.valueINR || 0);
      existing.quantity += o.quantity;
      existing.pricePerUnit = totalCost / existing.quantity;

      if (o.viabilityDeadline) {
        if (!existing.viabilityDeadline || o.viabilityDeadline < existing.viabilityDeadline) {
          existing.viabilityDeadline = o.viabilityDeadline;
        }
      }
      
      stockMap.set(o.cropId, existing);
    });

    // 2. Subtract sales to retailers (subtract as soon as they are active to reserve stock)
    orders.filter(o => 
      o.sellerRole === 'wholesaler' && 
      o.wholesalerId === myId &&
      !['rejected', 'cancelled'].includes(o.status)
    ).forEach(o => {
       if (stockMap.has(o.cropId)) {
         const existing = stockMap.get(o.cropId)!;
         existing.quantity -= o.quantity;
       } else {
         // This shouldn't happen with strict inventory, but for safety in mock data environments:
         // stockMap.set(o.cropId, { cropId: o.cropId, name: o.cropName || '', unit: o.cropUnit || 'Units', quantity: -o.quantity, pricePerUnit: 0 });
       }
    });

    return Array.from(stockMap.values()).filter(c => c.quantity > 0);
  }, [orders, profile]);

  const handleRequestOrder = (crop: any) => {
    if (handleAddOrder) {
      const newOrder = {
        cropId: crop.id,
        cropName: crop.name,
        cropUnit: crop.unit,
        farmerId: crop.farmerId || 'unknown',
        wholesalerId: profile?.id || profile?.uid || 'w1',
        quantity: crop.quantity,
        status: 'requested' as const,
        valueINR: crop.quantity * (crop.pricePerUnit || 100)
      };
      handleAddOrder(newOrder);
      if (addNotification) {
        addNotification(`New order request from ${profile?.name || 'Wholesaler'} for ${crop.quantity} ${crop.unit} of ${crop.name}`, 'high', 'demand');
      }
      setModalConfig({
        isOpen: true,
        title: 'Order Requested',
        desc: `You have successfully requested ${crop.quantity} ${crop.unit} of ${crop.name}.`,
        actionLabel: 'Close',
        actionFn: () => setModalConfig(prev => ({...prev, isOpen: false}))
      });
    }
  };

  const handleCreateCustomOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    let cropName = '';
    let cropUnit = 'Units';
    let farmerId = 'unknown';
    let cropId = newOrderForm.cropId;

    if (newOrderForm.isCustom) {
      cropName = newOrderForm.customCropName || 'Custom Crop';
      cropUnit = newOrderForm.customUnit || 'Units';
      cropId = 'custom-' + Date.now();
    } else {
      const crop = crops.find(c => c.id === newOrderForm.cropId);
      if (crop) {
        cropName = crop.name;
        cropUnit = crop.unit;
        farmerId = crop.farmerId || 'unknown';
      } else {
        // Fallback for reprocure of items not in current market view
        cropName = newOrderForm.customCropName || 'Reprocured Crop';
        cropUnit = newOrderForm.customUnit || 'Units';
        if (!newOrderForm.cropId.startsWith('custom-')) {
           // If it has a real cropId but not in market, we still need a farmerId
           // In a real app we'd look this up, for now keep 'unknown' for broadcast
           farmerId = 'unknown'; 
        }
      }
    }

    if (!handleAddOrder) return;

    const newOrder = {
      cropId: cropId,
      cropName: cropName,
      cropUnit: cropUnit,
      farmerId: farmerId,
      wholesalerId: profile?.id || profile?.uid || 'w1',
      quantity: newOrderForm.quantity,
      status: 'requested' as const,
      valueINR: newOrderForm.quantity * newOrderForm.pricePerUnit
    };

    handleAddOrder(newOrder);
    setIsNewOrderModalOpen(false);
    if (addNotification) {
      addNotification(`${newOrderForm.isCustom ? 'Broadcast' : 'Updated offer'} for ${newOrderForm.quantity} ${cropUnit} of ${cropName} sent to ${newOrderForm.isCustom ? 'all nearby farmers' : 'farmer'}.`, 'high', 'demand');
    }
  };

  const handleRejectOrder = (order: Order, customReason?: string) => {
    if (handleUpdateOrder) {
      const reason = customReason || 'Order rejected by wholesaler.';
      handleUpdateOrder(order.id, { 
        status: 'rejected', 
        rejectionReason: reason 
      });
      addNotification?.(`Order rejected for ${order.cropName}: ${reason}`, "low", "inventory");
    }
  };

  const handleRejectOutOfStock = (order: Order) => {
    handleRejectOrder(order, "Out of stock, will assist you by another retailer");
  };

  const handleSellToRetailer = (e: React.FormEvent) => {
    e.preventDefault();
    const crop = ownedInventory.find(c => c.cropId === sellForm.cropId);
    if (!crop || !handleAddOrder) return;

    if (sellForm.quantity > crop.quantity) {
      if (addNotification) addNotification('Cannot sell more than owned stock.', 'critical', 'demand');
      return;
    }

    const newOrder = {
      cropId: crop.cropId,
      cropName: crop.name,
      cropUnit: crop.unit,
      wholesalerId: profile?.id || profile?.uid || 'w1',
      retailerId: sellForm.retailer || 'r1',
      buyerRole: 'retailer' as const,
      sellerRole: 'wholesaler' as const,
      quantity: sellForm.quantity,
      status: 'requested' as const,
      retailerStatus: 'pending' as const,
      valueINR: sellForm.quantity * sellForm.pricePerUnit,
      negotiatedPrice: sellForm.pricePerUnit,
      wholesalerCoords: profile?.coords || [19.0760, 72.9989],
      retailerCoords: [13.0827, 80.2707], // Chennai
      retailerAddress: 'Anna Salai, Chennai, Tamil Nadu 600002'
    };

    handleAddOrder(newOrder);
    setIsSellModalOpen(false);
    if (addNotification) {
      addNotification(`Sales proposal for ${sellForm.quantity} ${crop.unit} of ${crop.name} sent to ${sellForm.retailer || 'Retailer'}.`, 'high', 'logistics');
    }
  };
  
  const handleAcceptRetailerRequest = (order: Order) => {
    if (!handleUpdateOrder) return;
    
    const stockItem = ownedInventory.find(item => item.cropId === order.cropId);
    
    if (!stockItem || stockItem.quantity < order.quantity) {
      if (addNotification) {
        addNotification(`Insufficient stock of ${order.cropName} in warehouse to fulfill this request.`, 'critical', 'inventory');
      }
      return;
    }

    handleUpdateOrder(order.id, { 
      status: 'accepted', 
      wholesalerId: profile?.id || profile?.uid || 'w1'
    });

    if (addNotification) {
      addNotification(`Stock allocation for ${order.cropName} confirmed. Logistics assignment required.`, 'high', 'logistics');
    }
  };

  const handleAcceptFarmerRequest = (order: Order) => {
    if (!handleUpdateOrder) return;

    handleUpdateOrder(order.id, { 
      status: 'delivered', 
      wholesalerId: profile?.id || profile?.uid || 'w1'
    });

    if (addNotification) {
      addNotification(`Accepted offer for ${order.cropName} from farmer. Stock added to warehouse.`, 'high', 'logistics');
    }
  };

  const activeShipments = orders.filter(o => o.status === 'shipped' && o.wholesalerId === (profile?.id || 'w1'));

  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleInitOrder = (e: any) => {
      const crop = e.detail;
      setNewOrderForm({ 
        orderId: '',
        cropId: crop.id || '', 
        customCropName: crop.name || '',
        customUnit: crop.unit || 'kg',
        quantity: crop.quantity || 1, 
        pricePerUnit: crop.pricePerUnit || 100,
        isCustom: !crop.id
      });
      setIsNewOrderModalOpen(true);
    };
    window.addEventListener('init-custom-order', handleInitOrder);
    return () => window.removeEventListener('init-custom-order', handleInitOrder);
  }, []);

  const formatTimeLeft = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const handleReceiveShipment = (orderId: string) => {
    if (handleUpdateOrder) {
      handleUpdateOrder(orderId, { status: 'delivered' });
      if (addNotification) {
        addNotification(`Shipment for Order #${orderId.slice(-4)} successfully received and inventoried.`, 'low', 'logistics');
      }
    }
  };

  const sortedAndFilteredCrops = crops.filter(c => {
    const isAlreadyRequested = orders.some(o => o.cropId === c.id && o.wholesalerId === (profile?.id || 'w1'));
    if (isAlreadyRequested) return false;

    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.farmerName && c.farmerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.farmerLocation && c.farmerLocation.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }).sort((a, b) => {
    if (sortBy === 'farmer') return (a.farmerName || '').localeCompare(b.farmerName || '');
    if (sortBy === 'location') return (a.farmerLocation || '').localeCompare(b.farmerLocation || '');
    return a.name.localeCompare(b.name);
  });

  const handleInstantSellToMarket = async (item: any) => {
    if (!handleAddOrder) return;
    
    const newOrder = {
      cropId: item.cropId,
      cropName: item.name,
      cropUnit: item.unit,
      wholesalerId: profile?.id || profile?.uid || 'w1',
      buyerRole: 'retailer' as const,
      sellerRole: 'wholesaler' as const,
      quantity: 10, // Default batch
      status: 'instant_sell_requested' as const,
      valueINR: 10 * (item.pricePerUnit * 1.15), // 15% markup for instant
      date: new Date().toISOString(),
      buyerName: 'Open Retail Network'
    };

    await handleAddOrder(newOrder);
    addNotification?.(`Instant sell offer for ${item.name} broadcasted to all retailers.`, 'high', 'logistics');
  };

  const handlePriceResubmit = async (order: Order, newPrice: number) => {
    if (!handleUpdateOrder) return;
    await handleUpdateOrder(order.id, { 
      valueINR: newPrice, 
      status: 'negotiating',
      rejectionReason: null 
    });
    addNotification?.(`Revised offer for ${order.cropName} submitted at ${formatCurrency(newPrice)}.`, 'low', 'opportunity');
  };

  if (currentTab === 'Analytics') {
    return <WholesalerAnalytics />;
  }

  if (currentTab === 'Inventory') {
    return (
      <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-end px-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Warehouse <span className="text-emerald-main italic">Strategic Node</span></h2>
            <p className="text-[#94a3b8] mt-1 text-sm font-medium">Monitoring regional stock influx and trade-cycle vectors.</p>
          </div>
          <div className="flex gap-3">
          </div>
        </div>

        {/* ACTIVE NEGOTIATIONS FEED */}
        {orders.filter(o => (o.status === 'negotiating' || o.status === 'rejected') && o.sellerRole === 'wholesaler').length > 0 && (
          <section className="space-y-4">
             <h3 className="text-[10px] font-black text-emerald-main uppercase tracking-[0.3em] px-2 flex items-center gap-2">
               <TrendingUp size={14} /> Negotiation Stream
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => (o.status === 'negotiating' || o.status === 'rejected') && o.sellerRole === 'wholesaler').map(order => (
                  <div key={order.id} className="glass p-5 border-white/5 hover:border-emerald-main/20 transition-all flex flex-col gap-4 bg-white/[0.01]">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white uppercase tracking-tighter">{order.cropName}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.quantity} {order.cropUnit} • Offer: {formatCurrency(order.valueINR || 0)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${order.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                        {order.status === 'rejected' ? 'REJECTED: NEGOTIATE LATER' : 'IN_NEGOTIATION'}
                      </span>
                    </div>
                    {order.status === 'rejected' && (
                      <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                           <X size={14} /> Price Revision Required by Retailer
                        </p>
                        <div className="flex gap-2">
                           <input 
                             type="number" 
                             defaultValue={order.valueINR}
                             className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-main/50 flex-1"
                           />
                           <button 
                             onClick={() => handlePriceResubmit(order, (order.valueINR || 0) * 0.95)}
                             className="bg-emerald-main text-black px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                           >
                             Resubmit
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Section 1: Owned Warehouse Inventory */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2 px-2">
               <Package className="text-emerald-main w-5 h-5" />
               <h3 className="text-xl font-black text-white uppercase tracking-tighter">My Warehouse Nodes</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownedInventory.length === 0 ? (
                <div className="col-span-2 glass p-12 text-center text-slate-500 uppercase tracking-widest font-black border-dashed border-white/10 italic">
                  Node Empty. Procure from Farmers to initiate wholesale cycle.
                </div>
              ) : (
                ownedInventory.map(item => (
                  <div key={item.cropId} className="glass group p-6 border-white/5 hover:border-emerald-main/30 transition-all flex flex-col justify-between h-56 relative overflow-hidden bg-white/[0.01]">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-main/5 blur-[50px] rounded-full group-hover:bg-emerald-main/10 transition-colors" />
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">{item.name}</h3>
                        <span className="bg-emerald-main/10 text-emerald-main text-[8px] font-black px-2 py-0.5 rounded-lg border border-emerald-main/10">
                          WHSE_STOCK
                        </span>
                      </div>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{item.unit} Stock Units</p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[#94a3b8] text-[9px] font-black uppercase tracking-widest mb-1">Stock Level</p>
                          <p className="text-2xl font-black text-white font-mono">{item.quantity} <span className="text-slate-500 text-xs">U</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#94a3b8] text-[9px] font-black uppercase tracking-widest mb-1">Local Value</p>
                          <p className="text-lg font-black text-emerald-main font-mono">₹{formatCurrency(item.pricePerUnit || 100)}</p>
                        </div>
                      </div>
                      
                      {item.viabilityDeadline && (
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 mt-1">
                           <div className="flex items-center gap-2">
                              <X size={10} className={Date.now() > item.viabilityDeadline - (1000 * 60 * 60 * 12) ? "text-orange-500" : "text-blue-400"} />
                              <span className="text-[8px] font-black uppercase text-slate-500">Viability Horizon:</span>
                           </div>
                           <span className={`text-[9px] font-bold ${Date.now() > item.viabilityDeadline - (1000 * 60 * 60 * 12) ? "text-orange-500" : "text-white"}`}>
                              {formatTimeLeft(item.viabilityDeadline)}
                           </span>
                        </div>
                      )}

                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-main" style={{ width: '45%' }} />
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                       <button 
                         onClick={() => handleInstantSellToMarket(item)}
                         className="flex-1 bg-emerald-main text-black py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-main/20"
                       >
                         Instant Sell
                       </button>
                       <button 
                         onClick={() => {
                           const crop = crops.find(c => c.id === item.cropId);
                           setNewOrderForm({ 
                             orderId: '', 
                             cropId: item.cropId, 
                             customCropName: item.name, 
                             customUnit: item.unit, 
                             quantity: item.quantity, 
                             pricePerUnit: item.pricePerUnit, 
                             isCustom: !crop 
                           });
                           setIsNewOrderModalOpen(true);
                         }}
                         className="flex-1 border border-purple-500/30 bg-purple-500/5 text-purple-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all text-center"
                       >
                         Reprocure
                       </button>
                       <button 
                         onClick={() => {
                           setSellForm({ ...sellForm, cropId: item.cropId, pricePerUnit: (item.pricePerUnit || 100) * 1.1, quantity: Math.ceil(item.quantity * 0.2), retailer: '' });
                           setIsSellModalOpen(true);
                         }}
                         className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-center"
                       >
                         Sell
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Global Market Supply */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe className="text-emerald-main w-5 h-5" />
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Global Market Supply</h3>
            </div>
            <div className="flex gap-2">
              <button 
                 onClick={() => {
                   setPredictions([]);
                   setIsLoadingPredictions(true);
                   setTimeout(() => setIsLoadingPredictions(false), 800);
                   if (addNotification) addNotification('Global Market Supply Feed Synchronized with Real-Time Nodes.', 'low', 'opportunity');
                 }}
                 className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl group"
                 title="Refresh Market Feed"
              >
                 <RefreshCcw size={14} className="group-active:rotate-180 transition-transform duration-500" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] w-3.5 h-3.5" />
                <input 
                  type="text"
                  placeholder="Filter market..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-emerald-main text-white w-48"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {sortedAndFilteredCrops.map((crop: any) => (
            <div key={crop.id} className="glass p-5 flex flex-col hover:border-emerald-main/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    crop.status === 'harvested' ? 'bg-orange-500/10 text-orange-500' :
                    crop.status === 'dispatched' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-emerald-main/10 text-emerald-main'
                  }`}>
                    {/* Add local lucide icons if possible, defaulting to generic box/leaf */}
                    <div className="font-bold text-lg">{crop.name.charAt(0)}</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#f8fafc]">{crop.name}</h3>
                    <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{crop.quantity} {crop.unit} • {crop.farmerName || 'Unknown Farmer'}, {crop.farmerLocation || 'Unknown Location'}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-emerald-main">
                  {crop.status}
                </span>
              </div>
              
              <div className="space-y-3 mt-auto">
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <span>Status: <strong className={`font-medium ${
                    crop.status === 'harvested' ? 'text-orange-500' :
                    crop.status === 'dispatched' ? 'text-blue-500' :
                    'text-emerald-main'
                  }`}>{crop.status.toUpperCase()}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <span>Price / {crop.unit}: <strong className="text-emerald-main font-bold">{formatCurrency(crop.pricePerUnit || 100)}</strong></span>
                </div>
                {crop.estimatedHarvestDate && (
                  <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                    <span>Harvest Date: <strong className="text-white">{crop.estimatedHarvestDate}</strong></span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-white/5 mt-2 flex gap-2">
                   {orders.some(o => o.cropId === crop.id) ? (
                     <button disabled className="flex-1 py-2 bg-white/5 text-[#94a3b8] text-xs font-bold rounded-lg uppercase tracking-widest cursor-not-allowed">
                       Order Requested
                     </button>
                   ) : (
                     <>
                       <button 
                         onClick={() => handleRequestOrder(crop)}
                         className="flex-1 py-2 bg-emerald-main text-bg-dark text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors uppercase tracking-widest"
                       >
                         Quick Buy
                       </button>
                       <button 
                          onClick={() => {
                            setNewOrderForm({ orderId: '', cropId: crop.id, customCropName: '', customUnit: crop.unit || 'kg', quantity: crop.quantity, pricePerUnit: crop.pricePerUnit, isCustom: false });
                            setIsNewOrderModalOpen(true);
                          }}
                          className="p-2 border border-white/10 rounded-lg hover:border-emerald-main/50 text-[#94a3b8] hover:text-emerald-main flex items-center gap-2"
                          title="New Custom Order"
                       >
                          <Plus size={14} /> <span className="text-[9px] font-black uppercase">Custom</span>
                       </button>
                     </>
                   )}
                </div>
              </div>
            </div>
          ))}
          {crops.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#94a3b8]">
              No crop records found.
            </div>
          )}
        </div>
      </div>
    </div>
    );
  }

  if (currentTab === 'Map View') {
    const mumbaiWholesalerCoords: [number, number] = [19.0760, 72.9989];
    
    // Get the first active shipment to track (or fallback)
    const activeShipments = orders.filter(o => 
      o.wholesalerId === (profile?.id || 'w1') && 
      o.buyerRole !== 'retailer' &&
      o.sellerRole !== 'wholesaler' &&
      (o.status === 'shipped' || o.status === 'accepted' || o.status === 'logistics_assigned')
    );
    
    // Default coords: Origin=Farm, Dest=Wholesaler Warehouse
    const trackedOrder = activeShipments.length > 0 ? activeShipments[0] : null;
    const isPickedUp = trackedOrder?.isPickedUp || false;

    // Use order's farmer coords if available, otherwise mock nearby Mumbai
    const farmerCoords = trackedOrder?.farmerCoords || [19.0760 - 0.2, 72.9989 - 0.1];

    return (
      <div className="h-[80vh] w-full rounded-[2.5rem] overflow-hidden p-2 bg-white/5 border border-white/10 relative">
         <div className="absolute top-8 left-8 z-20 bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
           <h3 className="text-white font-black uppercase tracking-tighter mb-1">Live Shipment Tracking</h3>
           {trackedOrder ? (
              <div>
                <p className="text-emerald-main text-xs font-bold uppercase tracking-widest mb-3">
                   {trackedOrder.cropName} - {trackedOrder.quantity} {trackedOrder.cropUnit}
                </p>
                <button 
                  onClick={() => {
                    if (handleUpdateOrder) {
                      handleUpdateOrder(trackedOrder.id, { status: 'delivered' });
                      addNotification?.('Shipment delivered and added to warehouse stock!', 'high', 'logistics');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-main text-black text-[10px] font-black uppercase tracking-widest rounded hover:bg-emerald-400 transition-colors"
                >
                  Simulate Delivery
                </button>
              </div>
           ) : (
             <p className="text-slate-400 text-xs font-bold">No active incoming shipments.</p>
           )}
         </div>
        <LogisticsMap farmerCoords={farmerCoords as [number, number]} wholesalerCoords={mumbaiWholesalerCoords} isPickedUp={isPickedUp} />
      </div>
    );
  }

  if (currentTab === 'Logistics') {
    const assignableOrders = orders.filter(o => 
      o.wholesalerId === (profile?.id || 'w1') && 
      o.sellerRole === 'wholesaler' && 
      o.status === 'accepted' && 
      !o.driverId
    );

    return (
      <div className="space-y-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Fleet <span className="text-emerald-main">Coordination</span></h2>
            <p className="text-[#94a3b8] mt-1 text-sm font-medium">Assign delivery agents to accepted retailer orders.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Truck className="text-blue-400 w-5 h-5" />
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Orders Awaiting Dispatch</h3>
             </div>
             {assignableOrders.length === 0 ? (
               <div className="py-12 glass border-dashed border-white/10 text-center text-slate-500 italic text-sm">
                 No orders pending driver assignment.
               </div>
             ) : (
               assignableOrders.map(order => (
                 <div key={order.id} className="glass p-6 border-blue-500/20 hover:border-blue-500/50 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full -mr-12 -mt-12" />
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight">{order.cropName}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">To: {order.retailerAddress || 'Retailer'}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-white">{order.quantity} {order.cropUnit}</p>
                          <span className="text-[9px] font-black text-emerald-main uppercase tracking-widest">ACCEPTED</span>
                       </div>
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6">
                       <div className="flex justify-between items-center mb-3">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Near Hub:</h5>
                          {order.otp && (
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-500 uppercase">Transit OTP:</span>
                               <span className="text-xs font-black text-emerald-main tracking-widest bg-emerald-main/10 px-2 py-0.5 rounded border border-emerald-main/10 animate-pulse">{order.otp}</span>
                            </div>
                          )}
                       </div>
                       <div className="space-y-3">
                          {/* We'll use a simplified driver list for this view */}
                          {['Rajesh K', 'Suresh R', 'Amit S'].map((dName, idx) => (
                            <div key={dName} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                     <Truck size={14} />
                                  </div>
                                  <span className="text-xs font-bold text-white">{dName}</span>
                               </div>
                               <button 
                                 onClick={() => {
                                   if (handleUpdateOrder) {
                                     handleUpdateOrder(order.id, { 
                                       status: 'logistics_assigned', 
                                       driverName: dName,
                                       driverId: `public_delivery`, // Assign to the shared delivery profile
                                       otp: Math.floor(1000 + Math.random() * 9000).toString() 
                                     });
                                     addNotification?.(`Driver ${dName} assigned. Provide OTP to start transit.`, 'high', 'logistics');
                                   }
                                 }}
                                 className="px-4 py-2 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                               >
                                 Dispatch
                               </button>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-emerald-main w-5 h-5" />
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Live Fleet Telemetry</h3>
             </div>
             <div className="h-[400px] glass rounded-[2rem] overflow-hidden p-2">
                <LogisticsMap 
                  farmerCoords={profile?.coords || [19.0760, 72.9989]} 
                  wholesalerCoords={[13.0827, 80.2707]} // Chennai
                  isPickedUp={false} 
                  activeOrders={orders}
                />
             </div>
          </div>
        </div>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-4">
             <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Global Supply Sync Active</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase">
            Supply Chain <span className="text-emerald-main italic">Intelligence</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            FairFlow nodes are processing <span className="text-white">14 retail streams</span> across the Metro Region. System health is optimal.
          </p>
        </div>
        <div className="flex gap-3">
           <button 
              onClick={() => {
                setNewOrderForm({ orderId: '', cropId: '', customCropName: '', customUnit: 'kg', quantity: 1, pricePerUnit: 100, isCustom: true });
                setIsNewOrderModalOpen(true);
              }}
              className="px-6 py-3 border border-emerald-main/20 text-emerald-main rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-main/5 transition-all flex items-center gap-2"
           >
             <Plus size={16} /> Strategic Procurement
           </button>
           <button onClick={() => setCurrentTab?.('Analytics')} className="px-6 py-3 bg-emerald-main text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-main/20">
             View AI Forecasts
          </button>
        </div>
      </div>

      {/* Pending Farmer Requests (Moved to top) */}
      {orders.filter(o => o.buyerRole === 'wholesaler' && o.status === 'requested').length > 0 && (
        <div className="space-y-3 px-2">
          <h4 className="text-[10px] font-black text-emerald-main uppercase tracking-[0.3em] flex items-center gap-2">
            <Package size={14} /> Critical Farmer Offers
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.filter(o => o.buyerRole === 'wholesaler' && o.status === 'requested').map(order => (
              <div key={order.id} className="glass p-5 border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col justify-between gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-white uppercase tracking-tighter">{order.cropName}</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.quantity} {order.cropUnit} @ {formatCurrency(order.valueINR || 0)}</p>
                  </div>
                  <span className="bg-emerald-main/10 text-emerald-main text-[8px] font-black px-2 py-0.5 rounded border border-emerald-main/10">INBOUND_REQ</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAcceptFarmerRequest(order)}
                    className="flex-1 py-2 bg-emerald-main text-black text-[10px] font-black uppercase tracking-widest rounded-xl"
                  >
                    Accept Offer
                  </button>
                  <button 
                    onClick={() => handleRejectOrder(order)}
                    className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500/20 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SmallCard 
          label="Total Warehouse Stock" 
          value={`${ownedInventory.reduce((acc, curr) => acc + curr.quantity, 0)} ${ownedInventory[0]?.unit || 'Units'}`} 
          sub="Inventory Active" 
        />
        <SmallCard 
          label="Pending Deliveries" 
          value={activeShipments.length.toString()} 
          sub="Logistics Inbound" 
        />
        <SmallCard 
          label="Procurement Spend" 
          value={formatCurrency(orders.filter(o => o.wholesalerId === (profile?.id || 'w1') && o.buyerRole !== 'retailer').reduce((acc, curr) => acc + (curr.valueINR || 0), 0))} 
          sub="Total Capital" 
        />
        <div className="glass p-5 border-emerald-main/30 bg-emerald-main/5 flex flex-col justify-center relative overflow-hidden rounded-2xl group hover:bg-emerald-main/10 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-main/10 blur-3xl rounded-full pointer-events-none" />
            <p className="text-[10px] font-black text-emerald-main uppercase tracking-widest mb-1">Strategic Index</p>
            <h4 className="text-lg font-black text-white leading-tight uppercase tracking-tighter">Bullish Market</h4>
            <p className="text-[10px] text-emerald-main font-bold mt-2 uppercase tracking-[0.2em] animate-pulse">Procurement Recommended</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Levels */}
        <div className="lg:col-span-2 glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Warehouse <span className="text-blue-400">Inventory</span> Flux</h3>
              <p className="text-xs text-slate-500 font-medium">Monitoring real-time owned stock and warehouse capacity.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-emerald-main bg-emerald-main/5 px-3 py-1.5 rounded-xl border border-emerald-main/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-main animate-pulse" /> SYSTEM READY
            </div>
          </div>
          
          <div className="h-48 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownedInventory.map((item, idx) => ({
                name: item.name,
                stock: item.quantity,
                capacity: 500, // Fixed visual scale
                color: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'][idx % 4]
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#475569" 
                  fontSize={10} 
                  width={60} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontWeight: 900 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                />
                <Bar dataKey="stock" radius={[0, 8, 8, 0]} barSize={20}>
                  {ownedInventory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#6366f1'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
            {ownedInventory.slice(0, 4).map((item, idx) => (
              <div key={item.cropId} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 glass-hover transition-all">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{item.name}</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-xl font-black text-white font-mono">{item.quantity}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase">{item.unit}</p>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                     style={{ width: `${Math.min(100, (item.quantity / 500) * 100)}%`, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1'][idx % 4] }} 
                   />
                </div>
              </div>
            ))}
            {ownedInventory.length === 0 && (
              <div className="col-span-full py-6 text-center text-slate-500 italic text-sm border-dashed border-white/5 border rounded-2xl gap-2 flex items-center justify-center">
                 <Package size={14} /> Warehouse empty. Receive stock to sell.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Market Intelligence */}
        <div className="glass p-8 flex flex-col relative overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-8 relative z-10">
             <div>
               <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Market Intel</h3>
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Cross-regional feed</p>
             </div>
             <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-2xl">
               <Layers size={20} />
             </div>
          </div>
          
          <div className="flex-1 space-y-4 relative z-10">
            {/* Negotiation Items */}
            {orders.filter(o => o.status === 'rejected').map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                className="p-5 rounded-[1.5rem] bg-rose-500/[0.03] border border-rose-500/20 hover:border-rose-500/40 relative overflow-hidden group transition-all"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setOrders?.(prev => prev.filter(o => o.id !== order.id))}
                    className="text-rose-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">
                    Negotiation Protocol
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mb-2 uppercase tracking-tight">{order.cropName} Counter-Offer</h4>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 mb-4">
                  <p className="text-[10px] text-rose-200/50 font-bold mb-1 uppercase tracking-widest">Farmer Feedback:</p>
                  <p className="text-xs text-rose-200/50 font-medium italic leading-relaxed">
                    "{order.rejectionReason || 'Farmer is demanding for more wholesale price'}"
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setNewOrderForm({ 
                      orderId: order.id,
                      cropId: order.cropId, 
                      customCropName: order.cropName || '',
                      customUnit: order.cropUnit || 'kg',
                      quantity: order.quantity, 
                      pricePerUnit: (order.valueINR || 0) / order.quantity,
                      isCustom: order.cropId.startsWith('custom-')
                    });
                    setIsNewOrderModalOpen(true);
                  }}
                  className="w-full py-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20 border border-white/10"
                >
                  Adjust Index & Resubmit
                </button>
              </motion.div>
            ))}

            {/* Standard Intel News */}
            {alerts.filter(a => a.type === 'news').length === 0 && orders.filter(o => o.status === 'rejected').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                <p className="text-slate-500 text-sm font-medium italic">Monitoring regional market shifts...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.filter(a => a.type === 'news').slice(0, 4).map((alert) => (
                  <motion.div 
                    key={alert.id} 
                    whileHover={{ x: 4 }}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-main/20 hover:bg-white/[0.04] transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg bg-emerald-main/10 text-emerald-main border border-emerald-main/10">
                        Intel
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed pr-6">{alert.message}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAlert?.(alert.id);
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retailer Demand & Requests */}
        <div className="lg:col-span-2 glass p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Market <span className="text-emerald-main">Demand</span> Signals</h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Retailer Connectivity</span>
          </div>

          {/* Removed Pending Farmer Requests (Moved to top) */}

          {/* Pending Sales Proposals */}
          {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'requested' && o.retailerStatus === 'pending').length > 0 && (
            <div className="mb-6 space-y-3">
              <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Outgoing Sales Proposals</h4>
              {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'requested' && o.retailerStatus === 'pending').map(order => (
                <div key={order.id} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-white text-sm">{order.cropName}</h5>
                    <p className="text-xs text-[#94a3b8] mt-1">{order.quantity} {order.cropUnit} in negotiation with Retailer</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 bg-white/5 text-[#94a3b8] text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/5">
                      Pending Acceptance
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending Retailer Emergency Requests */}
          {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'emergency_requested').length > 0 && (
            <div className="mb-6 space-y-3">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2 animate-pulse">Emergency Retailer Restock Requests</h4>
              {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'emergency_requested').map(order => (
                <div key={order.id} className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-white text-sm">{order.cropName}</h5>
                    <p className="text-xs text-[#94a3b8] mt-1">{order.quantity} {order.cropUnit} emergency request</p>
                    <p className="text-xs text-orange-400 mt-1 font-bold">Price: {formatCurrency(order.valueINR || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRejectOutOfStock(order)}
                      className="px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      Reject (Stock Alert)
                    </button>
                    <button 
                      onClick={() => {
                        if (handleUpdateOrder) {
                          handleUpdateOrder(order.id, { status: 'accepted' });
                          addNotification?.(`Emergency request accepted for ${order.cropName}. Please assign driver.`, "high", "logistics");
                        }
                      }}
                      className="px-4 py-2 bg-emerald-main text-black text-xs font-bold rounded-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-shadow"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rejected Sales Proposals (Negotiation Required) */}
          {orders.filter(o => o.buyerRole === 'retailer' && o.sellerRole === 'wholesaler' && o.status === 'rejected' && o.retailerStatus === 'rejected').length > 0 && (
            <div className="mb-6 space-y-3">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">Rejected Proposals (Needs Adjustment)</h4>
              {orders.filter(o => o.buyerRole === 'retailer' && o.sellerRole === 'wholesaler' && o.status === 'rejected' && o.retailerStatus === 'rejected').map(order => (
                <div key={order.id} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-white text-sm">{order.cropName}</h5>
                    <p className="text-xs text-rose-400 mt-1 italic">Reason: {order.rejectionReason || 'Price too high'}</p>
                    <p className="text-xs text-slate-400 mt-1">{order.quantity} {order.cropUnit} @ {formatCurrency((order.valueINR || 0)/order.quantity)}/unit</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSellForm({
                          orderId: order.id,
                          cropId: order.cropId,
                          quantity: order.quantity,
                          pricePerUnit: (order.valueINR || 0) / order.quantity,
                          retailer: order.retailerId || 'r1'
                        });
                        setIsSellModalOpen(true);
                      }}
                      className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-400 transition-colors uppercase tracking-widest"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Incoming Retailer Direct Requests */}
          {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'requested' && o.sellerRole !== 'wholesaler').length > 0 && (
            <div className="mb-6 space-y-3">
              <h4 className="text-xs font-bold text-emerald-main uppercase tracking-widest mb-2">Direct Retailer Requests</h4>
              {orders.filter(o => o.buyerRole === 'retailer' && o.status === 'requested' && o.sellerRole !== 'wholesaler').map(order => (
                <div key={order.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-white text-sm">{order.cropName}</h5>
                    <p className="text-xs text-slate-400">{order.quantity} {order.cropUnit} for {formatCurrency(order.valueINR || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAcceptRetailerRequest(order)}
                      className="px-4 py-2 bg-emerald-main text-black text-[10px] font-black uppercase tracking-widest rounded-lg"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleRejectOutOfStock(order)}
                      className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-colors"
                    >
                      Reject (No Stock)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {retailDemand.map((retailer) => (
              <div key={retailer.name} className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-main/30 transition-all cursor-pointer">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-[#f8fafc]">{retailer.name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    retailer.status === 'High' ? 'bg-red-500/10 text-red-500' :
                    retailer.status === 'Increasing' ? 'bg-emerald-main/10 text-emerald-main' :
                    'bg-emerald-deep text-emerald-main'
                  }`}>
                    {retailer.status}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-black text-emerald-main">{retailer.demand}<span className="text-[10px] text-[#94a3b8] ml-1 text-sm font-normal">Orders</span></p>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-1 h-3 rounded-full ${i <= (retailer.demand/15) ? 'bg-emerald-main' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inbound Supply Tracking */}
        <div className="lg:col-span-1 glass p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Inbound Supply</h3>
            <div className="w-2 h-2 rounded-full bg-emerald-main animate-pulse" />
          </div>
          
          <div className="space-y-4">
            {activeShipments.length === 0 ? (
              <div className="py-12 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                <p className="text-[#94a3b8] text-[10px] uppercase font-bold tracking-widest italic">Monitoring fleet traffic...</p>
              </div>
            ) : (
              activeShipments.map(order => {
                const crop = crops.find(c => c.id === order.cropId);
                const isPickedUp = order.isPickedUp;
                return (
                  <div key={order.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-main/20 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-main/10 rounded-lg text-emerald-main group-hover:bg-emerald-main group-hover:text-black transition-colors">
                           <Truck size={14} />
                        </div>
                        <p className="text-xs font-black text-white">{crop?.name} <span className="opacity-40 ml-1">#{order.id.slice(-4)}</span></p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isPickedUp ? 'bg-emerald-main/20 text-emerald-main' : 'bg-orange-500/20 text-orange-500'}`}>
                        {isPickedUp ? 'In Transit' : 'Pickup'}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[9px] font-bold text-[#94a3b8] uppercase mb-1">
                          <span>Quality Window</span>
                          <span className={isPickedUp ? 'text-orange-500 font-mono italic' : ''}>{isPickedUp ? formatTimeLeft(order.viabilityDeadline || 0) : 'Pending'}</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                           <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: isPickedUp ? '65%' : '100%', opacity: isPickedUp ? 1 : 0.2 }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 border border-black grid place-items-center text-[8px] text-white font-bold" title="Farmer">F</div>
                            <div className="w-6 h-6 rounded-full bg-emerald-main border border-black grid place-items-center text-[8px] text-black font-bold" title="Driver">D</div>
                            <div className="w-6 h-6 rounded-full bg-white/10 border border-black grid place-items-center text-[8px] text-white font-bold" title="Warehouse">W</div>
                         </div>
                         {isPickedUp && (
                           <button 
                             onClick={() => handleReceiveShipment(order.id)}
                             className="text-[9px] font-black text-emerald-main uppercase tracking-widest hover:bg-emerald-main hover:text-black transition-colors px-3 py-1.5 rounded-lg border border-emerald-main/20"
                           >
                             Log Receipt
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <ActionModal 
        {...modalConfig} 
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))} 
      />

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsNewOrderModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-bg-dark border border-border-main p-8 rounded-3xl shadow-2xl glass"
          >
            <button onClick={() => setIsNewOrderModalOpen(false)} className="absolute top-6 right-6 text-[#94a3b8] hover:text-white">
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-black mb-2">Create Supplier Order</h3>
            <p className="text-[#94a3b8] text-sm mb-8">Design your custom purchase order {newOrderForm.isCustom ? 'to broadcast demand' : 'from available harvests'}.</p>
            
            <form onSubmit={handleCreateCustomOrder} className="space-y-6">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-4">
                 <button 
                   type="button" 
                   onClick={() => setNewOrderForm({...newOrderForm, isCustom: false})}
                   className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!newOrderForm.isCustom ? 'bg-emerald-main text-black shadow-lg shadow-emerald-main/20' : 'text-slate-500 hover:text-white'}`}
                 >
                   Select From Market
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setNewOrderForm({...newOrderForm, isCustom: true})}
                   className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${newOrderForm.isCustom ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}
                 >
                   Broadcast Demand
                 </button>
              </div>

              {!newOrderForm.isCustom ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Select Crop from Market</label>
                  <select 
                    value={newOrderForm.cropId}
                    onChange={(e) => {
                      const c = crops.find(crop => crop.id === e.target.value);
                      setNewOrderForm({
                        ...newOrderForm, 
                        orderId: '', 
                        cropId: e.target.value, 
                        customCropName: c?.name || '', 
                        customUnit: c?.unit || 'kg',
                        quantity: c?.quantity || 1, 
                        pricePerUnit: c?.pricePerUnit || 100, 
                        isCustom: false
                      });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50 appearance-none"
                  >
                    {crops.map(c => (
                      <option key={c.id} value={c.id} className="bg-bg-dark">{c.name} ({c.farmerName})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Custom Crop Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Alphonso Mangoes"
                        value={newOrderForm.customCropName}
                        onChange={(e) => setNewOrderForm({...newOrderForm, customCropName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Unit Type</label>
                       <input 
                        type="text"
                        placeholder="kg, quintal, boxes"
                        value={newOrderForm.customUnit}
                        onChange={(e) => setNewOrderForm({...newOrderForm, customUnit: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number"
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({...newOrderForm, quantity: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Price per Unit</label>
                   <input 
                    type="number"
                    value={newOrderForm.pricePerUnit}
                    onChange={(e) => setNewOrderForm({...newOrderForm, pricePerUnit: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-main/50"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-main/5 rounded-2xl border border-emerald-main/20 flex justify-between items-center">
                 <p className="text-[11px] font-black text-emerald-main uppercase tracking-widest">Total Estimated Value</p>
                 <p className="text-xl font-black text-emerald-main">{formatCurrency(newOrderForm.quantity * newOrderForm.pricePerUnit)}</p>
              </div>

              <button type="submit" className="w-full bg-emerald-main text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-main/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Send Order Request
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Sell Modal */}
      {isSellModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-bg-dark border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setIsSellModalOpen(false)}
              className="absolute top-6 right-6 text-[#94a3b8] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black mb-2 flex items-center gap-2 text-blue-400">
              <ShoppingCart className="w-6 h-6" /> Sell to Retailer
            </h3>
            <p className="text-[#94a3b8] text-sm mb-8">Supply stock directly to retailers or branches.</p>
            
            <form onSubmit={handleSellToRetailer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Select Crop to Sell</label>
                <select 
                  value={sellForm.cropId}
                  onChange={(e) => {
                    const c = ownedInventory.find(crop => crop.cropId === e.target.value);
                    setSellForm({...sellForm, cropId: e.target.value, quantity: 1, pricePerUnit: c?.pricePerUnit || 100});
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                >
                  <option value="" disabled>Select crop from owned inventory...</option>
                  {ownedInventory.map(c => (
                    <option key={c.cropId} value={c.cropId} className="bg-bg-dark">{c.name} ({c.quantity} {c.unit} available)</option>
                  ))}
                </select>
                {ownedInventory.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">You have no inventory to sell. Receive shipments first.</p>
                )}
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Retailer Target</label>
                 <input 
                  type="text"
                  placeholder="e.g. Reliance Fresh"
                  value={sellForm.retailer}
                  onChange={(e) => setSellForm({...sellForm, retailer: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    value={sellForm.quantity}
                    onChange={(e) => setSellForm({...sellForm, quantity: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-1">Sale Price Unit</label>
                   <input 
                    type="number"
                    min="1"
                    value={sellForm.pricePerUnit}
                    onChange={(e) => setSellForm({...sellForm, pricePerUnit: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20 flex justify-between items-center">
                 <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Expected Revenue</p>
                 <p className="text-xl font-black text-blue-400">{formatCurrency(sellForm.quantity * sellForm.pricePerUnit)}</p>
              </div>

              <button type="submit" className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Confirm Sale & Dispatch
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SmallCard({ label, value, sub, warning }: { label: string, value: string, sub: string, warning?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5 group transition-all hover:border-emerald-main/40 relative overflow-hidden glass-hover"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-main/5 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-emerald-main/10 transition-colors" />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10">{label}</p>
      <div className="flex items-baseline gap-2 relative z-10">
        <h3 className="text-2xl font-black text-white font-mono tracking-tighter">{value}</h3>
      </div>
      <p className={`mt-2 text-[10px] font-bold uppercase tracking-wider relative z-10 ${warning ? 'text-rose-500' : 'text-emerald-main'}`}>
        {sub}
      </p>
    </motion.div>
  );
}
