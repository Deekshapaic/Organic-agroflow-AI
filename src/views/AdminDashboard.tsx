import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  TrendingDown,
  Activity,
  Globe,
  Zap,
  CheckCircle2,
  Truck,
  User,
  Plus,
  Package,
  Search,
  MoreVertical,
  XCircle,
  Bell,
  BarChart3,
  ExternalLink,
  Lock,
  Unlock,
  Eye,
  Settings
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { ActionModal } from '../components/ActionModal';
import { Driver, Order, Crop } from '../types';
import { getExpandedRevenue, getMarketDemand } from '../services/analyticsData';
import AdminAnalytics from './AdminAnalytics';

const shortageZones = [
  { id: 'Z1', area: 'Lower East Side', risk: 'Critical', supplyGap: '20 Tons', population: '15k' },
  { id: 'Z2', area: 'Green Hills', risk: 'High', supplyGap: '8 Tons', population: '8k' },
  { id: 'Z3', area: 'Old Town', risk: 'Moderate', supplyGap: '5 Tons', population: '22k' },
];

interface AdminProps {
  currentTab: string;
  crops?: Crop[];
  formatCurrency: (amountINR: number) => string;
  drivers?: Driver[];
  setDrivers?: any;
  handleUpdateDriver?: (id: string, data: any) => Promise<void>;
  handleAddDriver?: (data: any) => Promise<void>;
  handleDeleteDriver?: (id: string) => Promise<void>;
  orders?: Order[];
  setOrders?: any;
  handleUpdateOrder?: (id: string, data: any) => Promise<void>;
  addNotification?: (msg: string) => void;
  users?: any[];
}

