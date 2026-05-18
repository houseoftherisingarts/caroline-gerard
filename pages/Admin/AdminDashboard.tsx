import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, ShoppingCart, Eye, Users, TrendingUp,
  AlertTriangle, Mail, Box, ChevronRight,
} from 'lucide-react';
import ToggleSwitch from '../../components/ToggleSwitch';
import { Link } from 'react-router-dom';
import { Order, Lead } from '../../types';
import {
  subscribeToOrders,
  subscribeToAbandonedCheckouts,
  subscribeToVisitorCount,
  type AbandonedCheckout,
} from '../../lib/firestore';

const StatCard = ({
  title, value, trend, trendUp, sub, icon,
}: {
  title: string; value: string; trend?: string; trendUp?: boolean; sub?: string; icon: React.ReactNode;
}) => (
  <div className="bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg border border-white/10 hover:border-gold/30 transition-all group">
    <div className="flex justify-between items-start mb-3 md:mb-4">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-xl md:text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className="p-3 bg-white/5 rounded-xl group-hover:bg-gold/10 transition-colors">
        {icon}
      </div>
    </div>
    {trend && (
      <p className={`text-xs font-bold flex items-center gap-1 ${trendUp !== false ? 'text-green-400' : 'text-red-400'}`}>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${trendUp !== false ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {trend}
        </span>
        vs mois dernier
      </p>
    )}
    {sub && <p className="text-slate-500 text-xs font-bold">{sub}</p>}
  </div>
);

// Build last-N-months labels + aggregate order revenue into them
function buildSalesChart(orders: Order[], months = 6): { month: string; sales: number }[] {
  const now = new Date();
  const result: { month: string; sales: number; key: string }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-CA', { month: 'short' }).toUpperCase().replace('.', '');
    result.push({ month: label, sales: 0, key });
  }

  orders.forEach(order => {
    const key = order.date.slice(0, 7); // "YYYY-MM"
    const slot = result.find(r => r.key === key);
    if (slot) slot.sales += order.total;
  });

  return result.map(({ month, sales }) => ({ month, sales: parseFloat(sales.toFixed(2)) }));
}

