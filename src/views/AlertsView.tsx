import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShoppingCart,
  User,
  Check,
  XCircle
} from 'lucide-react';
import { Alert, Order, Crop, UserRole } from '../types';

interface AlertsViewProps {
  alerts: Alert[];
  orders?: Order[];
  crops?: Crop[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  role?: UserRole | null;
  clearAlert?: (id: string) => void;
}

export default function AlertsView({ alerts, orders = [], crops = [], setOrders, role, clearAlert }: AlertsViewProps) {
  const handleAcceptOrder = (orderId: string) => {
    if (setOrders) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'accepted' } : o));
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    if (setOrders) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  // Only show the news alerts fetched from AI
  const allNotifications = alerts.map(a => ({
    id: `alert-${a.id}`,
    isOrder: false,
    alert: a,
    timestamp: typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp
  })).sort((a, b) => (b.timestamp as number) - (a.timestamp as number));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Real-time <span className="text-emerald-main">News Feed</span></h2>
          <p className="text-[#94a3b8] mt-1 text-sm">AI-curated agricultural technology and market trends based on your GPS location.</p>
        </div>
      </div>

      <div className="space-y-4">
        {allNotifications.length === 0 ? (
          <div className="glass p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-main/10 flex items-center justify-center">
              <Bell className="w-8 h-8 text-emerald-main opacity-20" />
            </div>
            <div>
              <h3 className="text-xl font-bold">All Quiet</h3>
              <p className="text-[#94a3b8]">You're all caught up! No new alerts at this time.</p>
            </div>
          </div>
        ) : (
          allNotifications.map((item, index) => {
            if (item.isOrder) {
              const order = (item as any).order as Order;
              const crop = crops.find(c => c.id === order?.cropId);
              return (
                <OrderAlertCard 
                  key={item.id} 
                  order={order} 
                  crop={crop} 
                  index={index} 
                  role={role}
                  onAccept={() => handleAcceptOrder(order.id)}
                  onDecline={() => handleDeclineOrder(order.id)}
                />
              );
            } else {
              const alert = (item as any).alert as Alert;
              return <AlertCard key={item.id} alert={alert} index={index} onClear={() => clearAlert?.(alert.id)} />;
            }
          })
        )}
      </div>
    </div>
  );
}

function OrderAlertCard({ order, crop, index, role, onAccept, onDecline }: { order: Order, crop?: Crop, index: number, role?: UserRole | null, onAccept: () => void, onDecline: () => void }) {
  const isRequested = order.status === 'requested';
  
  // Wholesaler Name Mockup (usually fetched from a service)
  const requesterName = order.wholesalerId === 'w1' ? 'BigBasket (Corporate)' : 'Local Wholesaler Hub';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`glass p-5 flex items-start gap-4 border ${isRequested ? 'border-emerald-main/30' : 'border-white/10'} hover:bg-white/[0.07] transition-all group relative overflow-hidden`}
    >
      {isRequested && (
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-main" />
      )}
      
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isRequested ? 'bg-emerald-main/10 text-emerald-main' : 'bg-white/5 text-[#94a3b8]'}`}>
        <ShoppingCart size={20} />
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-bold uppercase tracking-widest text-[10px] ${isRequested ? 'text-emerald-main' : 'text-[#94a3b8]'}`}>
            {isRequested ? 'High Priority Request' : 'Order Processing'} • {crop?.name || 'Supply Chain Item'}
          </h4>
          <span className="text-[10px] text-[#94a3b8] font-medium flex items-center gap-1">
            <Clock size={12} /> Recent
          </span>
        </div>
        
        <div className="mb-3">
          <p className="text-[#f8fafc] font-medium text-lg leading-snug">
            {isRequested 
              ? `Delivery Request: ${order.quantity} ${crop?.unit || 'units'} of ${crop?.name || 'crop'}` 
              : `Order Confirmed: ${order.quantity} ${crop?.unit || 'units'} of ${crop?.name || 'crop'} is now in logistics.`}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[#94a3b8] text-sm font-medium">
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold">
              {requesterName.charAt(0)}
            </div>
            <span>From: <span className="text-white font-bold">{requesterName}</span></span>
          </div>
        </div>
        
        {isRequested && role === UserRole.FARMER && (
          <div className="flex gap-3 mt-5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAccept}
              className="px-6 py-2.5 bg-emerald-main text-black rounded-xl font-bold text-sm flex items-center gap-2 shadow-xl shadow-emerald-main/20"
            >
              <Check size={16} /> Accept & Start Logistics
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDecline}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <XCircle size={16} className="text-red-400" /> Decline
            </motion.button>
          </div>
        )}

        {order.status === 'accepted' && (
          <div className="mt-4 flex items-center gap-2 text-emerald-main text-xs font-bold bg-emerald-main/5 w-fit px-3 py-1.5 rounded-lg border border-emerald-main/10">
            <CheckCircle2 size={14} /> Logistics initialized. Check the Logistics tab for updates.
          </div>
        )}
      </div>
      
      {!isRequested && (
        <div className="shrink-0 self-center opacity-40 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={20} className="text-[#94a3b8]" />
        </div>
      )}
    </motion.div>
  );
}

function AlertCard({ alert, index, onClear }: { alert: Alert, index: number, onClear: () => void }) {
  const isNews = alert.type === 'news';
  const getSeverityStyles = (severity: string, type: string) => {
    if (type === 'news') {
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-main/20',
        text: 'text-emerald-main',
        icon: <TrendingUp className="w-5 h-5" />,
        label: 'REAL TIME NEWS'
      };
    }

    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-600/10',
          border: 'border-red-600/30',
          text: 'text-red-500',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'CRITICAL ALERT'
        };
      case 'high':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'HIGH PRIORITY'
        };
      case 'low':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          icon: <Info className="w-5 h-5" />,
          label: 'INFORMATION'
        };
      default:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          icon: <CheckCircle2 className="w-5 h-5" />,
          label: 'SYSTEM UPDATE'
        };
    }
  };

  const styles = getSeverityStyles(alert.severity, alert.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass border ${styles.border} hover:bg-white/5 transition-all group overflow-hidden flex flex-col md:flex-row relative`}
    >
      {isNews && alert.imageUrl && (
        <div className="md:w-64 h-48 md:h-auto shrink-0 relative overflow-hidden">
          <img src={alert.imageUrl} alt="News" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.bg} ${styles.text}`}>
               {styles.icon}
             </div>
             <div>
                <h4 className={`font-bold ${styles.text} uppercase tracking-widest text-[10px]`}>
                  {styles.label} • {isNews ? 'AgroFlow Network' : alert.type}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] font-bold">
                  <Clock size={10} /> {new Date(alert.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
             </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1.5 hover:bg-white/10 rounded-full text-[#94a3b8] hover:text-white transition-colors"
            title="Clear"
          >
            <XCircle size={18} />
          </button>
        </div>

        <p className="text-[#f8fafc] text-lg font-bold leading-tight mt-2 mb-4 group-hover:text-emerald-main transition-colors">
          {alert.message}
        </p>
        
        {isNews && (
          <div className="mt-auto flex items-center gap-2">
            <span className="text-[10px] font-black bg-emerald-main/10 text-emerald-main px-3 py-1 rounded-full border border-emerald-main/20 flex items-center gap-1 uppercase tracking-widest">
              <TrendingUp size={12} /> Live Market Pulse
            </span>
            {alert.articleUrl ? (
               <a href={alert.articleUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-[#94a3b8] hover:text-white uppercase tracking-widest ml-4 transition-colors">
                 Read Full Article →
               </a>
            ) : (
                <span className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">
                  Article Link Unavailable
                </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
