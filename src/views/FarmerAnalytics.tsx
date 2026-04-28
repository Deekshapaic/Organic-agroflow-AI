import React from 'react';
import { 
  TrendingUp, 
  Cloud, 
  Droplets, 
  Activity,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { getExpandedRevenue, getWeatherForecast, getMarketDemand } from '../services/analyticsData';

export default function FarmerAnalytics(props: any) {
  const expandedRevenue = getExpandedRevenue();
  const weatherForecast = getWeatherForecast();
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
             <Activity className="w-4 h-4 text-emerald-main" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-widest">Network Analytics Stream</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Agricultural <span className="text-emerald-main italic">Intelligence</span>
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-lg">
            Aggregated metrics from <span className="text-white">FairFlow nodes</span> across regional sectors.
          </p>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <FilterBtn label="Q1-2026" active />
          <FilterBtn label="Forecast" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Analytics */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Asset Performance <span className="text-emerald-main">Index</span></h3>
              <p className="text-slate-500 text-sm font-medium">Regional yield variance & network liquidity mapping</p>
            </div>
            <div className="flex gap-2">
              <FilterBtn label="Revenue" active />
              <FilterBtn label="Profit" />
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expandedRevenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="period" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontWeight: 800 }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ fontWeight: 900 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Climate Prediction */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Climate Prediction</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">7-Day Atmospheric Forecast</p>
            </div>
            <div className="p-2 bg-emerald-main/10 rounded-xl text-emerald-main">
              <Cloud size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weatherForecast}>
                <defs>
                  <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="rainProb" stroke="#10b981" fillOpacity={1} fill="url(#colorRain)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-4">
            {weatherForecast.map(df => (
              <div key={df.day} className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{df.day}</p>
                <p className="text-xs font-black text-white">{df.temp}°</p>
              </div>
            ))}
          </div>
        </div>

        {/* Market Demand */}
        <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Market Demand</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Current Sector Velocity</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketDemand}>
                <XAxis dataKey="crop" hide />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Bar dataKey="demand" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="supply" fill="rgba(99, 102, 241, 0.2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {marketDemand.map(d => (
              <div key={d.crop} className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                <span className="text-[11px] font-black text-white uppercase tracking-tighter">{d.crop}</span>
                <div className="flex items-center gap-4">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Demand Index: {d.demand}</span>
                   <span className={`text-[10px] font-black ${d.priceTrend > 0 ? 'text-emerald-main' : 'text-rose-500'}`}>
                    {d.priceTrend > 0 ? '+' : ''}{d.priceTrend}% Flux
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
