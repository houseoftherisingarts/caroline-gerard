import React, { useState, useMemo } from 'react';
import { Download, Eye, Truck, Search, Package } from 'lucide-react';
import { recentOrders } from '../../data';
import { Order } from '../../types';
import Modal from '../../components/Modal';

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>(recentOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        if (statusFilter === 'Tous') return true;
        return order.status === statusFilter;
      })
      .filter(order => 
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [orders, searchTerm, statusFilter]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = (orderId: string, newStatus: 'Payé' | 'Envoyé') => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setIsModalOpen(false);
  };

  const handleExport = () => {
    console.log("Exporting orders...", filteredOrders);
    alert('Exportation des commandes lancée (voir console).');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-serif font-bold text-white">Commandes</h1>
           <p className="text-slate-400 mt-1">Gérez vos expéditions et suivis</p>
        </div>
        <div className="flex gap-2">
           <button 
              onClick={handleExport}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              <Download size={16} /> Exporter
           </button>
        </div>
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
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-white">{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{order.customerName}</div>
                    <div className="text-xs">{order.email}</div>
                  </td>
                  <td className="px-6 py-4">{order.date}</td>
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
                      <button className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white" title="Imprimer">
                        <Truck size={16} />
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
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Détails Commande ${selectedOrder.id}`}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-400 font-bold uppercase text-xs">Client</p>
                        <p className="text-white font-bold">{selectedOrder.customerName}</p>
                        <p className="text-slate-300">{selectedOrder.email}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold uppercase text-xs">Adresse de livraison</p>
                        <p className="text-white">123 Rue Imaginaire, Ville de Québec, QC G1X 2Y3</p>
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
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                            <p className="text-white font-bold text-base">Total</p>
                            <p className="text-gold font-bold text-base">{selectedOrder.total.toFixed(2)} $</p>
                        </div>
                    </div>
                </div>
                
                {selectedOrder.status === 'Payé' && (
                    <button 
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Envoyé')}
                        className="w-full bg-gold text-midnight font-bold py-3 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                        <Package size={18} /> Marquer comme Envoyé
                    </button>
                )}
            </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminOrders;
