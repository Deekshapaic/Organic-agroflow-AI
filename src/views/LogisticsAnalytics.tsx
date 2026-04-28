import React from 'react';
import { 
  TrendingUp, 
  Activity,
  Truck,
  Zap,
  Route,
  Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getExpandedRevenue } from '../services/analyticsData';

export default function LogisticsAnalytics(props: any) {
  const expandedRevenue = getExpandedRevenue();

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
             <Route className="w-4 h-4 text-emerald-main" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Trajectory Optimization Stream</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Logistics <span className="text-emerald-main italic">Analytics</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Authorized for <span className="text-white">fleet efficiency metrics</span> and predictive trajectory modeling.
          </p>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
           <FilterBtn label="Efficiency" active />
           <FilterBtn label="Fuel Yield" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Velocity */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Earnings Velocity</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Shift Revenue Trajectory Mapping</p>
            </div>
            <div className="p-2 bg-emerald-main/10 rounded-xl text-emerald-main">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expandedRevenue}>
                <defs>
                  <linearGradient id="colorDriverEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}/>
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorDriverEarnings)" />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="transparent" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Logistics Precision */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-white/[0.01]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Logistics Precision</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">On-Time Deployment Metric & Success Ratio</p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
              <Target size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expandedRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}/>
                <Line type="monotone" dataKey="yield" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
                <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] bg-emerald-main/[0.03] border border-emerald-main/20 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden opacity-80 mb-12">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-main/5 blur-[100px] rounded-full pointer-events-none" />
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-emerald-main/10 rounded-[2rem] flex items-center justify-center text-emerald-main border border-emerald-main/20 shadow-2xl">
               <Zap size={32} strokeWidth={1} className="animate-pulse" />
            </div>
            <div>
               <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic">Strategic Performance</h4>
               <p className="text-slate-500 text-sm font-medium mt-1">Your localized route optimization efficiency is in the <span className="text-emerald-main font-bold">top 5% of the network</span>.</p>
            </div>
         </div>
         <div className="text-right relative z-10 shrink-0">
            <p className="text-[10px] font-black text-emerald-main uppercase tracking-[0.4em] mb-2">Network Rank</p>
            <p className="text-6xl font-black text-white font-mono tracking-tighter leading-none">05</p>
         </div>
      </div>
    </div>
  );
}
