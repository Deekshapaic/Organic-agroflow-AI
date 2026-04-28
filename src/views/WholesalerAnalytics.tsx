import React from 'react';
import { 
  TrendingUp, 
  Activity,
  BarChart3,
  Truck,
  Layers,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { getExpandedRevenue, getLogisticsVelocity, getMarketDemand } from '../services/analyticsData';

export default function WholesalerAnalytics(props: any) {
  const logisticsVelocity = getLogisticsVelocity();
  const marketDemand = getMarketDemand();
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
             <Globe className="w-4 h-4 text-emerald-main" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Global Intelligence Stream</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Wholesale <span className="text-emerald-main italic">Insights</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Analyzing <span className="text-white">supply chain throughput</span> and multi-sector logistics velocity.
          </p>
        </div>
        <div className="flex gap-2">
           <FilterBtn label="Real-time Feed" active />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Logistics Velocity */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Logistics Velocity</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Cross-Sector Turnaround Efficiency</p>
            </div>
            <div className="p-2 bg-emerald-main/10 rounded-xl text-emerald-main">
              <Truck size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={logisticsVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="time" stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Spread */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Regional Spread</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pricing Index & Demand Ratio</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketDemand}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="crop" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="demand" stroke="#6366f1" fillOpacity={1} fill="url(#colorDemand)" />
                <Area type="monotone" dataKey="supply" stroke="rgba(255,255,255,0.2)" fill="transparent" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Throughput */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-main/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Network Revenue <span className="text-emerald-main">Throughput</span></h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Aggregated Settlement Volume</p>
            </div>
            <div className="p-2 bg-emerald-main/10 rounded-xl text-emerald-main">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-64 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expandedRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                   contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
