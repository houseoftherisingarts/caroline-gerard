import React, { useState, useMemo, useEffect } from 'react';
import { Download, Eye, Truck, Search, Package } from 'lucide-react';
import { Order } from '../../types';
import { subscribeToOrders, updateOrderStatus } from '../../lib/firestore';
import Modal from '../../components/Modal';

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    return subscribeToOrders(setOrders);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => statusFilter === 'Tous' || order.status === statusFilter)
      .filter(order =>
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchTerm, statusFilter]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: 'Envoyé') => {
    await updateOrderStatus(orderId, newStatus);
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Client', 'Email', 'Date', 'Statut', 'Total', 'Articles'].join(','),
      ...filteredOrders.map(o => [
        o.id, o.customerName, o.email,
        new Date(o.date).toLocaleDateString('fr-CA'),
        o.status, o.total.toFixed(2),
        o.items.map(i => `${i.quantity}x ${i.title}`).join(' | '),
      ].map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Commandes</h1>
          <p className="text-slate-400 mt-1 text-sm">Gérez vos expéditions et suivis</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors self-start sm:self-auto text-sm"
        >
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-midnight/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Rechercher par client ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold"
        >
          <option value="Tous">Tous les statuts</option>
          <option value="Payé">Payé</option>
          <option value="Envoyé">Envoyé</option>
          <option value="En attente">En attente</option>
        </select>
      </div>

      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-white/5 text-white uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                    Aucune commande trouvée.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-white">{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{order.customerName}</div>
                    <div className="text-xs">{order.email}</div>
                  </td>
                  <td className="px-6 py-4">{new Date(order.date).toLocaleDateString('fr-CA')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      order.status === 'Payé' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'Envoyé' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gold text-right">{order.total.toFixed(2)} $</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleViewOrder(order)} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Voir">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Commande ${selectedOrder.id}`}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400 font-bold uppercase text-xs">Client</p>
                <p className="text-white font-bold">{selectedOrder.customerName}</p>
                <p className="text-slate-300">{selectedOrder.email}</p>
                {selectedOrder.phone && <p className="text-slate-400">{selectedOrder.phone}</p>}
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-xs">Adresse de livraison</p>
                <p className="text-white">{selectedOrder.address}</p>
              </div>
            </div>

            <div>
              <p className="text-slate-400 font-bold uppercase text-xs mb-2">Articles</p>
              <div className="space-y-2 border border-white/10 rounded-lg p-3 bg-black/20">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="text-white font-bold">{item.title}</p>
                      <p className="text-slate-400">Quantité: {item.quantity}</p>
                    </div>
                    <p className="text-gold font-bold">{(item.price * item.quantity).toFixed(2)} $</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax breakdown */}
            <div className="border border-white/10 rounded-lg p-3 bg-black/20 text-sm space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Sous-total</span><span>{(selectedOrder.subtotal ?? selectedOrder.total).toFixed(2)} $</span>
              </div>
              {selectedOrder.delivery != null && (
                <div className="flex justify-between text-slate-400">
                  <span>Livraison</span><span>{selectedOrder.delivery.toFixed(2)} $</span>
                </div>
              )}
              {selectedOrder.tps != null && (
                <div className="flex justify-between text-slate-400">
                  <span>TPS (5%)</span><span>{selectedOrder.tps.toFixed(2)} $</span>
                </div>
              )}
              {selectedOrder.tvq != null && (
                <div className="flex justify-between text-slate-400">
                  <span>TVQ (9,975%)</span><span>{selectedOrder.tvq.toFixed(2)} $</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-white/10">
                <span>Total</span>
                <span className="text-gold">{selectedOrder.total.toFixed(2)} $</span>
              </div>
            </div>

            {selectedOrder.squarePaymentId && (
              <p className="text-xs text-slate-600 font-mono">Square ID: {selectedOrder.squarePaymentId}</p>
            )}

            {selectedOrder.status === 'Payé' && (
              <button
                onClick={() => handleUpdateStatus(selectedOrder.id, 'Envoyé')}
                className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <Truck size={18} /> Marquer comme Envoyé
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminOrders;
