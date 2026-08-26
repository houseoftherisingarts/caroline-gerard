import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Edit3, Trash2, Check, PackagePlus, BadgeDollarSign, SlidersHorizontal,
  Store, Tent, PiggyBank, Wallet, CreditCard, Landmark, Globe, CircleDot, History,
} from 'lucide-react';
import {
  Book, ConsignmentLocation, ConsignmentMovement, StockMovement, StockMovementType, PaymentMethod,
} from '../../types';
import {
  subscribeToConsignmentLocations, subscribeToConsignmentMovements,
  subscribeToStockMovements, saveStockMovement, deleteStockMovement,
} from '../../lib/firestore';

interface AdminVentesProps { books: Book[]; }

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-gold/50 transition-colors";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);
const money = (n: number) => `${n.toFixed(2)} $`;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });

const TYPE_META: Record<StockMovementType, { label: string; hint: string; color: string; icon: React.ReactNode }> = {
  vente:      { label: 'Vente',            hint: 'Événement, en main propre, site web', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: <BadgeDollarSign size={13} /> },
  entree:     { label: 'Livres reçus',     hint: 'Inventaire de départ, commande reçue', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',       icon: <PackagePlus size={13} /> },
  ajustement: { label: 'Correction',       hint: 'Recomptage, perte, don (+ ou −)',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <SlidersHorizontal size={13} /> },
};

const PAYMENTS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'comptant', label: 'Comptant', icon: <Wallet size={13} /> },
  { id: 'square',   label: 'Square',   icon: <CreditCard size={13} /> },
  { id: 'virement', label: 'Virement', icon: <Landmark size={13} /> },
  { id: 'web',      label: 'Site web', icon: <Globe size={13} /> },
  { id: 'autre',    label: 'Autre',    icon: <CircleDot size={13} /> },
];
const payLabel = (p?: PaymentMethod) => PAYMENTS.find(x => x.id === p)?.label ?? '—';