export default function AdminDashboard({ 
  currentTab, 
  crops = [], 
  formatCurrency,
  drivers = [],
  setDrivers,
  handleUpdateDriver,
  handleAddDriver,
  handleDeleteDriver,
  orders = [],
  setOrders,
  handleUpdateOrder,
  addNotification,
  users = []
}: AdminProps) {
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', experience: '', vehicle: '', phone: '' });

  // Sync internal sub-tab with top-level currentTab from sidebar
  React.useEffect(() => {
    if (currentTab === 'Dashboard') setActiveSubTab('Overview');
    if (currentTab === 'Inventory') setActiveSubTab('Inventory');
    if (currentTab === 'Logistics') setActiveSubTab('Logistics');
    if (currentTab === 'Analytics') setActiveSubTab('Analytics');
    if (currentTab === 'News Feed' || currentTab === 'Alerts') setActiveSubTab('Alerts');
  }, [currentTab]);

  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, desc: string, actionLabel: string}>({
    isOpen: false, title: '', desc: '', actionLabel: ''
  });

  // Approved drivers and Pending applicants
  const activeFleet = drivers.filter(d => d.status !== 'Pending');
  const pendingApplicants = drivers.filter(d => d.status === 'Pending');

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.phone || !handleAddDriver) return;

    const driverObj = {
      name: newDriver.name,
      status: 'Pending' as const,
      experience: newDriver.experience || 'Entry Level',
      rating: 5.0,
      phone: newDriver.phone,
      orders: [],
      availability: true
    };

    handleAddDriver(driverObj);
    if (addNotification) addNotification(`New applicant ${newDriver.name} submitted for review.`);

    setNewDriver({ name: '', experience: '', vehicle: '', phone: '' });
    setIsRecruitModalOpen(false);
  };

  const handleApproveDriver = (driverId: string) => {
    if (handleUpdateDriver) {
      handleUpdateDriver(driverId, { status: 'Available' });
      const driver = drivers.find(d => d.id === driverId);
      if (addNotification) addNotification(`${driver?.name} has been officially appointed to the fleet.`);
    }
  };

  const handleRejectDriver = (driverId: string) => {
    if (handleDeleteDriver) {
      handleDeleteDriver(driverId);
      if (addNotification) addNotification("Applicant profile removed from system.");
    }
  };

  // Calculate System Stats
  const systemMetrics = useMemo(() => {
    const totalVolume = crops.reduce((acc, c) => acc + (c.quantity || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalGmv = completedOrders.reduce((acc, o) => acc + (o.valueINR || 0), 0);
    const wasteMitigated = (totalVolume * 0.12).toFixed(1); // Mock calculation
    
    return {
      totalVolume,
      totalGmv,
      wasteMitigated,
      equityIndex: '94.8%',
      activeUsers: users.length + drivers.length
    };
  }, [crops, orders, users, drivers]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.cropName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const expandedRevenue = getExpandedRevenue();
  const marketDemand = getMarketDemand();

  const handleIntervene = (orderId: string) => {
    if (handleUpdateOrder) {
      handleUpdateOrder(orderId, { status: 'shipped', isPickedUp: true });
      if (addNotification) addNotification(`Admin Overrode Order #${orderId.slice(-4)}. Logistics forced.`);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ImpactMetric label="System GMV" value={formatCurrency(systemMetrics.totalGmv)} icon={<TrendingDown />} color="emerald" />
        <ImpactMetric label="Waste Mitigated" value={`${systemMetrics.wasteMitigated} Tons`} icon={<Activity />} color="blue" />
        <ImpactMetric label="Equity Index" value={systemMetrics.equityIndex} icon={<Globe />} color="purple" />
        <ImpactMetric label="Network Size" value={String(systemMetrics.activeUsers)} icon={<Users />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Equity & Shortage Monitoring
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full border border-red-500/20 font-bold uppercase tracking-widest">3 Alerts</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-main animate-ping" />
              Live Feed
            </div>
          </div>
          <div className="space-y-3">
            {shortageZones.map((zone) => (
              <div key={zone.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-main/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-main group-hover:bg-emerald-main group-hover:text-black transition-all">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[#f8fafc]">{zone.area}</h4>
                    <p className="text-[#94a3b8] text-[11px]">Pop: {zone.population} (Demand: {zone.supplyGap})</p>
                  </div>
                </div>
                
                <div className="flex gap-6 items-center">
                  <div className="text-right">
                    <p className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-widest leading-none mb-1">Status</p>
                    <p className={`font-bold text-xs ${zone.risk === 'Critical' ? 'text-red-500' : 'text-orange-400'}`}>{zone.risk}</p>
                  </div>
                  <button 
                    onClick={() => setModalConfig({isOpen: true, title: 'Resolve Shortage', desc: `Execute AI resolution protocol for ${zone.area} to bridge the ${zone.supplyGap} gap.`, actionLabel: 'Resolve via AI'})}
                    className="bg-emerald-main text-black px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                  >
                    Resolve AI <Zap size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-main p-6 rounded-3xl text-black relative overflow-hidden group shadow-[0_15px_40px_rgba(16,185,129,0.2)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 blur-[80px] rounded-full" />
          <div className="relative z-10 flex flex-col h-full font-sans">
            <div className="mb-6">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-3">
                <ShieldCheck className="text-emerald-main" />
              </div>
              <h3 className="text-xl font-black leading-tight">Equity Algorithm Insight</h3>
            </div>
            
            <div className="flex-1 space-y-4 text-sm font-medium">
              <p className="opacity-90">FairFlow logic suggests diverting 12% of currently harvested rice to Z1 Zone to prevent a price spike.</p>
              <div className="bg-black/10 p-3 rounded-xl border border-black/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-black opacity-50">Impact Score</span>
                  <span className="text-xs font-black">9.2/10</span>
                </div>
                <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                  <div className="w-[92%] h-full bg-black/80" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (addNotification) addNotification("Global equitable distribution activated by Admin.");
                setModalConfig({isOpen: true, title: 'Algorithm Approval', desc: 'Executing system-wide supply redirection for maximum equity.', actionLabel: 'Approve & Sync'})
              }}
              className="mt-6 bg-black text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              Approve Global Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 glass p-4 bg-white/5 border-white/10 rounded-2xl">
        <Search className="text-[#94a3b8]" size={20} />
        <input 
          type="text" 
          placeholder="Search by UID, Name or Location..." 
          className="bg-transparent border-none focus:outline-none w-full text-white placeholder-[#94a3b8] font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="glass overflow-hidden border-white/5">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">User / Entity</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Role</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center font-black text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{u.name}</p>
                      <p className="text-[10px] text-[#94a3b8]">{u.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md border border-white/10">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-main" />
                    <span className="text-xs font-bold text-white">{u.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg text-[#94a3b8] hover:text-white transition-colors" title="View Profile">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors" title="Suspend User">
                      <Lock size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGlobalLogistics = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="glass p-5 border-white/10 hover:border-emerald-main/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                <h4 className="font-bold text-white">{order.cropName}</h4>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                order.status === 'delivered' ? 'bg-emerald-main/10 text-emerald-main' : 'bg-orange-500/10 text-orange-500'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Logistics:</span>
                <span className="text-white font-bold">{order.driverName || 'Not Assigned'}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Value:</span>
                <span className="text-white font-bold">{formatCurrency(order.valueINR || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Pickup Status:</span>
                <span className={`font-bold ${order.isPickedUp ? 'text-emerald-main' : 'text-[#94a3b8]'}`}>
                  {order.isPickedUp ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleIntervene(order.id)}
                disabled={order.status === 'delivered' || order.status === 'shipped'}
                className="flex-1 bg-white/5 border border-white/10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Force Logistics
              </button>
              <button className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 rounded-xl hover:bg-red-500/20 transition-all">
                <XCircle size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFleetManagement = () => (
    <div className="space-y-6">
      {pendingApplicants.length > 0 && (
        <div className="glass p-6 border-orange-500/30 bg-orange-500/5">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                 <AlertTriangle size={20} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white">Pending Appointments</h3>
                 <p className="text-xs text-[#94a3b8] mt-1">Review and verify new logistics partner applications.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApplicants.map(applicant => (
                <div key={applicant.id} className="bg-black/40 border border-white/10 p-5 rounded-2xl">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#94a3b8]">
                         <User size={24} />
                      </div>
                      <div>
                         <h4 className="font-bold text-white leading-tight">{applicant.name}</h4>
                         <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{applicant.experience}</p>
                      </div>
                   </div>
                   <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs">
                         <span className="text-[#94a3b8]">Phone:</span>
                         <span className="text-white font-medium">{applicant.phone || 'N/A'}</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveDriver(applicant.id)}
                        className="flex-1 bg-emerald-main text-black py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectDriver(applicant.id)}
                        className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                      >
                        Reject
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass p-6">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h3 className="text-xl font-black text-white">Active Fleet Network</h3>
                 <p className="text-xs text-[#94a3b8] mt-1">Monitor and manage the active delivery logistics force.</p>
              </div>
              <button 
                onClick={() => setIsRecruitModalOpen(true)}
                className="bg-emerald-main text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Recruit Fleet
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeFleet.map(driver => (
                <div key={driver.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-main/30 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#94a3b8] group-hover:text-emerald-main transition-all">
                         <User size={24} />
                      </div>
                      <div>
                         <h4 className="font-bold text-white mb-1">{driver.name}</h4>
                         <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${driver.status === 'Available' ? 'bg-emerald-main' : 'bg-orange-500'}`} />
                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">{driver.status}</p>
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-white">{driver.rating} ★</p>
                      <p className="text-[10px] text-[#94a3b8] font-medium">{driver.experience}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="glass p-6 flex flex-col justify-between border-emerald-main/20 bg-emerald-main/5">
           <div>
              <div className="w-12 h-12 bg-emerald-main/20 rounded-2xl flex items-center justify-center text-emerald-main mb-6">
                 <Truck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Fleet Analytics</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                 Aggregate data suggests a 15% increase in transit efficiency after implementing FairFlow cluster dispatching.
              </p>
           </div>
           
           <div className="space-y-4 mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-[#94a3b8]">Active Drivers</span>
                 <span className="text-xs font-bold text-white">{activeFleet.filter(d => d.status !== 'On Break').length} / {activeFleet.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-emerald-main transition-all duration-1000" 
                   style={{ width: activeFleet.length > 0 ? `${(activeFleet.filter(d => d.status !== 'On Break').length / activeFleet.length) * 100}%` : '0%' }}
                 />
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-[#94a3b8]">Avg. Rating</span>
                 <span className="text-xs font-bold text-emerald-main">4.75 ★</span>
              </div>
           </div>
        </div>
      </div>

      {/* Recruitment Modal */}
      <AnimatePresence>
        {isRecruitModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRecruitModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass p-8 border-emerald-main/30"
            >
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Logistics Recruitment</h3>
                  <p className="text-[#94a3b8] text-sm mt-1">Register a new partner for system verification.</p>
                </div>
                <button 
                  onClick={() => setIsRecruitModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-[#94a3b8] transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleRegisterDriver} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 placeholder-white/20 text-white focus:outline-none focus:border-emerald-main/50 transition-colors"
                      value={newDriver.name}
                      onChange={e => setNewDriver(prev => ({...prev, name: e.target.value}))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">Phone Number</label>
                      <input 
                        type="tel"
                        required
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 placeholder-white/20 text-white focus:outline-none focus:border-emerald-main/50 transition-colors"
                        value={newDriver.phone}
                        onChange={e => setNewDriver(prev => ({...prev, phone: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] ml-1">Experience</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-main/50 transition-colors"
                        value={newDriver.experience}
                        onChange={e => setNewDriver(prev => ({...prev, experience: e.target.value}))}
                      >
                        <option value="Entry Level">Entry Level</option>
                        <option value="1-3 Years">1-3 Years</option>
                        <option value="3-5 Years">3-5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsRecruitModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#94a3b8] hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-emerald-main text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                  >
                    Submit for Approval
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 glass px-6 py-4 flex items-center gap-4 bg-white/5 border-white/10 rounded-2xl">
          <Search className="text-[#94a3b8]" size={20} />
          <input 
            type="text" 
            placeholder="Filter crops by name, region or farmer..." 
            className="bg-transparent border-none focus:outline-none w-full text-white font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crops.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((crop) => (
          <div key={crop.id} className="glass p-5 flex flex-col hover:border-emerald-main/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  crop.status === 'harvested' ? 'bg-orange-500/10 text-orange-500' :
                  crop.status === 'dispatched' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-emerald-main/10 text-emerald-main'
                }`}>
                  <div className="font-bold text-lg">{crop.name.charAt(0)}</div>
                </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc]">{crop.name}</h3>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest">{crop.quantity} {crop.unit} • {crop.farmerName}, {crop.farmerLocation}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mt-auto border-t border-white/5 pt-3">
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Status:</span>
                <strong className={`font-medium ${
                  crop.status === 'harvested' ? 'text-orange-500' :
                  crop.status === 'dispatched' ? 'text-blue-500' :
                  'text-emerald-main'
                }`}>{crop.status.toUpperCase()}</strong>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Growth Phase:</span>
                <strong className="text-white">{crop.growthStage || 'N/A'}</strong>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>Unit Price:</span>
                <strong className="text-emerald-main">{formatCurrency(crop.pricePerUnit || 100)}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="glass p-8 bg-gradient-to-br from-red-500/5 to-transparent border-red-500/10">
        <div className="flex items-start justify-between mb-8">
           <div>
              <h3 className="text-2xl font-black text-white">Global Alert Broadcast</h3>
              <p className="text-[#94a3b8] mt-1">Push critical system-wide notifications to all active nodes.</p>
           </div>
           <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 animate-pulse">
              <Bell size={24} />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AlertBroadcaster 
            title="Weather Warning" 
            desc="Broadcast storm warnings to focused regions." 
            icon={<Globe />} 
            onClick={() => {
              if (addNotification) addNotification("Global Weather Warning broadcasted to Punjab and HP regions.");
              setModalConfig({isOpen: true, title: 'Broadcast Sent', desc: 'High-severity weather warning pushed to 42 active farmers.', actionLabel: 'Done'})
            }}
          />
          <AlertBroadcaster 
            title="Price Stabilization" 
            desc="Alert wholesalers of mandatory price ceilings." 
            icon={<TrendingDown />} 
            onClick={() => {
              if (addNotification) addNotification("Price stabilization mandate sent to all wholesalers.");
              setModalConfig({isOpen: true, title: 'Mandate Broadcasted', desc: 'New price ceiling protocols pushed to all wholesale hubs.', actionLabel: 'Done'})
            }}
          />
          <AlertBroadcaster 
            title="Supply Chain Update" 
            desc="General infrastructure updates for all agents." 
            icon={<ShieldCheck />} 
            onClick={() => {
              if (addNotification) addNotification("System maintenance alert broadcasted.");
              setModalConfig({isOpen: true, title: 'Update Sent', desc: 'Maintenance schedule synchronized across the network.', actionLabel: 'Done'})
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-main/10 border border-emerald-main/20 mb-4">
             <ShieldCheck size={14} className="text-emerald-main shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-black text-emerald-main uppercase tracking-[0.2em]">Tier-1 System Admin</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
            Central <span className="text-emerald-main italic">Control</span> Hub
          </h2>
          <p className="text-slate-400 mt-3 font-medium text-lg max-w-xl">
            Real-time surveillance & governance over <span className="text-white">FairFlow decentralized ecosystems</span>.
          </p>
        </div>

        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-[2rem] overflow-x-auto whitespace-nowrap scrollbar-hide shadow-2xl">
          {['Overview', 'Users', 'Inventory', 'Logistics', 'Alerts'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab ? 'bg-emerald-main text-black shadow-xl shadow-emerald-main/20' : 'text-slate-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeSubTab === 'Overview' && renderOverview()}
        {activeSubTab === 'Analytics' && <AdminAnalytics />}
        {activeSubTab === 'Users' && renderUsers()}
        {activeSubTab === 'Inventory' && renderInventory()}
        {activeSubTab === 'Logistics' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-3">
              Master Order Tracking <span className="text-xs bg-emerald-main/10 text-emerald-main px-2 py-0.5 rounded-full font-black">{orders.length} ACTIVE</span>
            </h3>
            {renderGlobalLogistics()}
          </div>
        )}
        {activeSubTab === 'Logistics' && renderFleetManagement()}
        {activeSubTab === 'Alerts' && renderAlerts()}
      </motion.div>

      <ActionModal 
        {...modalConfig} 
        onClose={() => setModalConfig(prev => ({...prev, isOpen: false}))} 
      />
    </div>
  );
}

function ImpactMetric({ label, value, icon, color = 'purple' }: any) {
  const colors: any = {
    purple: 'text-purple-500 bg-purple-500/10 group-hover:bg-purple-500/20',
    emerald: 'text-emerald-main bg-emerald-main/10 group-hover:bg-emerald-main/20',
    blue: 'text-blue-500 bg-blue-500/10 group-hover:bg-blue-500/20',
    orange: 'text-orange-500 bg-orange-500/10 group-hover:bg-orange-500/20',
  };

  return (
    <div className="bg-[#0c1210] p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 group hover:border-emerald-main/20 transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl border border-white/5 ${colors[color]}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: 1.5 })}
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white font-mono">{value}</p>
      </div>
    </div>
  );
}

function AlertBroadcaster({ title, desc, icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="text-left glass p-5 border-white/10 hover:border-emerald-main/30 group transition-all flex flex-col h-full"
    >
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#94a3b8] group-hover:bg-emerald-main group-hover:text-black transition-all mb-4">
        {icon}
      </div>
      <h4 className="font-bold text-white mb-1">{title}</h4>
      <p className="text-[11px] text-[#94a3b8] font-medium leading-relaxed mb-6">{desc}</p>
      <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#94a3b8] group-hover:text-emerald-main transition-all">
        Push Alert <ArrowRight size={14} />
      </div>
    </button>
  );
}
