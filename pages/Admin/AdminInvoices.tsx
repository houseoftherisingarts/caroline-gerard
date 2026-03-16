import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Mail, 
  MapPin, 
  Phone, 
  FileText, 
  User, 
  Truck, 
  CheckCircle2,
  Circle
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  isTaxable: boolean;
  quantity: number;
  rate: number;
}

const AdminInvoices = () => {
  // --- State ---
  const [invoiceMeta, setInvoiceMeta] = useState({
    number: `FAC-${Math.floor(Math.random() * 9000) + 1000}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    terms: 'Payable dès réception'
  });

  const [billTo, setBillTo] = useState({
    name: '',
    address: '',
    email: ''
  });

  const [shipTo, setShipTo] = useState({
    name: '',
    address: '',
    phone: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', isTaxable: true, quantity: 1, rate: 0 }
  ]);

  const [shipping, setShipping] = useState({
    method: 'Livraison standard 3-5 jours',
    cost: 12.00
  });

  // --- Calculations ---
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    
    // Taxes are calculated on taxable items + shipping
    const taxableItemsTotal = items.reduce((sum, item) => 
      item.isTaxable ? sum + (item.quantity * item.rate) : sum, 0
    );
    
    const taxBase = taxableItemsTotal + shipping.cost;
    const tps = taxBase * 0.05;
    const tvq = taxBase * 0.09975;
    const grandTotal = subtotal + shipping.cost + tps + tvq;

    return {
      subtotal,
      shipping: shipping.cost,
      tps,
      tvq,
      grandTotal
    };
  }, [items, shipping.cost]);

  // --- Handlers ---
  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      description: '', 
      isTaxable: true, 
      quantity: 1, 
      rate: 0 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number | boolean) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Global Print Styles to hide sidebar and other elements */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, nav, footer, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          @page { margin: 1cm; }
        }
      `}} />

      <div className="flex flex-col xl:flex-row gap-8">
        {/* --- EDITOR (Left) --- */}
        <div className="flex-1 space-y-8 no-print">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold text-white">Créateur de Facture</h1>
              <p className="text-slate-400 mt-1">Générez vos documents professionnels</p>
            </div>
            <button 
              onClick={handlePrint}
              className="bg-gold text-midnight px-6 py-3 rounded-xl font-bold hover:bg-white transition-all flex items-center gap-2 shadow-lg shadow-gold/20"
            >
              <Printer size={20} /> Imprimer / PDF
            </button>
          </div>

          {/* Meta Info */}
          <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-gold flex items-center gap-2">
              <FileText size={18} /> Informations Générales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Facture</label>
                <input 
                  type="text" 
                  value={invoiceMeta.number}
                  onChange={(e) => setInvoiceMeta({...invoiceMeta, number: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conditions</label>
                <input 
                  type="text" 
                  value={invoiceMeta.terms}
                  onChange={(e) => setInvoiceMeta({...invoiceMeta, terms: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date d&apos;émission</label>
                <input 
                  type="date" 
                  value={invoiceMeta.date}
                  onChange={(e) => setInvoiceMeta({...invoiceMeta, date: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date d&apos;échéance</label>
                <input 
                  type="date" 
                  value={invoiceMeta.dueDate}
                  onChange={(e) => setInvoiceMeta({...invoiceMeta, dueDate: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-gold flex items-center gap-2">
                <User size={18} /> Facturé À
              </h3>
              <div className="space-y-3">
                <input 
                  placeholder="Nom du client"
                  value={billTo.name}
                  onChange={(e) => setBillTo({...billTo, name: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
                <textarea 
                  placeholder="Adresse complète"
                  value={billTo.address}
                  onChange={(e) => setBillTo({...billTo, address: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none h-20"
                />
                <input 
                  placeholder="Courriel"
                  value={billTo.email}
                  onChange={(e) => setBillTo({...billTo, email: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-gold flex items-center gap-2">
                <Truck size={18} /> Livré À
              </h3>
              <div className="space-y-3">
                <input 
                  placeholder="Nom du destinataire"
                  value={shipTo.name}
                  onChange={(e) => setShipTo({...shipTo, name: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
                <textarea 
                  placeholder="Adresse de livraison"
                  value={shipTo.address}
                  onChange={(e) => setShipTo({...shipTo, address: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none h-20"
                />
                <input 
                  placeholder="Téléphone"
                  value={shipTo.phone}
                  onChange={(e) => setShipTo({...shipTo, phone: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gold flex items-center gap-2">
                <Plus size={18} /> Articles & Services
              </h3>
              <button 
                onClick={addItem}
                className="text-xs font-bold bg-gold/10 text-gold px-3 py-1 rounded-lg hover:bg-gold/20 transition-colors"
              >
                + Ajouter une ligne
              </button>
            </div>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex-1">
                    <input 
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 px-2 py-1 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-20">
                      <label className="block text-[10px] text-slate-500 uppercase mb-1">Qté</label>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] text-slate-500 uppercase mb-1">Taux ($)</label>
                      <input 
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>
                    <button 
                      onClick={() => updateItem(item.id, 'isTaxable', !item.isTaxable)}
                      className={`mt-4 p-2 rounded-lg transition-colors ${item.isTaxable ? 'text-gold bg-gold/10' : 'text-slate-500 bg-white/5'}`}
                      title="Taxable ?"
                    >
                      {item.isTaxable ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="mt-4 p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-gold flex items-center gap-2">
              <Truck size={18} /> Livraison
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mode de livraison</label>
                <input 
                  type="text" 
                  value={shipping.method}
                  onChange={(e) => setShipping({...shipping, method: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frais ($)</label>
                <input 
                  type="number" 
                  value={shipping.cost}
                  onChange={(e) => setShipping({...shipping, cost: parseFloat(e.target.value) || 0})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-gold outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- LIVE PREVIEW (Right) --- */}
        <div className="xl:w-[800px] print:w-full">
          <div className="bg-white text-black p-12 shadow-2xl min-h-[1056px] flex flex-col print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900">Caroline Gérard</h2>
                <p className="text-slate-500 font-medium">Auteure</p>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><MapPin size={14} /> 501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0</p>
                  <p className="flex items-center gap-2"><Phone size={14} /> 819 993-0714</p>
                  <p className="flex items-center gap-2"><Mail size={14} /> caroline.gerard@live.ca</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-5xl font-serif font-bold text-slate-200 uppercase tracking-tighter mb-4">Facture</h1>
                <div className="space-y-1 text-sm">
                  <p><span className="font-bold text-slate-400 uppercase mr-2">N° Facture:</span> {invoiceMeta.number}</p>
                  <p><span className="font-bold text-slate-400 uppercase mr-2">Date:</span> {invoiceMeta.date}</p>
                  <p><span className="font-bold text-slate-400 uppercase mr-2">Échéance:</span> {invoiceMeta.dueDate}</p>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Facturé À</h4>
                <div className="text-slate-800">
                  <p className="font-bold text-lg">{billTo.name || 'Nom du client'}</p>
                  <p className="whitespace-pre-wrap text-sm mt-1">{billTo.address || 'Adresse'}</p>
                  <p className="text-sm mt-1">{billTo.email}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Livré À</h4>
                <div className="text-slate-800">
                  <p className="font-bold text-lg">{shipTo.name || 'Nom du destinataire'}</p>
                  <p className="whitespace-pre-wrap text-sm mt-1">{shipTo.address || 'Adresse de livraison'}</p>
                  <p className="text-sm mt-1">{shipTo.phone}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4">Description</th>
                    <th className="py-4 text-center w-20">Qté</th>
                    <th className="py-4 text-right w-32">Taux</th>
                    <th className="py-4 text-right w-32">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="text-sm">
                      <td className="py-4">
                        <p className="font-bold text-slate-800">{item.description || 'Description de l&apos;article'}</p>
                        {item.isTaxable && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">Taxable</span>}
                      </td>
                      <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-4 text-right text-slate-600">{item.rate.toFixed(2)} $</td>
                      <td className="py-4 text-right font-bold text-slate-900">{(item.quantity * item.rate).toFixed(2)} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-12 pt-8 border-t-2 border-slate-900 flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase">Total Partiel</span>
                  <span className="font-bold text-slate-900">{totals.subtotal.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase">Livraison</span>
                  <span className="font-bold text-slate-900">{totals.shipping.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase">TPS (5%)</span>
                  <span className="font-bold text-slate-900">{totals.tps.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase">TVQ (9.975%)</span>
                  <span className="font-bold text-slate-900">{totals.tvq.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-xl border-t border-slate-200 pt-3">
                  <span className="font-serif font-bold text-slate-900 uppercase">Total</span>
                  <span className="font-serif font-bold text-gold">{totals.grandTotal.toFixed(2)} $</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instructions de Paiement</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pour un paiement par virement bancaire, utiliser l&apos;adresse <span className="font-bold text-slate-900">caroline.gerard@live.ca</span> et le mot de passe: <span className="font-bold text-slate-900">livre</span>. Merci de votre achat!
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Informations Fiscales</h4>
                  <p className="text-[10px] text-slate-500">
                    N° d&apos;inscription TPS/TVH: 781718333 RT0001<br />
                    N° d&apos;enregistrement TVQ: 1041635416 TQ0001
                  </p>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Caroline Gérard — Auteure — Saint-Tite, Québec</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoices;
