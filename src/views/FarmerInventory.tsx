import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Plus, X, Calendar, Activity, Wheat, Search, DollarSign, Tag } from 'lucide-react';
import { Crop, Order } from '../types';

export default function FarmerInventory({ 
  crops = [], 
  setCrops, 
  handleAddCrop: handleAddCropProp,
  profile, 
  orders = [],
  setOrders,
  addNotification,
  formatCurrency,
  role
}: { 
  crops?: any[], 
  setCrops?: (id: string, data: any) => Promise<void>, 
  handleAddCrop?: (data: any) => Promise<void>,
  profile?: any, 
  orders?: Order[],
  setOrders?: (data: any) => Promise<void>,
  addNotification?: (message: string, severity?: 'low'|'high'|'critical', type?: string) => void,
  formatCurrency: (amountINR: number) => string,
  role?: string
}) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  
  // Check if a crop is part of an accepted order
  const getCropOrder = (cropId: string) => {
    return orders.find(o => o.cropId === cropId && (o.status === 'accepted' || o.status === 'shipped'));
  };
  
  const [newCrop, setNewCrop] = useState({
    name: '',
    type: 'grain',
    quantity: '',
    unit: 'Tons',
    estimatedHarvestDate: '',
    growthStage: 'Seedling',
    pricePerUnit: ''
  });

  const handleAddCrop = (e: React.FormEvent) => {
    e.preventDefault();
    const crop = {
      name: newCrop.name,
      type: newCrop.type,
      quantity: Number(newCrop.quantity),
      unit: newCrop.unit,
      status: 'growing' as const,
      estimatedHarvestDate: newCrop.estimatedHarvestDate,
      growthStage: newCrop.growthStage,
      pricePerUnit: Number(newCrop.pricePerUnit),
      farmerName: profile?.name || 'Current Farmer',
      farmerLocation: profile?.address || 'Local Region'
    };
    if (handleAddCropProp) {
      handleAddCropProp(crop);
    }
    setIsAdding(false);
    setNewCrop({ name: '', type: 'grain', quantity: '', unit: 'Tons', estimatedHarvestDate: '', growthStage: 'Seedling', pricePerUnit: '' });
  };

  const handleSellToWholesaler = (crop: any) => {
    if (!setOrders) return;
    const newOrder = {
      cropId: crop.id,
      cropName: crop.name,
      cropUnit: crop.unit,
      farmerId: profile?.id || 'f1',
      sellerRole: 'farmer' as const,
      buyerRole: 'wholesaler' as const,
      quantity: crop.quantity,
      status: 'requested' as const,
      valueINR: crop.quantity * crop.pricePerUnit,
    };
    setOrders(newOrder);
    addNotification?.(`Request sent to wholesaler for ${crop.name}.`, 'high', 'demand');
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">{t("Active")} <span className="text-emerald-main">{t("Crops")}</span></h2>
          <p className="text-[#94a3b8] mt-1 text-sm">{t("Manage Crops")}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-emerald-main text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <Plus size={14} /> {t("Add Crop")}
          </button>
        </div>
      </div>

      <div className="bg-[#080c0b] border border-border-main rounded-2xl p-4 flex items-center gap-3">
        <Search className="text-[#94a3b8] w-5 h-5" />
        <input 
          type="text" 
          placeholder={t("Search Crops")} 
          className="bg-transparent border-none outline-none text-[#f8fafc] w-full text-sm placeholder:text-[#94a3b8]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crops.map(crop => (
          <div key={crop.id} className="glass p-5 flex flex-col hover:border-emerald-main/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                crop.status === 'harvested' || getCropOrder(crop.id) ? 'bg-orange-500/10 text-orange-500' :
                crop.status === 'dispatched' ? 'bg-blue-500/10 text-blue-500' :
                'bg-emerald-main/10 text-emerald-main'
              }`}>
                <Wheat size={20} />
              </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc]">{crop.name}</h3>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{crop.quantity} {crop.unit}</p>
                </div>
              </div>
              {getCropOrder(crop.id) ? (
                <div className="px-3 py-1 bg-emerald-main/10 border border-emerald-main/30 rounded-lg text-[9px] font-black text-emerald-main uppercase tracking-widest animate-pulse">
                  {t("Accepted Order")}
                </div>
              ) : (
                <select
                  value={crop.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'growing' | 'harvested' | 'dispatched';
                    if (setCrops) {
                      setCrops(crop.id, { status: newStatus });
                    }
                  }}
                  className={`px-2 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-widest outline-none cursor-pointer transition-colors appearance-none text-center ${
                    crop.status === 'harvested' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' :
                    crop.status === 'dispatched' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20' :
                    'bg-emerald-main/10 border-emerald-main/20 text-emerald-main hover:bg-emerald-main/20'
                  }`}
                >
                  <option value="growing" className="bg-bg-dark text-white">{t("GROWING")}</option>
                  <option value="harvested" className="bg-bg-dark text-white">{t("HARVESTED")}</option>
                  <option value="dispatched" className="bg-bg-dark text-white">{t("DISPATCHED")}</option>
                </select>
              )}
            </div>
            
            <div className="space-y-3 mt-auto">
              {crop.status !== 'growing' && (
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <Tag size={14} className={crop.status === 'harvested' ? 'text-orange-500' : 'text-blue-500'} /> 
                  <span>{t("Type")}: <strong className="text-white font-medium capitalize">{crop.type || 'Unknown'}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                <Calendar size={14} className={crop.status === 'harvested' ? 'text-orange-500' : crop.status === 'dispatched' ? 'text-blue-500' : 'text-emerald-main'} /> 
                <span>
                  {crop.status === 'harvested' || crop.status === 'dispatched' ? 'Harvested: ' : 'Est. Harvest: '}
                  <strong className="text-white font-medium">{crop.estimatedHarvestDate || 'TBD'}</strong>
                </span>
              </div>
              {crop.status === 'growing' && (
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                  <Activity size={14} className="text-emerald-main" /> 
                  <span>Growth Phase: <strong className="text-white font-medium">{crop.growthStage || 'N/A'}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                <DollarSign size={14} className="text-emerald-main" /> 
                <span>
                  {t("Price")}: <strong className="text-emerald-main font-bold">{formatCurrency(crop.pricePerUnit || 100)}</strong>
                  {crop.quantity && crop.pricePerUnit && (
                    <span className="ml-1 opacity-70">({t("Total")}: {formatCurrency(crop.quantity * crop.pricePerUnit)})</span>
                  )}
                </span>
              </div>
              {crop.status === 'harvested' && (
                <button 
                  onClick={() => handleSellToWholesaler(crop)}
                  className="w-full mt-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                   <DollarSign size={12} /> Sell to Wholesaler
                </button>
              )}

              {role === 'wholesaler' && (
                <button 
                  onClick={() => {
                     (window as any).dispatchEvent(new CustomEvent('init-custom-order', { detail: crop }));
                  }}
                  className="w-full mt-4 bg-emerald-main/10 text-emerald-main border border-emerald-main/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-main hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={12} /> {t("New Order")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-dark border border-border-main p-6 rounded-2xl shadow-2xl glass max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <button 
                onClick={() => setIsAdding(false)} 
                className="absolute top-4 right-4 text-[#94a3b8] hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold mb-2">{t("Log New Crop")}</h3>
              <p className="text-[#94a3b8] text-sm mb-6">{t("Crop Details")}</p>
              
              <form onSubmit={handleAddCrop} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Crop Name</label>
                    <input 
                      required
                      type="text" 
                      value={newCrop.name}
                      onChange={e => setNewCrop({...newCrop, name: e.target.value})}
                      placeholder="e.g. Basmati Rice"
                      className="w-full bg-white/5 border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Category Type</label>
                    <select 
                      value={newCrop.type}
                      onChange={e => setNewCrop({...newCrop, type: e.target.value})}
                      className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    >
                      <option value="grain">Grains (Rice, Wheat)</option>
                      <option value="vegetable">Vegetable</option>
                      <option value="fruit">Fruit</option>
                      <option value="legume">Legume</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">{t("Quantity")}</label>
                    <input 
                      required
                      type="number" 
                      value={newCrop.quantity}
                      onChange={e => setNewCrop({...newCrop, quantity: e.target.value})}
                      placeholder="e.g. 150"
                      className="w-full bg-white/5 border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Unit</label>
                    <select 
                      value={newCrop.unit}
                      onChange={e => setNewCrop({...newCrop, unit: e.target.value})}
                      className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    >
                      <option value="Tons">Tons</option>
                      <option value="Kg">Kg</option>
                      <option value="Acres">Acres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Est. Price / Unit</label>
                    <input 
                      required
                      type="number" 
                      value={newCrop.pricePerUnit}
                      onChange={e => setNewCrop({...newCrop, pricePerUnit: e.target.value})}
                      placeholder="e.g. 450"
                      className="w-full bg-white/5 border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Estimated Harvest</label>
                    <input 
                      required
                      type="date"
                      value={newCrop.estimatedHarvestDate}
                      onChange={e => setNewCrop({...newCrop, estimatedHarvestDate: e.target.value})}
                      className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50 text-[#f8fafc]"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] mb-1">Current Growth Stage</label>
                  <select 
                    value={newCrop.growthStage}
                    onChange={e => setNewCrop({...newCrop, growthStage: e.target.value})}
                    className="w-full bg-bg-dark border border-border-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-main/50"
                  >
                    <option value="Seedling">Seedling</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Fruiting">Fruiting</option>
                    <option value="Maturation">Maturation</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full py-3 mt-4 bg-emerald-main text-black rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
                >
                  {t("Save Crop Entry")}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