// ── Formulaire ───────────────────────────────────────────────────────────────
const StockModal = ({ books, existing, eventNames, onClose, onSave }: {
  books: Book[];
  existing?: StockMovement;
  eventNames: string[];
  onClose: () => void;
  onSave: (m: StockMovement) => Promise<void>;
}) => {
  const sellable = books.filter(b => !b.comingSoon);
  const first = sellable.find(b => b.id === existing?.bookId) ?? sellable[0];
  const [type, setType] = useState<StockMovementType>(existing?.type ?? 'vente');
  const [bookId, setBookId] = useState(first?.id ?? '');
  const [qty, setQty] = useState(existing?.qty ?? 1);
  const [unitPrice, setUnitPrice] = useState(existing?.unitPrice ?? first?.price ?? 0);
  const [payment, setPayment] = useState<PaymentMethod>(existing?.payment ?? 'comptant');
  const [tip, setTip] = useState(existing?.tip ?? 0);
  const [eventName, setEventName] = useState(existing?.eventName ?? '');
  const [eventCost, setEventCost] = useState(existing?.eventCost ?? 0);
  const [date, setDate] = useState(existing?.date ?? today());
  const [note, setNote] = useState(existing?.note ?? '');
  const [err, setErr] = useState('');
  const book = sellable.find(b => b.id === bookId);
  const isSale = type === 'vente';

  const pickBook = (id: string) => {
    setBookId(id);
    const b = sellable.find(x => x.id === id);
    if (b && !existing) setUnitPrice(b.price);
  };

  const submit = async () => {
    if (!book || qty === 0) return;
    setErr('');
    try {
      await onSave({
        id: existing?.id ?? `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type, bookId: book.id, bookTitle: book.title, qty, date,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(isSale ? {
          unitPrice, payment,
          ...(tip > 0 ? { tip } : {}),
          ...(eventName.trim() ? { eventName: eventName.trim() } : {}),
          ...(eventCost > 0 ? { eventCost } : {}),
        } : {}),
      });
      onClose();
    } catch (e) {
      setErr('Erreur lors de la sauvegarde. Réessaie.');
      console.error('Save stock movement error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-white font-bold">{existing ? 'Modifier' : 'Nouvelle entrée'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Type">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as StockMovementType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} title={TYPE_META[t].hint}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${type === t ? TYPE_META[t].color : 'text-slate-400 bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  {TYPE_META[t].icon} {TYPE_META[t].label}
                </button>
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-1.5">{TYPE_META[type].hint}</p>
          </Field>
          {sellable.length > 1 && (
            <Field label="Livre">
              <select value={bookId} onChange={e => pickBook(e.target.value)} className={inputCls}>
                {sellable.map(b => <option key={b.id} value={b.id}>{b.title}{b.subtitle ? ` — ${b.subtitle}` : ''}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label={isSale ? 'Livres vendus' : type === 'entree' ? 'Livres reçus' : 'Correction (+ / −)'}>
              <input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
            {isSale && (
              <Field label="Prix unitaire ($)">
                <input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
              </Field>
            )}
          </div>
          {isSale && (
            <>
              <Field label="Paiement">
                <div className="grid grid-cols-5 gap-1.5">
                  {PAYMENTS.map(p => (
                    <button key={p.id} type="button" onClick={() => setPayment(p.id)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-bold transition-all ${payment === p.id ? 'text-gold bg-gold/10 border-gold/40' : 'text-slate-400 bg-white/5 border-white/10 hover:bg-white/10'}`}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Événement / marché">
                  <input list="event-names" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="ex : Marché Capibusca" className={inputCls} />
                  <datalist id="event-names">{eventNames.map(n => <option key={n} value={n} />)}</datalist>
                </Field>
                <Field label="Coût du kiosque ($)">
                  <input type="number" min="0" step="0.01" value={eventCost} onChange={e => setEventCost(parseFloat(e.target.value) || 0)} className={inputCls} />
                </Field>
              </div>
              <Field label="Sous en plus pour William ($)">
                <input type="number" min="0" step="0.01" value={tip} onChange={e => setTip(parseFloat(e.target.value) || 0)} className={inputCls} />
              </Field>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Ventes</span><span>{money(qty * unitPrice)}</span></div>
                {tip > 0 && <div className="flex justify-between"><span className="text-slate-500">Petit cochon de William</span><span>{money(tip)}</span></div>}
                <div className="flex justify-between font-bold text-gold border-t border-white/10 pt-1.5 mt-1.5"><span>Encaissé</span><span>{money(qty * unitPrice + tip)}</span></div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Note"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Optionnel" className={inputCls} /></Field>
          </div>
        </div>
        <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 px-6 py-4 flex flex-col gap-3">
          {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">Annuler</button>
            <button onClick={submit} disabled={!book || qty === 0}
              className="flex-[2] py-3 bg-gold text-midnight rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Une ligne de vente, peu importe le canal ─────────────────────────────────
type SaleRow = {
  id: string; date: string; where: string; channel: 'direct' | 'depositaire';
  bookTitle: string; qty: number; gross: number; net: number; payment: string; tip: number; eventCost: number;
  stock?: StockMovement;
};

// ── Page ─────────────────────────────────────────────────────────────────────
const AdminVentes = ({ books }: AdminVentesProps) => {
  const [stock, setStock] = useState<StockMovement[]>([]);
  const [cons, setCons] = useState<ConsignmentMovement[]>([]);
  const [locations, setLocations] = useState<ConsignmentLocation[]>([]);
  const [modal, setModal] = useState<{ existing?: StockMovement } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    const u1 = subscribeToStockMovements(setStock);
    const u2 = subscribeToConsignmentMovements(setCons);
    const u3 = subscribeToConsignmentLocations(setLocations);
    return () => { u1(); u2(); u3(); };
  }, []);

  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? 'Dépositaire';
  const sellable = books.filter(b => !b.comingSoon);

  // Stock chez Caroline, livre par livre : reçus + corrections − ventes directes − dépôts + retours.
  const stockByBook = useMemo(() => sellable.map(b => {
    let home = 0, consigned = 0, soldDirect = 0, soldCons = 0;
    stock.filter(m => m.bookId === b.id).forEach(m => {
      if (m.type === 'entree' || m.type === 'ajustement') home += m.qty;
      if (m.type === 'vente') { home -= m.qty; soldDirect += m.qty; }
    });
    cons.filter(m => m.bookId === b.id).forEach(m => {
      const q = m.qty ?? 0;
      if (m.type === 'depot') { home -= q; consigned += q; }
      if (m.type === 'retour') { home += q; consigned -= q; }
      if (m.type === 'vente') { consigned -= q; soldCons += q; }
    });
    return { book: b, home, consigned, soldDirect, soldCons };
  }), [sellable, stock, cons]);

  const years = useMemo(() => {
    const ys = new Set<string>([String(new Date().getFullYear())]);
    [...stock, ...cons].forEach(m => ys.add(m.date.slice(0, 4)));
    return [...ys].sort().reverse();
  }, [stock, cons]);

  const eventNames = useMemo(() => [...new Set(stock.map(m => m.eventName).filter(Boolean) as string[])].sort(), [stock]);

  const rows: SaleRow[] = useMemo(() => {
    const direct: SaleRow[] = stock.filter(m => m.type === 'vente' && m.date.startsWith(year)).map(m => ({
      id: m.id, date: m.date, where: m.eventName || (m.payment === 'web' ? 'Site web' : 'Vente directe'), channel: 'direct',
      bookTitle: m.bookTitle, qty: m.qty, gross: m.qty * (m.unitPrice ?? 0), net: m.qty * (m.unitPrice ?? 0),
      payment: payLabel(m.payment), tip: m.tip ?? 0, eventCost: m.eventCost ?? 0, stock: m,
    }));
    const dep: SaleRow[] = cons.filter(m => m.type === 'vente' && m.date.startsWith(year)).map(m => {
      const gross = (m.qty ?? 0) * (m.unitPrice ?? 0);
      return {
        id: m.id, date: m.date, where: locName(m.locationId) + (m.note ? ` · ${m.note}` : ''), channel: 'depositaire',
        bookTitle: m.bookTitle ?? 'Livre', qty: m.qty ?? 0, gross, net: gross * (1 - (m.commissionPct ?? 0) / 100),
        payment: `Dépositaire (${m.commissionPct ?? 0} %)`, tip: 0, eventCost: 0,
      };
    });
    return [...direct, ...dep].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [stock, cons, locations, year]);

  const totals = useMemo(() => {
    const t = { qty: 0, net: 0, comptant: 0, square: 0, tips: 0, costs: 0 };
    rows.forEach(r => {
      t.qty += r.qty; t.net += r.net; t.tips += r.tip; t.costs += r.eventCost;
      if (r.stock?.payment === 'comptant') t.comptant += r.gross;
      if (r.stock?.payment === 'square') t.square += r.gross;
    });
    return t;
  }, [rows]);

  const byEvent = useMemo(() => {
    const map = new Map<string, { qty: number; gross: number; tips: number; cost: number; dates: Set<string> }>();
    rows.filter(r => r.channel === 'direct' && r.stock?.eventName).forEach(r => {
      const cur = map.get(r.where) ?? { qty: 0, gross: 0, tips: 0, cost: 0, dates: new Set<string>() };
      cur.qty += r.qty; cur.gross += r.gross; cur.tips += r.tip; cur.cost += r.eventCost; cur.dates.add(r.date);
      map.set(r.where, cur);
    });
    return [...map.entries()].sort((a, b) => [...b[1].dates].sort().reverse()[0].localeCompare([...a[1].dates].sort().reverse()[0]));
  }, [rows]);

  const historyRows = useMemo(() => stock.filter(m => m.type !== 'vente').sort((a, b) => b.date.localeCompare(a.date)), [stock]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Ventes & stock</h1>
          <p className="text-slate-400 mt-1 text-sm">Tes livres en main, et toutes tes ventes au même endroit : événements, en personne, site web et dépositaires.</p>
        </div>
        <button onClick={() => setModal({})}
          className="bg-gold text-midnight px-5 py-2.5 rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2 text-sm shadow-lg shadow-gold/20">
          <Plus size={16} /> Inscrire une vente ou des livres reçus
        </button>
      </div>

      {/* Stock par livre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stockByBook.map(({ book, home, consigned, soldDirect, soldCons }) => (
          <div key={book.id} className="bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <img src={book.image} alt="" className="w-12 h-16 object-cover rounded-lg border border-white/10" />
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-white text-lg leading-tight truncate">{book.title}</h3>
                {book.subtitle && <p className="text-slate-500 text-xs mt-0.5 truncate">{book.subtitle}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-white/5 divide-x divide-white/5 text-center">
              {[
                { label: 'Chez toi', value: home, icon: <Tent size={12} /> },
                { label: 'En consigne', value: consigned, icon: <Store size={12} /> },
                { label: 'Vendus (total)', value: soldDirect + soldCons, icon: <BadgeDollarSign size={12} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="py-3 px-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">{icon} {label}</p>
                  <p className={`font-bold text-lg mt-0.5 ${value < 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
            {home < 0 && <p className="px-5 py-2 text-xs text-red-400 border-t border-white/5">Stock négatif : inscris tes livres reçus (inventaire de départ) pour que le compte tienne.</p>}
          </div>
        ))}
      </div>

      {/* Année + totaux */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-serif font-bold text-white">Toutes tes ventes</h2>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold/50">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Livres vendus', value: String(totals.qty) },
            { label: 'Revenu net (tous canaux)', value: money(totals.net) },
            { label: 'Comptant · Square', value: `${money(totals.comptant)} · ${money(totals.square)}` },
            { label: 'Petit cochon de William', value: money(totals.tips) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
              <p className="text-xl font-serif font-bold text-gold mt-1 whitespace-nowrap">{value}</p>
            </div>
          ))}
        </div>
        {totals.costs > 0 && <p className="text-xs text-slate-500">Kiosques payés cette année : {money(totals.costs)} · net après kiosques : <span className="text-slate-300">{money(totals.net - totals.costs)}</span></p>}
      </div>

      {/* Par événement */}
      {byEvent.length > 0 && (
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 text-white font-serif font-bold"><Tent size={16} className="text-gold" /> Par événement</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/10">
                <th className="px-5 py-3">Événement</th><th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3 text-right">Livres</th><th className="px-5 py-3 text-right">Ventes</th>
                <th className="px-5 py-3 text-right">William</th><th className="px-5 py-3 text-right">Kiosque</th><th className="px-5 py-3 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {byEvent.map(([name, e]) => (
                  <tr key={name} className="text-slate-300">
                    <td className="px-5 py-3 text-white font-bold">{name}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{[...e.dates].sort().map(fmtDate).join(', ')}</td>
                    <td className="px-5 py-3 text-right">{e.qty}</td>
                    <td className="px-5 py-3 text-right">{money(e.gross)}</td>
                    <td className="px-5 py-3 text-right">{e.tips > 0 ? money(e.tips) : '—'}</td>
                    <td className="px-5 py-3 text-right">{e.cost > 0 ? `−${money(e.cost)}` : '—'}</td>
                    <td className="px-5 py-3 text-right text-gold font-bold">{money(e.gross - e.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Détail des ventes */}
      <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 text-white font-serif font-bold"><History size={16} className="text-gold" /> Détail des ventes {year}</div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500 text-sm">Aucune vente inscrite pour {year}. Commence par tes livres reçus, puis inscris chaque vente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/10">
                <th className="px-5 py-3">Date</th><th className="px-5 py-3">Où</th><th className="px-5 py-3">Livre</th>
                <th className="px-5 py-3 text-right">Qté</th><th className="px-5 py-3">Paiement</th><th className="px-5 py-3 text-right">Net</th><th className="px-5 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(r => (
                  <tr key={r.id} onClick={() => r.stock && setModal({ existing: r.stock })}
                    className={`text-slate-300 hover:bg-white/[0.03] transition-colors ${r.stock ? 'cursor-pointer' : ''}`}
                    title={r.stock ? 'Cliquer pour modifier' : 'Vente saisie dans Dépositaires'}>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5">{r.channel === 'direct' ? <Tent size={12} className="text-gold" /> : <Store size={12} className="text-sky-400" />} {r.where}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{r.bookTitle}</td>
                    <td className="px-5 py-3 text-right">{r.qty}</td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{r.payment}{r.tip > 0 && <span className="text-gold text-xs ml-1.5 inline-flex items-center gap-0.5"><PiggyBank size={11} /> +{money(r.tip)}</span>}</td>
                    <td className="px-5 py-3 text-right text-white font-bold whitespace-nowrap">{money(r.net)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {r.stock && (deleteConfirm === r.id ? (
                        <span className="inline-flex gap-1">
                          <button onClick={() => { deleteStockMovement(r.id); setDeleteConfirm(null); }} className="p-1.5 bg-red-500/20 rounded-lg text-red-400"><Check size={13} /></button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X size={13} /></button>
                        </span>
                      ) : (
                        <>
                          <button onClick={() => setModal({ existing: r.stock })} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors" title="Modifier"><Edit3 size={13} /></button>
                          <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
                        </>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Livres reçus et corrections */}
      {historyRows.length > 0 && (
        <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2 text-white font-serif font-bold"><PackagePlus size={16} className="text-sky-400" /> Livres reçus et corrections</div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/5">
              {historyRows.map(m => (
                <tr key={m.id} onClick={() => setModal({ existing: m })} className="text-slate-300 hover:bg-white/[0.03] cursor-pointer transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">{fmtDate(m.date)}</td>
                  <td className="px-5 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${TYPE_META[m.type].color}`}>{TYPE_META[m.type].icon} {TYPE_META[m.type].label}</span>{m.note && <span className="block text-slate-600 text-xs mt-1">{m.note}</span>}</td>
                  <td className="px-5 py-3 text-slate-400">{m.bookTitle}</td>
                  <td className="px-5 py-3 text-right font-bold text-white">{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                  <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {deleteConfirm === m.id ? (
                      <span className="inline-flex gap-1">
                        <button onClick={() => { deleteStockMovement(m.id); setDeleteConfirm(null); }} className="p-1.5 bg-red-500/20 rounded-lg text-red-400"><Check size={13} /></button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X size={13} /></button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <StockModal books={books} existing={modal.existing} eventNames={eventNames}
          onClose={() => setModal(null)} onSave={saveStockMovement} />
      )}
    </div>
  );
};

export default AdminVentes;