function pct(a: number, b: number): string {
  if (b === 0) return '—';
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(0)}%`;
}

const AdminDashboard = ({
  showVisitorCount,
  setShowVisitorCount,
  leads,
}: {
  showVisitorCount: boolean;
  setShowVisitorCount: (show: boolean) => void;
  leads: Lead[];
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [abandoned, setAbandoned] = useState<AbandonedCheckout[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    const unsubs = [
      subscribeToOrders(setOrders),
      subscribeToAbandonedCheckouts(setAbandoned),
      subscribeToVisitorCount(setVisitorCount),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Derived metrics ────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const metrics = useMemo(() => {
    const thisMonth = orders.filter(o => o.date.startsWith(thisMonthKey));
    const lastMonth = orders.filter(o => o.date.startsWith(lastMonthKey));

    const revenueThis = thisMonth.reduce((s, o) => s + o.total, 0);
    const revenueLast = lastMonth.reduce((s, o) => s + o.total, 0);
    const ordersThis = thisMonth.length;
    const ordersLast = lastMonth.length;

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const salesChart = buildSalesChart(orders, 6);

    // Conversion: completed / (completed + abandoned) this month
    const abandonedThisMonth = abandoned.filter(a => a.startedAt.startsWith(thisMonthKey)).length;
    const conversionRate = ordersThis + abandonedThisMonth > 0
      ? Math.round((ordersThis / (ordersThis + abandonedThisMonth)) * 100)
      : null;

    return { revenueThis, revenueLast, ordersThis, ordersLast, totalRevenue, salesChart, conversionRate };
  }, [orders, abandoned, thisMonthKey, lastMonthKey]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [orders]
  );

  const sortedAbandoned = useMemo(
    () => [...abandoned].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [abandoned]
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Tableau de Bord</h1>
        <p className="text-slate-400 mt-1 text-sm">Données en temps réel</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Ventes ce mois"
          value={`${metrics.revenueThis.toFixed(2)} $`}
          trend={pct(metrics.revenueThis, metrics.revenueLast)}
          trendUp={metrics.revenueThis >= metrics.revenueLast}
          icon={<DollarSign className="text-gold" />}
        />
        <StatCard
          title="Commandes ce mois"
          value={metrics.ordersThis.toString()}
          trend={pct(metrics.ordersThis, metrics.ordersLast)}
          trendUp={metrics.ordersThis >= metrics.ordersLast}
          icon={<ShoppingCart className="text-blue-400" />}
        />
        <StatCard
          title="Revenus totaux"
          value={`${metrics.totalRevenue.toFixed(2)} $`}
          sub={`${orders.length} commandes au total`}
          icon={<TrendingUp className="text-green-400" />}
        />
        <StatCard
          title="Paniers abandonnés"
          value={abandoned.length.toString()}
          sub={metrics.conversionRate !== null ? `Taux de conversion: ${metrics.conversionRate}%` : 'Aucune donnée'}
          icon={<AlertTriangle className="text-yellow-400" />}
        />
        <StatCard
          title="Nouveaux Leads"
          value={leads.length.toString()}
          sub="Depuis le lancement"
          icon={<Mail className="text-teal-400" />}
        />
        <StatCard
          title="Abonnés"
          value="—"
          sub="Connecter une liste d'envoi"
          icon={<Users className="text-purple-400" />}
        />

        {/* Visitor counter with toggle */}
        <div className="bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg border border-white/10 col-span-2 md:col-span-2">
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
            <label className="text-xs text-slate-400 font-bold">Afficher au public</label>
            <ToggleSwitch checked={showVisitorCount} onChange={setShowVisitorCount} />
          </div>
        </div>
      </div>

      {/* ── Sales Chart + Recent Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 bg-midnight/60 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/10 shadow-lg">
          <h3 className="text-base md:text-xl font-bold text-white mb-4 md:mb-6">Revenus — 6 derniers mois</h3>
          {metrics.salesChart.every(d => d.sales === 0) ? (
            <div className="h-48 md:h-72 flex items-center justify-center text-slate-600">
              Aucune vente encore enregistrée.
            </div>
          ) : (
            <div className="h-48 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}$`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#d4af37' }}
                    cursor={{ fill: '#ffffff05' }}
                    formatter={(v: number) => [`${v.toFixed(2)} $`, 'Ventes']}
                  />
                  <Bar dataKey="sales" fill="#d4af37" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4">Commandes Récentes</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentOrders.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">Aucune commande.</p>
            ) : recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                    <Box size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{order.customerName}</p>
                    <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('fr-CA')}</p>
                  </div>
                </div>
                <span className="text-gold font-bold text-sm">{order.total.toFixed(2)} $</span>
              </div>
            ))}
          </div>
          <Link to="/admin/commandes" className="mt-4 text-center text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1">
            Toutes les commandes <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Abandoned Checkouts ── */}
      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-yellow-500/20 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <AlertTriangle className="text-yellow-400" size={20} />
          <h3 className="text-xl font-bold text-white">Transactions incomplètes</h3>
          {abandoned.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {abandoned.length}
            </span>
          )}
        </div>

        {sortedAbandoned.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-600 text-sm">
            Aucun panier abandonné.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-400">
              <thead className="bg-white/5 text-white uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Client</th>
                  <th className="px-6 py-3 text-left">Articles</th>
                  <th className="px-6 py-3 text-left">Sous-total</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedAbandoned.map(a => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{a.firstName} {a.lastName}</div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {a.cartItems.map(i => (
                        <div key={i.title} className="text-xs">{i.quantity}× {i.title}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-gold font-bold">{a.subtotal.toFixed(2)} $</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(a.startedAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={`mailto:${a.email}?subject=Ta commande chez Caroline Gérard&body=Bonjour ${a.firstName},%0D%0A%0D%0AJ'ai remarqué que tu n'as pas complété ta commande. Puis-je t'aider?`}
                        className="text-xs bg-gold/20 text-gold hover:bg-gold hover:text-midnight font-bold px-3 py-1.5 rounded-lg transition-colors inline-block"
                      >
                        Contacter
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
