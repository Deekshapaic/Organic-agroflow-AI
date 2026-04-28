import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ActionModal({ isOpen, onClose, title, desc, actionLabel }: any) {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (isOpen) setStatus('idle');
  }, [isOpen]);

  const handleAction = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={status !== 'loading' ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-bg-dark border border-border-main p-6 rounded-2xl shadow-2xl glass"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-[#94a3b8] hover:text-white" disabled={status === 'loading'}>
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-[#94a3b8] text-sm mb-6">{desc}</p>
            
            {status === 'idle' && (
              <button onClick={handleAction} className="w-full py-3 bg-emerald-main text-black rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform">
                {actionLabel}
              </button>
            )}
            
            {status === 'loading' && (
              <div className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-main/10 animate-pulse" />
                <div className="w-4 h-4 border-2 border-emerald-main border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            )}
            
            {status === 'success' && (
              <div className="w-full py-3 bg-emerald-main/20 border border-emerald-main/50 text-emerald-main rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Operation Successful!
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
