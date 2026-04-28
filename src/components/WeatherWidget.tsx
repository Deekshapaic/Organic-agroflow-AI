import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, AlertTriangle, X } from 'lucide-react';
import { WeatherData } from '../types';

export function WeatherWidget({ weather, className = "" }: { weather: WeatherData | null, className?: string }) {
  if (!weather) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-5 relative overflow-hidden w-full ${className}`}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-1">
            {weather.locationName ? `Live Local Forecast: ${weather.locationName}` : 'Live Local Forecast'}
          </p>
          <p className="text-3xl font-black">{weather.temp}°C</p>
          <p className="text-emerald-main font-medium text-sm">{weather.condition}</p>
        </div>
        <Cloud className="w-8 h-8 text-emerald-main opacity-50" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#94a3b8]">Rain Probability</span>
          <span className="font-bold text-emerald-main">{weather.rainProbability}%</span>
        </div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${weather.rainProbability}%` }}
            className="h-full bg-emerald-main"
          />
        </div>
        
        {/* 7-DAY FORECAST */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-4">7-Day Real-time Forecast</p>
          <div className="grid grid-cols-7 gap-2 text-center overflow-x-auto pb-2 scrollbar-hide">
            {weather.forecast.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[50px]">
                <span className="text-[#94a3b8] text-xs font-medium">{day.day}</span>
                <span className="font-bold text-sm text-white">{day.temp}°</span>
                <span className="text-[10px] text-emerald-main truncate max-w-full" title={day.condition}>{day.condition.substring(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function FloatingWeatherWidget({ weather }: { weather: WeatherData | null }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!weather) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 min-w-[64px] h-16 bg-emerald-main rounded-full flex flex-col items-center justify-center text-bg-dark shadow-lg shadow-emerald-main/20 hover:scale-110 transition-transform z-40 px-2"
      >
        <Cloud className="w-5 h-5 mb-0.5" />
        <span className="text-xs font-black">{weather.temp}°C</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom left' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 z-50 w-[calc(100vw-3rem)] max-w-sm"
          >
            <div className="relative">
              <button 
                onClick={() => setIsOpen(false)} 
                className="absolute -top-3 -right-3 w-8 h-8 bg-bg-dark border border-white/10 rounded-full flex items-center justify-center z-[60] hover:bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <WeatherWidget weather={weather} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
