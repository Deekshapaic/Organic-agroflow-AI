import React from 'react';
import { 
  TrendingUp, 
  Activity,
  BarChart3,
  ShoppingCart,
  Layers,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell } from 'recharts';
import { getExpandedRevenue, getMarketDemand } from '../services/analyticsData';

export default function RetailerAnalytics(props: any) {
  const expandedRevenue = getExpandedRevenue();
  const marketDemand = getMarketDemand();

  const FilterBtn = ({ label, active }: { label: string, active?: boolean }) => (
    <button className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-emerald-main text-black shadow-lg shadow-emerald-main/20' : 'text-slate-500 hover:text-white'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-4">
             <ShoppingCart className="w-4 h-4 text-emerald-main" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Market Consumption Stream</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Retail <span className="text-emerald-main italic">Analytics</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Authorized for <span className="text-white">consumer velocity metrics</span> and multi-branch pricing trends.
          </p>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 shadow-xl">
           <FilterBtn label="Price Index" active />
           <FilterBtn label="Demand Loop" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Consumer Velocity */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Consumer Velocity</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Retail Throughput</p>
            </div>
            <div className="p-2 bg-emerald-main/10 rounded-xl text-emerald-main shadow-2xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expandedRevenue}>
                <defs>
                  <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}/>
                <Area type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorVelocity)" />
                <Area type="monotone" dataKey="revenue" stroke="rgba(255,255,255,0.2)" fill="transparent" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-6 leading-relaxed font-medium">AI analysis confirms <span className="text-emerald-main font-bold">+18.4% increase</span> in regional demand for organic staples. Trajectory remains bullish.</p>
        </div>

        {/* Pricing Strategy */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Price Index Registry</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Regional Procurement Variance Mapping</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketDemand}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis dataKey="crop" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}/>
                   <Bar dataKey="priceTrend" radius={[6, 6, 0, 0]}>
                      {marketDemand.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.priceTrend > 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stability Index</p>
               <p className="text-lg font-black text-white font-mono uppercase tracking-tighter">BULLISH-42.0</p>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Procurement Risk</p>
               <p className="text-lg font-black text-emerald-main font-mono uppercase tracking-tighter">LOW-NOMINAL</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
