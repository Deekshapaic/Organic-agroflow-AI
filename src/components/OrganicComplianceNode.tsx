import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Leaf, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { getAiResponse } from '../services/geminiService';

export const OrganicComplianceNode = ({ profile, crops }: { profile: any, crops: any[] }) => {
  const [status, setStatus] = useState<'analyzing' | 'compliant' | 'warning'>('analyzing');
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const analyzeCompliance = async () => {
    setLoading(true);
    setStatus('analyzing');
    try {
      const context = {
        profile,
        crops: crops.slice(0, 5),
        type: 'organic_compliance_check'
      };
      const response = await getAiResponse(
        "Analyze my farm's organic compliance based on my current profile and crop list. Provide a short assessment and 3 actionable tips for maintaining organic standards.",
        context
      );
      setInsights(response);
      setStatus(response.toLowerCase().includes('warning') || response.toLowerCase().includes('risk') ? 'warning' : 'compliant');
    } catch (error) {
      console.error("Compliance analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeCompliance();
  }, []);

  return (
    <div className="glass p-6 border-emerald-main/20 bg-emerald-main/[0.02] rounded-[2.5rem] relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-main/5 blur-3xl -mr-16 -mt-16" />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            status === 'analyzing' ? 'bg-blue-500/10 text-blue-400' :
            status === 'compliant' ? 'bg-emerald-main/10 text-emerald-main' :
            'bg-orange-500/10 text-orange-400'
          }`}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter italic">Organic Node</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Compliance Protocol v4.2</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
          status === 'analyzing' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
          status === 'compliant' ? 'bg-emerald-main/5 border-emerald-main/20 text-emerald-main' :
          'bg-orange-500/5 border-orange-500/20 text-orange-400'
        }`}>
          {status.toUpperCase()}
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-emerald-main border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Analyzing Soil & Yield Vectors...</p>
          </div>
        ) : (
          <>
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{insights.split('\n')[0]}"
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[9px] font-black text-emerald-main uppercase tracking-widest ml-1">Critical Directives:</p>
              {insights.split('\n').filter(l => l.match(/^\d\.|^-/)).slice(0, 3).map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="mt-0.5">
                    <CheckCircle2 size={12} className="text-emerald-main" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">
                    {tip.replace(/^\d\.\s*|^- \s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <button 
        onClick={analyzeCompliance}
        className="w-full mt-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-emerald-main hover:text-black hover:border-emerald-main transition-all flex items-center justify-center gap-2"
      >
        <Search size={14} /> Re-Verify Standards
      </button>
    </div>
  );
};
