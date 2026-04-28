import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Leaf, Plus, RefreshCw, SparkleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCropRecommendation } from '../services/geminiService';

export const AICropGuide = ({ weather, marketDemand }: { weather: any, marketDemand: any[] }) => {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    const data = await getCropRecommendation(weather, marketDemand);
    setRecommendations(data);
    setLoading(false);
  };

  useEffect(() => {
    if (recommendations.length === 0) {
      fetchRecommendations();
    }
  }, []); // Only on mount. The button can be used to refresh.

  return (
    <div className="glass p-6 relative overflow-hidden group flex flex-col h-full">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-main/10 blur-[80px]" />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-emerald-main" /> {t("AI Crop Guide")}
          </h3>
          <button onClick={fetchRecommendations} className="p-1.5 bg-white/5 rounded-md hover:bg-white/10 transition-colors" title="Refresh">
            <RefreshCw size={14} className={`text-[#94a3b8] hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <p className="text-xs text-[#94a3b8] mb-5">{t("Personalized recommendations based on current weather and market demand.")}</p>
        
        <div className="space-y-4 flex-1">
          {loading ? (
             <div className="text-center py-8 text-emerald-main text-sm">Loading recommendations...</div>
          ) : (
            recommendations.map((rec, idx) => (
              <div key={idx} className="bg-bg-dark border border-border-main p-4 rounded-xl hover:border-emerald-main/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-main/10 border border-emerald-main/20 flex flex-col items-center justify-center flex-shrink-0">
                    <Leaf className="w-5 h-5 text-emerald-main mb-0.5" />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-white">{rec.name}</h4>
                      <span className="text-[9px] bg-emerald-main/10 text-emerald-main px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-emerald-main/20">
                        {rec.matchScore} {t("Match")}
                      </span>
                    </div>
                    <p className="text-[#94a3b8] text-[11px] leading-relaxed mb-2">
                      {rec.reasoning}
                    </p>
                    <button className="text-[10px] font-bold text-white hover:text-emerald-main transition-colors flex items-center gap-1">
                      {t("Add to Inventory")} <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
