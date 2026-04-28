import React from 'react';
import { motion } from 'motion/react';
import { Leaf, MapPin, Truck, Store, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';

export const OrganicProvenance = ({ order }: { order: Order }) => {
  const stages = [
    { id: 'cultivation', label: 'Certified Organic Growth', icon: <Leaf size={16} />, status: 'completed', time: '120 Days' },
    { id: 'harvest', label: 'Peak Maturity Harvest', icon: <CheckCircle2 size={16} />, status: 'completed', time: '2 Days ago' },
    { id: 'wholesale', label: 'Regional Node Processing', icon: <Store size={16} />, status: order.status === 'delivered' ? 'completed' : 'active', time: '24 Hours ago' },
    { id: 'transit', label: 'Smart-Fleet Dispatch', icon: <Truck size={16} />, status: order.status === 'shipped' ? 'active' : (order.status === 'delivered' ? 'completed' : 'pending'), time: 'Live' },
    { id: 'retail', label: 'Verified Organic Shelf', icon: <MapPin size={16} />, status: order.status === 'delivered' ? 'completed' : 'pending', time: 'ETA 2h' },
  ];

  return (
    <div className="glass p-8 border-emerald-main/20 bg-emerald-main/[0.02] rounded-[3rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-main/5 blur-[100px] rounded-full" />
      
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Organic <span className="text-emerald-main">Provenance</span></h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Blockchain-Verified Supply Chain</p>
        </div>
        <div className="bg-emerald-main/10 border border-emerald-main/20 p-3 rounded-2xl">
          <Leaf className="text-emerald-main w-6 h-6" />
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="relative flex gap-6 group">
            {/* Timeline Line */}
            {idx !== stages.length - 1 && (
              <div className={`absolute left-5 top-10 bottom-0 w-0.5 ${stage.status === 'completed' ? 'bg-emerald-main/30' : 'bg-white/5'}`} />
            )}
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 transition-all duration-500 ${
              stage.status === 'completed' ? 'bg-emerald-main text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
              stage.status === 'active' ? 'bg-emerald-main/20 text-emerald-main border border-emerald-main/50 animate-pulse' :
              'bg-white/5 text-slate-600 border border-white/5'
            }`}>
              {stage.icon}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className={`text-sm font-black uppercase tracking-tight ${stage.status === 'pending' ? 'text-slate-600' : 'text-white'}`}>
                  {stage.label}
                </h4>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stage.time}</span>
              </div>
              <p className={`text-[10px] font-medium ${stage.status === 'pending' ? 'text-slate-700' : 'text-slate-500'}`}>
                {stage.status === 'completed' ? 'Verified integrity node consensus reached.' : 
                 stage.status === 'active' ? 'Currently optimizing path vectors...' : 
                 'Awaiting upstream node confirmation.'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
         <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-dark bg-slate-800 flex items-center justify-center overflow-hidden">
                <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="verifier" className="w-full h-full object-cover" />
              </div>
            ))}
         </div>
         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">3 Nodes Verified This Cycle</p>
      </div>
    </div>
  );
};
