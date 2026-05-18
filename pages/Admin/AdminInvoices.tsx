import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { subscribeToInvoices, saveInvoice, deleteInvoice, StoredInvoice } from '../../lib/firestore';
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
  Circle,
  Save,
} from 'lucide-react';

// ── localStorage keys ──────────────────────────────────────────────────────────
const LS_BILL  = 'cg_inv_billTo';
const LS_SHIP  = 'cg_inv_shipTo';
const LS_SHIP2 = 'cg_inv_shipping';
const LS_TERMS = 'cg_inv_terms';

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Invoice print (new window — perfect replica) ───────────────────────────────
function printInvoiceWindow(params: {
  meta: { number: string; date: string; dueDate: string; terms: string };
  billTo: { name: string; address: string; email: string };
  shipTo: { name: string; address: string; phone: string };
  items: { description: string; isTaxable: boolean; quantity: number; rate: number }[];
  shipping: { method: string; cost: number };
  totals: { subtotal: number; shipping: number; tps: number; tvq: number; grandTotal: number };
}) {
  const { meta, billTo, shipTo, items, shipping, totals } = params;
  const itemRows = items.map(it => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">
        <strong style="color:#1e293b;">${it.description || '—'}</strong>
        ${it.isTaxable ? '<br/><span style="font-size:10px;color:#94a3b8;background:#f1f5f9;padding:1px 5px;border-radius:3px;">Taxable</span>' : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;color:#64748b;">${it.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#64748b;">${it.rate.toFixed(2)}&nbsp;$</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:#1e293b;">${(it.quantity * it.rate).toFixed(2)}&nbsp;$</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Facture ${meta.number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Lato',sans-serif;background:#fff;color:#334155;max-width:820px;margin:0 auto;padding:48px 40px;}
    .serif{font-family:'Playfair Display',serif;}
    @media print{body{padding:0 24px;}.no-print{display:none!important;}@page{margin:1cm;size:letter;}}
    .btn{display:inline-block;background:#d4af37;color:#fff;border:none;padding:10px 28px;font-size:14px;border-radius:8px;cursor:pointer;margin-bottom:28px;font-weight:700;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #f1f5f9;padding-bottom:32px;margin-bottom:32px;}
    .from h2{font-family:'Playfair Display',serif;font-size:28px;color:#0f172a;margin-bottom:4px;}
    .from p{color:#94a3b8;font-size:13px;font-weight:700;letter-spacing:.05em;}
    .from-meta{margin-top:16px;font-size:13px;color:#64748b;line-height:1.7;}
    .inv-label{font-family:'Playfair Display',serif;font-size:48px;font-weight:700;color:#e2e8f0;letter-spacing:-.03em;line-height:1;}
    .inv-meta{margin-top:12px;font-size:13px;text-align:right;line-height:1.8;}
    .inv-meta span{color:#94a3b8;font-weight:700;font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-right:8px;}
    .addresses{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px;}
    .addr-label{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #f1f5f9;padding-bottom:4px;margin-bottom:10px;}
    .addr-name{font-size:17px;font-weight:700;color:#0f172a;margin-bottom:4px;}
    .addr-detail{font-size:13px;color:#64748b;white-space:pre-wrap;line-height:1.6;}
    table{width:100%;border-collapse:collapse;}
    thead tr{border-bottom:2px solid #0f172a;}
    th{padding:12px 0;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;}
    th:nth-child(2){text-align:center;width:60px;}
    th:nth-child(3),th:last-child{text-align:right;width:100px;}
    .totals-wrap{display:flex;justify-content:flex-end;margin-top:40px;padding-top:24px;border-top:2px solid #0f172a;}
    .totals{width:300px;}
    .totals-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#64748b;}
    .totals-row span:last-child{font-weight:700;color:#0f172a;}
    .totals-grand{display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;margin-top:12px;padding-top:14px;font-family:'Playfair Display',serif;font-size:20px;font-weight:700;}
    .totals-grand span:last-child{color:#d4af37;}
    .footer{margin-top:48px;padding-top:24px;border-top:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:32px;}
    .footer-label{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;}
    .footer-text{font-size:12px;color:#64748b;line-height:1.6;}
    .footer-right{text-align:right;}
    .foot-stamp{margin-top:28px;text-align:center;font-size:10px;color:#cbd5e1;letter-spacing:.2em;text-transform:uppercase;}
  </style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">⎙ &nbsp;Imprimer / Enregistrer PDF</button>
  <div class="header">
    <div class="from">
      <h2>Caroline Gérard</h2>
      <p>Auteure</p>
      <div class="from-meta">
        <div>📍 501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0</div>
        <div>📞 819 993-0714</div>
        <div>✉️ caroline@carolinegerard.ca</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div class="inv-label">Facture</div>
      <div class="inv-meta">
        <div><span>N° Facture</span>${meta.number}</div>
        <div><span>Date</span>${meta.date}</div>
        <div><span>Échéance</span>${meta.dueDate}</div>
        <div><span>Conditions</span>${meta.terms}</div>
      </div>
    </div>
  </div>

  <div class="addresses">
    <div>
      <div class="addr-label">Facturé À</div>
      <div class="addr-name">${billTo.name || '—'}</div>
      <div class="addr-detail">${billTo.address || ''}</div>
      ${billTo.email ? `<div class="addr-detail">${billTo.email}</div>` : ''}
    </div>
    <div>
      <div class="addr-label">Livré À</div>
      <div class="addr-name">${shipTo.name || '—'}</div>
      <div class="addr-detail">${shipTo.address || ''}</div>
      ${shipTo.phone ? `<div class="addr-detail">${shipTo.phone}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Description</th>
        <th>Qté</th>
        <th>Taux</th>
        <th>Montant</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Sous-total</span><span>${totals.subtotal.toFixed(2)} $</span></div>
      <div class="totals-row"><span>Livraison (${shipping.method})</span><span>${totals.shipping.toFixed(2)} $</span></div>
      <div class="totals-row"><span>TPS (5 % — livres + livraison)</span><span>${totals.tps.toFixed(2)} $</span></div>
      <div class="totals-row"><span>TVQ (9,975 % — livraison seul.)</span><span>${totals.tvq.toFixed(2)} $</span></div>
      <div class="totals-grand"><span>Total CAD</span><span>${totals.grandTotal.toFixed(2)} $</span></div>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="footer-label">Instructions de paiement</div>
      <div class="footer-text">
        Virement Interac à <strong>caroline@carolinegerard.ca</strong><br/>
        Mot de passe : <strong>livre</strong><br/>
        Merci de ton achat !
      </div>
    </div>
    <div class="footer-right">
      <div class="footer-label">Informations fiscales</div>
      <div class="footer-text">
        N° TPS/TVH : 781718333 RT0001<br/>
        N° TVQ : 1041635416 TQ0001
      </div>
    </div>
  </div>
  <div class="foot-stamp">Caroline Gérard — Auteure — Saint-Tite, Québec</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=1050,scrollbars=yes');
  if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

interface InvoiceItem {
  id: string;
  description: string;
  isTaxable: boolean;
  quantity: number;
  rate: number;
}

const AdminInvoices = () => {
  // ── State — pre-filled from localStorage ──────────────────────────────────
  const [invoiceMeta, setInvoiceMeta] = useState({
    number: `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    terms: lsGet(LS_TERMS, 'Payable dès réception') as string,
  });

  const [billTo, setBillTo] = useState(
    lsGet(LS_BILL, { name: '', address: '', email: '' }) as { name: string; address: string; email: string }
  );

  const [shipTo, setShipTo] = useState(
    lsGet(LS_SHIP, { name: '', address: '', phone: '' }) as { name: string; address: string; phone: string }
  );

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', isTaxable: true, quantity: 1, rate: 0 }
  ]);

  const [shipping, setShipping] = useState(
    lsGet(LS_SHIP2, { method: 'Livraison standard 3-5 jours', cost: 6.00 }) as { method: string; cost: number }
  );

  // Persist defaults whenever these fields change
  useEffect(() => { lsSet(LS_BILL,  billTo);           }, [billTo]);
  useEffect(() => { lsSet(LS_SHIP,  shipTo);           }, [shipTo]);
  useEffect(() => { lsSet(LS_SHIP2, shipping);         }, [shipping]);
  useEffect(() => { lsSet(LS_TERMS, invoiceMeta.terms);}, [invoiceMeta.terms]);

  // --- Calculations ---
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    // Quebec tax rules for books:
    // TPS (5 %) applies to taxable items (books) + shipping
    // TVQ (9,975 %) applies to shipping ONLY — books are TVQ-exempt in Quebec
    const taxableItemsTotal = items.reduce((sum, item) =>
      item.isTaxable ? sum + (item.quantity * item.rate) : sum, 0
    );

    const tps = (taxableItemsTotal + shipping.cost) * 0.05;
    const tvq = shipping.cost * 0.09975; // shipping only, not books
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

  const [savedInvoices, setSavedInvoices] = useState<StoredInvoice[]>([]);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    return subscribeToInvoices(invoices => {
      setSavedInvoices(invoices.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    });
  }, []);

  const handleSave = async () => {
    const invoice: StoredInvoice = {
      id: `inv-${Date.now()}`,
      number: invoiceMeta.number,
      clientName: billTo.name || 'Client sans nom',
      savedAt: new Date().toISOString(),
      meta: invoiceMeta,
      billTo,
      shipTo,
      items,
      shipping,
    };
    await saveInvoice(invoice);
    // Persist defaults for next session
    lsSet(LS_BILL,  billTo);
    lsSet(LS_SHIP,  shipTo);
    lsSet(LS_SHIP2, shipping);
    lsSet(LS_TERMS, invoiceMeta.terms);
    setSaveMsg('Facture sauvegardée !');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleLoad = (inv: StoredInvoice) => {
    setInvoiceMeta(inv.meta);
    setBillTo(inv.billTo);
    setShipTo(inv.shipTo);
    setItems(inv.items);
    setShipping(inv.shipping);
  };

  const handlePrint = useCallback(() => {
    printInvoiceWindow({ meta: invoiceMeta, billTo, shipTo, items, shipping, totals });
  }, [invoiceMeta, billTo, shipTo, items, shipping, totals]);

  return (
    <div className="min-h-screen animate-fade-in">

      <div className="flex flex-col xl:flex-row gap-8">
        {/* --- EDITOR (Left) --- */}
        <div className="flex-1 space-y-8 no-print">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Créateur de Facture</h1>
              <p className="text-slate-400 mt-1 text-sm">Génère tes documents professionnels</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {saveMsg && <span className="text-green-400 text-sm font-bold">{saveMsg}</span>}
              <button
                onClick={handleSave}
                className="bg-white/10 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2 text-sm"
              >
                <Save size={16} /> Sauvegarder
              </button>
              <button
                onClick={handlePrint}
                className="bg-gold text-midnight px-4 py-2.5 rounded-xl font-bold hover:bg-white transition-all flex items-center gap-2 shadow-lg shadow-gold/20 text-sm"
              >
                <Printer size={16} /> PDF parfait
              </button>
            </div>
          </div>

          {/* Saved Invoices */}
          {savedInvoices.length > 0 && (
            <div className="bg-midnight/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Factures sauvegardées</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-white text-sm font-bold">{inv.number}</span>
                      <span className="text-slate-400 text-xs ml-3">{inv.clientName}</span>
                      <span className="text-slate-600 text-xs ml-3">{new Date(inv.savedAt).toLocaleDateString('fr-CA')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleLoad(inv)} className="text-xs text-gold hover:text-white font-bold px-2 py-1 bg-gold/10 rounded">Charger</button>
                      <button onClick={() => deleteInvoice(inv.id)} className="text-xs text-red-400 hover:text-white px-2 py-1 bg-red-400/10 rounded">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-midnight/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-gold flex items-center gap-2">
              <FileText size={18} /> Informations Générales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      title="Sujet à la TPS ? (les livres imprimés sont exempts de TVQ au Québec)"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 xl:hidden no-print">Aperçu de la facture (défilement horizontal)</p>
          <div className="overflow-x-auto rounded-xl xl:overflow-visible">
          <div className="bg-white text-black p-12 shadow-2xl min-h-[1056px] flex flex-col print:shadow-none print:p-0 w-[800px] xl:w-full">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
              <div>
                <h2 className="text-3xl font-serif font-bold text-slate-900">Caroline Gérard</h2>
                <p className="text-slate-500 font-medium">Auteure</p>
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><MapPin size={14} /> 501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0</p>
                  <p className="flex items-center gap-2"><Phone size={14} /> 819 993-0714</p>
                  <p className="flex items-center gap-2"><Mail size={14} /> caroline@carolinegerard.ca</p>
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
                  <span className="text-slate-500 font-bold uppercase">TPS 5% <span className="font-normal normal-case">(livres + livraison)</span></span>
                  <span className="font-bold text-slate-900">{totals.tps.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase">TVQ 9,975% <span className="font-normal normal-case">(livraison seul.)</span></span>
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
                    Pour un paiement par virement bancaire, utiliser l&apos;adresse <span className="font-bold text-slate-900">caroline@carolinegerard.ca</span> et le mot de passe: <span className="font-bold text-slate-900">livre</span>. Merci de ton achat!
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
    </div>
  );
};

export default AdminInvoices;
