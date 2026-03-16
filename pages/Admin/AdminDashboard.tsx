import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, ShoppingCart, Globe, Users, Plus, Box, Eye, Mail } from 'lucide-react';
import ToggleSwitch from '../../components/ToggleSwitch';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import { Order, Lead } from '../../types';

// --- Helper Components ---
const StatCard = ({ title, value, trend, sub, icon }: { title: string, value: string, trend?: string, sub?: string, icon: React.ReactNode }) => {
  return (
    <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/10 hover:border-gold/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">{title}</p>
           <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        </div>
        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-gold/10 transition-colors">
          {icon}
        </div>
      </div>
      {trend && (
        <p className="text-green-400 text-xs font-bold flex items-center gap-1">
          <span className="bg-green-500/10 px-1.5 py-0.5 rounded text-[10px]">{trend}</span>
          vs mois dernier
        </p>
      )}
      {sub && (
        <p className="text-slate-500 text-xs font-bold">{sub}</p>
      )}
    </div>
  );
};

// --- Main Component ---
const AdminDashboard = ({ 
  recentOrdersList, 
  setRecentOrdersList,
  salesDataState,
  setSalesDataState,
  visitorCount,
  showVisitorCount,
  setShowVisitorCount,
  leads
}: { 
  recentOrdersList: Order[], 
  setRecentOrdersList: (orders: Order[]) => void,
  salesDataState: { month: string, sales: number }[],
  setSalesDataState: (data: { month: string, sales: number }[]) => void,
  visitorCount: number,
  showVisitorCount: boolean,
  setShowVisitorCount: (show: boolean) => void,
  leads: Lead[]
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSaleAmount, setNewSaleAmount] = useState('');
  const [newSaleCustomer, setNewSaleCustomer] = useState('');
  const [timeRange, setTimeRange] = useState('6 mois');

  // --- NEW STATE for Traffic Analysis ---
  const [trafficData, setTrafficData] = useState([
    { month: 'JAN', visitors: 1205 },
    { month: 'FEV', visitors: 1523 },
    { month: 'MAR', visitors: 1389 },
    { month: 'AVR', visitors: 1842 },
    { month: 'MAI', visitors: 2103 },
    { month: 'JUIN', visitors: 2450 },
  ]);

  const [trafficSources, setTrafficSources] = useState([
    { name: 'Organique', value: 450 },
    { name: 'Social', value: 300 },
    { name: 'Direct', value: 250 },
  ]);
  const SOURCE_COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      customerName: newSaleCustomer,
      email: 'manual@sale.com',
      date: new Date().toISOString().split('T')[0],
      status: 'Payé',
      total: parseFloat(newSaleAmount),
      items: []
    };
    setRecentOrdersList([newOrder, ...recentOrdersList]);
    
    const currentMonth = new Date().toLocaleString('fr-CA', { month: 'short' }).toUpperCase().replace('.', '');
    const updatedSales = salesDataState.map(d => {
      if (d.month === currentMonth) {
        return { ...d, sales: d.sales + parseFloat(newSaleAmount) };
      }
      return d;
    });
    setSalesDataState(updatedSales);

    setIsModalOpen(false);
    setNewSaleAmount('');
    setNewSaleCustomer('');
  };

  // --- UPDATED to handle all charts ---
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setTimeRange(range);
    
    // Simulate fetching new data by scrambling existing data
    setSalesDataState(salesDataState.map(d => ({ ...d, sales: Math.floor(Math.random() * 5000) + 1000 })));
    setTrafficData(trafficData.map(d => ({ ...d, visitors: Math.floor(Math.random() * 2000) + 500 })));
    setTrafficSources([
      { name: 'Organique', value: Math.floor(Math.random() * 500) + 200 },
      { name: 'Social', value: Math.floor(Math.random() * 400) + 150 },
      { name: 'Direct', value: Math.floor(Math.random() * 300) + 100 },
    ]);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Tableau de Bord</h1>
          <p className="text-slate-400 mt-1">Vue d&apos;ensemble de votre activité</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Nouvelle Vente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ventes ce mois" value={`${salesDataState[salesDataState.length - 1]?.sales || 0} $`} trend="+12%" icon={<DollarSign className="text-gold" />} />
        <StatCard title="Commandes" value={recentOrdersList.length.toString()} trend="+5%" icon={<ShoppingCart className="text-blue-400" />} />
        <StatCard title="Visiteurs" value={trafficData.reduce((sum, item) => sum + item.visitors, 0).toLocaleString('fr-FR')} trend="+18%" icon={<Globe className="text-green-400" />} />
        <StatCard title="Nouveaux Abonnés" value="128" sub="Total: 3,450" icon={<Users className="text-purple-400" />} />
        <StatCard title="Nouveaux Leads" value={leads.length.toString()} sub="Depuis le lancement" icon={<Mail className="text-teal-400" />} />
        <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Visiteurs Totaux</p>
              <h3 className="text-2xl font-bold text-white mt-1">{visitorCount.toLocaleString('fr-FR')}</h3>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <Eye className="text-gold" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label htmlFor="show-visitor-count" className="text-xs text-slate-400 font-bold">Afficher au public</label>
            <ToggleSwitch checked={showVisitorCount} onChange={setShowVisitorCount} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-midnight/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white">Analyse des Ventes</h3>
             <select 
               value={timeRange} 
               onChange={handleTimeRangeChange}
               className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-slate-300 focus:outline-none focus:border-gold"
             >
               <option>7 jours</option>
               <option>30 jours</option>
               <option>6 mois</option>
               <option>1 an</option>
             </select>
           </div>
           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={salesDataState}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                 <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                 <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}$`} />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#fbbf24' }}
                    cursor={{ fill: '#ffffff05' }}
                 />
                 <Bar dataKey="sales" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg flex flex-col">
           <h3 className="text-xl font-bold text-white mb-4">Commandes Récentes</h3>
           <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
             {recentOrdersList.map(order => (
               <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                        <Box size={16} />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-white">{order.customerName}</p>
                        <p className="text-xs text-slate-400">{order.date}</p>
                     </div>
                  </div>
                  <span className="text-gold font-bold text-sm">{order.total} $</span>
               </div>
             ))}
           </div>
           <Link to="/admin/commandes" className="mt-4 text-center text-sm text-slate-400 hover:text-white transition-colors">
             Voir toutes les commandes
           </Link>
        </div>
      </div>

      {/* --- NEW Traffic Analysis Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-midnight/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
           <h3 className="text-xl font-bold text-white mb-6">Visiteurs (Trafic)</h3>
           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                    <defs>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#8884d8' }}
                        cursor={{ stroke: '#8884d8', strokeWidth: 1, fill: '#ffffff05' }}
                    />
                    <Area type="monotone" dataKey="visitors" stroke="#8884d8" fillOpacity={1} fill="url(#colorVisitors)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg flex flex-col items-center">
           <h3 className="text-xl font-bold text-white mb-4 w-full">Sources de Trafic</h3>
           <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={trafficSources}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                        >
                            {trafficSources.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        />
                        <Legend iconSize={10} wrapperStyle={{fontSize: '12px', color: '#94a3b8'}} />
                    </PieChart>
                </ResponsiveContainer>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle Vente Manuelle">
        <form onSubmit={handleAddSale} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Client</label>
            <input 
              type="text" 
              value={newSaleCustomer}
              onChange={(e) => setNewSaleCustomer(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold"
              placeholder="Nom du client"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Montant ($)</label>
            <input 
              type="number" 
              value={newSaleAmount}
              onChange={(e) => setNewSaleAmount(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold"
              placeholder="0.00"
              required
            />
          </div>
          <button type="submit" className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors">
            Enregistrer la vente
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
