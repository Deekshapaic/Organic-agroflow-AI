import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, LineChart, Line, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Globe, 
  ShieldCheck, 
  TrendingDown, 
  Zap,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { getExpandedRevenue, getMarketDemand, getRegionalGrowth } from '../services/analyticsData';

const revenueData = getExpandedRevenue();
const demandData = getMarketDemand();
const growthData = getRegionalGrowth();

const systemEfficiency = [
  { name: 'Supply Chain', value: 94, color: '#10b981' },
  { name: 'Logistics', value: 88, color: '#3b82f6' },
  { name: 'Equity Index', value: 92, color: '#f59e0b' },
  { name: 'Stability', value: 96, color: '#6366f1' },
];

export default function AdminAnalytics(props: any) {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            System <span className="text-emerald-main">Governance</span> Analytics
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium">Aggregated ecosystem health and algorithmic performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-emerald-main/10 border border-emerald-main/20 rounded-xl">
            <p className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Protocol Version</p>
            <p className="text-lg font-black text-white font-mono">v4.2.0-LIT</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Growth Chart */}
        <div className="lg:col-span-2 glass p-8 relative overflow-hidden bg-white/[0.01]">
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-main/5 blur-[100px] pointer-events-none" />
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Global Yield Velocity</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">System-wide production trajectory</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-main bg-emerald-main/10 px-3 py-1.5 rounded-xl border border-emerald-main/10">
              <Activity size={14} /> LIVE AGGREGATION
            </div>
          </div>
          
          <div className="h-72 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="period" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#adminGrad)" />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Efficiency */}
        <div className="glass p-8 relative overflow-hidden bg-white/[0.01]">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Node Efficiency</h3>
          <div className="space-y-6">
            {systemEfficiency.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">{item.name}</span>
                  <span className="text-white">{item.value}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Algorithm Health</span>
              <span className="text-emerald-main text-xs font-black">99.2% OPTIMAL</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              FairFlow Equity Logic is currently preventing 12 localized market spikes across 4 zones.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Growth */}
        <div className="glass p-8 relative overflow-hidden bg-white/[0.01]">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Regional Pulse Mapping</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="region" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Bar dataKey="growth" radius={[4, 4, 0, 0]} barSize={30}>
                  {growthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.growth > 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Stability Index */}
        <div className="glass p-8 relative overflow-hidden bg-white/[0.01]">
           <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">System Stability Index</h3>
            <ShieldCheck className="text-emerald-main" size={24} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StabilityCard label="Blockchain Sync" value="99.99%" sub="Verified" positive />
            <StabilityCard label="Logistics Latency" value="12ms" sub="Optimal" positive />
            <StabilityCard label="Demand Flux" value="High" sub="Sector 4" warning />
            <StabilityCard label="Liquidity" value="Stable" sub="Across Nodes" positive />
          </div>
        </div>
      </div>
    </div>
  );
}

function StabilityCard({ label, value, sub, positive, warning }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-32">
       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
       <div>
         <p className={`text-xl font-black font-mono tracking-tighter ${warning ? 'text-orange-500' : 'text-white'}`}>{value}</p>
         <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${warning ? 'text-orange-500' : 'text-emerald-main'}`}>{sub}</p>
       </div>
    </div>
  );
}
