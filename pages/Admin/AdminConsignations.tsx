import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Store, Edit3, Trash2, X, Check, PackagePlus, PackageMinus,
  BadgeDollarSign, HandCoins, History, Sparkles,
} from 'lucide-react';
import { Book, ConsignmentLocation, ConsignmentMovement, ConsignmentMovementType } from '../../types';
import {
  subscribeToConsignmentLocations, saveConsignmentLocation, deleteConsignmentLocation,
  subscribeToConsignmentMovements, saveConsignmentMovement, deleteConsignmentMovement,
} from '../../lib/firestore';

interface AdminConsignationsProps {
  books: Book[];
}

// Les trois points de dépôt de départ — créés d'un clic quand la liste est vide.
const STARTER_LOCATIONS: Omit<ConsignmentLocation, 'id' | 'createdAt'>[] = [
  { name: "Zélia Galerie d'art", commissionPct: 0 },
  { name: 'Librairie Magie-Lune', commissionPct: 0 },
  { name: 'Café Aux Cinq Soeurs', commissionPct: 0 },
];

const TYPE_META: Record<ConsignmentMovementType, { label: string; color: string; icon: React.ReactNode }> = {
  depot:    { label: 'Dépôt',         color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',       icon: <PackagePlus size={13} /> },
  vente:    { label: 'Vente',         color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: <BadgeDollarSign size={13} /> },
  retour:   { label: 'Retour',        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <PackageMinus size={13} /> },
  paiement: { label: 'Paiement reçu', color: 'text-gold bg-gold/10 border-gold/30',                icon: <HandCoins size={13} /> },
};

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-gold/50 transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const money = (n: number) => `${n.toFixed(2)} $`;
const today = () => new Date().toISOString().slice(0, 10);

type LocationStats = {
  deposited: number;
  sold: number;
  returned: number;
  onHand: number;
  gross: number;
  netOwed: number;   // ventes nettes de commission
  paid: number;      // paiements reçus
  balance: number;   // netOwed - paid
};

function computeStats(locId: string, movements: ConsignmentMovement[], fallbackPct: number): LocationStats {
  const s: LocationStats = { deposited: 0, sold: 0, returned: 0, onHand: 0, gross: 0, netOwed: 0, paid: 0, balance: 0 };
  movements.filter(m => m.locationId === locId).forEach(m => {
    const qty = m.qty ?? 0;
    if (m.type === 'depot') s.deposited += qty;
    if (m.type === 'retour') s.returned += qty;
    if (m.type === 'vente') {
      s.sold += qty;
      const gross = qty * (m.unitPrice ?? 0);
      const pct = m.commissionPct ?? fallbackPct;
      s.gross += gross;
      s.netOwed += gross * (1 - pct / 100);
    }
    if (m.type === 'paiement') s.paid += m.amount ?? 0;
  });
  s.onHand = s.deposited - s.sold - s.returned;
  s.balance = s.netOwed - s.paid;
  return s;
}

// ── Formulaire lieu (nouveau / modifier) ─────────────────────────────────────
const LocationModal = ({ location, onClose, onSave }: {
  location: Partial<ConsignmentLocation>;
  onClose: () => void;
  onSave: (loc: ConsignmentLocation) => Promise<void>;
}) => {
  const isNew = !location.id;
  const [form, setForm] = useState({
    name: location.name ?? '',
    commissionPct: location.commissionPct ?? 0,
    contactName: location.contactName ?? '',
    contactInfo: location.contactInfo ?? '',
    notes: location.notes ?? '',
  });
  const [saveError, setSaveError] = useState('');

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaveError('');
    try {
      await onSave({
        id: location.id ?? `loc-${Date.now()}`,
        createdAt: location.createdAt ?? new Date().toISOString(),
        name: form.name.trim(),
        commissionPct: form.commissionPct,
        contactName: form.contactName.trim(),
        contactInfo: form.contactInfo.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setSaveError('Erreur lors de la sauvegarde. Réessaie.');
      console.error('Save location error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-white font-bold">{isNew ? 'Nouveau dépositaire' : 'Modifier le dépositaire'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Nom du commerce *">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex : Librairie Magie-Lune" className={inputCls} />
          </Field>
          <Field label="Commission retenue (%)">
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="100" step="0.5" value={form.commissionPct}
                onChange={e => setForm(f => ({ ...f, commissionPct: parseFloat(e.target.value) || 0 }))}
                className={`${inputCls} max-w-[120px]`} />
              <span className="text-slate-500 text-sm">% gardé par le commerce sur chaque vente</span>
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Personne contact">
              <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Prénom, nom" className={inputCls} />
            </Field>
            <Field label="Téléphone / courriel">
              <input value={form.contactInfo} onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
                placeholder="ex : 819 555-0123" className={inputCls} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Entente, remarques..." className={`${inputCls} resize-none`} />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 px-6 py-4 flex flex-col gap-3">
          {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">Annuler</button>
            <button onClick={submit} disabled={!form.name.trim()}
              className="flex-[2] py-3 bg-gold text-midnight rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Formulaire mouvement ─────────────────────────────────────────────────────
const MovementModal = ({ location, books, onClose, onSave }: {
  location: ConsignmentLocation;
  books: Book[];
  onClose: () => void;
  onSave: (mov: ConsignmentMovement) => Promise<void>;
}) => {
  const sellableBooks = books.filter(b => !b.comingSoon);
  const defaultBook = sellableBooks[0];
  const [type, setType] = useState<ConsignmentMovementType>('depot');
  const [bookId, setBookId] = useState(defaultBook?.id ?? '');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(defaultBook?.price ?? 0);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState('');

  const book = sellableBooks.find(b => b.id === bookId);
  const isMoney = type === 'paiement';
  const isSale = type === 'vente';
  const netPreview = isSale ? qty * unitPrice * (1 - location.commissionPct / 100) : 0;

  const pickBook = (id: string) => {
    setBookId(id);
    const b = sellableBooks.find(x => x.id === id);
    if (b) setUnitPrice(b.price);
  };

  const submit = async () => {
    if (!isMoney && qty <= 0) return;
    if (isMoney && amount <= 0) return;
    setSaveError('');
    try {
      const mov: ConsignmentMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        locationId: location.id,
        type,
        date,
        createdAt: new Date().toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(isMoney
          ? { amount }
          : {
              qty,
              ...(book ? { bookId: book.id, bookTitle: book.title } : {}),
              ...(isSale ? { unitPrice, commissionPct: location.commissionPct } : {}),
            }),
      };
      await onSave(mov);
      onClose();
    } catch (err) {
      setSaveError('Erreur lors de la sauvegarde. Réessaie.');
      console.error('Save movement error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-serif text-lg text-white font-bold">Nouveau mouvement</h2>
            <p className="text-slate-500 text-xs mt-0.5">{location.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_META) as ConsignmentMovementType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    type === t ? TYPE_META[t].color : 'text-slate-400 bg-white/5 border-white/10 hover:bg-white/10'
                  }`}>
                  {TYPE_META[t].icon} {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </Field>

          {!isMoney && (
            <>
              {sellableBooks.length > 1 && (
                <Field label="Livre">
                  <select value={bookId} onChange={e => pickBook(e.target.value)} className={inputCls}>
                    {sellableBooks.map(b => (
                      <option key={b.id} value={b.id}>{b.title}{b.subtitle ? ` — ${b.subtitle}` : ''}</option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label={type === 'depot' ? 'Livres déposés' : type === 'vente' ? 'Livres vendus' : 'Livres repris'}>
                  <input type="number" min="1" value={qty}
                    onChange={e => setQty(parseInt(e.target.value) || 0)} className={inputCls} />
                </Field>
                {isSale && (
                  <Field label="Prix unitaire ($)">
                    <input type="number" min="0" step="0.01" value={unitPrice}
                      onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
                  </Field>
                )}
              </div>
              {isSale && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Montant brut</span><span>{money(qty * unitPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Commission ({location.commissionPct}%)</span><span>−{money(qty * unitPrice * location.commissionPct / 100)}</span></div>
                  <div className="flex justify-between font-bold text-gold border-t border-white/10 pt-1.5 mt-1.5"><span>Qui te revient</span><span>{money(netPreview)}</span></div>
                </div>
              )}
            </>
          )}

          {isMoney && (
            <Field label="Montant reçu ($)">
              <input type="number" min="0" step="0.01" value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)} className={inputCls} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Note">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optionnel" className={inputCls} />
            </Field>
          </div>
        </div>
        <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 px-6 py-4 flex flex-col gap-3">
          {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">Annuler</button>
            <button onClick={submit} disabled={isMoney ? amount <= 0 : qty <= 0}
              className="flex-[2] py-3 bg-gold text-midnight rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────────
const AdminConsignations = ({ books }: AdminConsignationsProps) => {
  const [locations, setLocations] = useState<ConsignmentLocation[]>([]);
  const [movements, setMovements] = useState<ConsignmentMovement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<ConsignmentLocation> | null>(null);
  const [movementFor, setMovementFor] = useState<ConsignmentLocation | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const u1 = subscribeToConsignmentLocations(ls => {
      setLocations(ls.sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setLoaded(true);
    });
    const u2 = subscribeToConsignmentMovements(ms =>
      setMovements(ms.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)))
    );
    return () => { u1(); u2(); };
  }, []);

  const statsByLoc = useMemo(() => {
    const map = new Map<string, LocationStats>();
    locations.forEach(l => map.set(l.id, computeStats(l.id, movements, l.commissionPct)));
    return map;
  }, [locations, movements]);

  const totals = useMemo(() => {
    let onHand = 0, sold = 0, balance = 0;
    statsByLoc.forEach(s => { onHand += s.onHand; sold += s.sold; balance += s.balance; });
    return { onHand, sold, balance };
  }, [statsByLoc]);

  const filteredMovements = historyFilter === 'all'
    ? movements
    : movements.filter(m => m.locationId === historyFilter);

  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? '—';

  const seedStarterLocations = async () => {
    setSeeding(true);
    try {
      await Promise.all(STARTER_LOCATIONS.map((l, i) =>
        saveConsignmentLocation({ ...l, id: `loc-${Date.now()}-${i}`, createdAt: new Date().toISOString() })
      ));
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteMovement = (id: string) => {
    deleteConsignmentMovement(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Dépositaires</h1>
          <p className="text-slate-400 mt-1 text-sm">Suis tes livres en consigne : dépôts, ventes, retours et paiements, commerce par commerce.</p>
        </div>
        <button onClick={() => setEditingLocation({})}
          className="bg-gold text-midnight px-5 py-2.5 rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2 text-sm shadow-lg shadow-gold/20">
          <Plus size={16} /> Ajouter un dépositaire
        </button>
      </div>

      {/* Vue d'ensemble */}
      {locations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Livres en consigne', value: String(totals.onHand) },
            { label: 'Livres vendus', value: String(totals.sold) },
            { label: 'Solde à recevoir', value: money(totals.balance) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-serif font-bold text-gold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* État vide : proposer les trois points de départ */}
      {loaded && locations.length === 0 && (
        <div className="bg-midnight/60 backdrop-blur-md border border-gold/20 rounded-2xl p-10 text-center space-y-4">
          <div className="inline-flex bg-gold/15 p-3 rounded-2xl text-gold"><Store size={28} /></div>
          <p className="text-white font-bold">Aucun dépositaire pour l'instant.</p>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Tes livres sont en consigne à trois endroits. Crée-les d'un clic, puis inscris la commission de chacun.
          </p>
          <button onClick={seedStarterLocations} disabled={seeding}
            className="inline-flex items-center gap-2 bg-gold text-midnight px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-50">
            <Sparkles size={16} /> {seeding ? 'Création...' : 'Créer Zélia, Magie-Lune et Aux Cinq Soeurs'}
          </button>
        </div>
      )}

      {/* Cartes des lieux */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {locations.map(loc => {
          const s = statsByLoc.get(loc.id)!;
          return (
            <div key={loc.id} className="bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 hover:border-gold/30 transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-white text-lg leading-tight">{loc.name}</h3>
                  <p className="text-gold text-xs font-bold mt-1">Commission : {loc.commissionPct}%</p>
                  {loc.contactName && <p className="text-slate-500 text-xs mt-1">{loc.contactName}{loc.contactInfo ? ` · ${loc.contactInfo}` : ''}</p>}
                </div>
                <button onClick={() => setEditingLocation(loc)}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0" title="Modifier (nom, commission, contact)">
                  <Edit3 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-3 border-y border-white/5 divide-x divide-white/5 text-center">
                {[
                  { label: 'En consigne', value: String(s.onHand) },
                  { label: 'Vendus', value: String(s.sold) },
                  { label: 'À recevoir', value: money(s.balance) },
                ].map(({ label, value }) => (
                  <div key={label} className="py-3 px-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-white font-bold text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 text-xs text-slate-500 space-y-0.5">
                <div className="flex justify-between"><span>Déposés au total</span><span className="text-slate-300">{s.deposited}</span></div>
                <div className="flex justify-between"><span>Ventes nettes de commission</span><span className="text-slate-300">{money(s.netOwed)}</span></div>
                <div className="flex justify-between"><span>Paiements reçus</span><span className="text-slate-300">{money(s.paid)}</span></div>
              </div>

              <div className="mt-auto p-4 pt-1">
                <button onClick={() => setMovementFor(loc)}
                  className="w-full py-2.5 bg-gold/10 border border-gold/30 text-gold rounded-xl font-bold text-sm hover:bg-gold hover:text-midnight transition-colors flex items-center justify-center gap-2">
                  <Plus size={15} /> Ajouter un mouvement
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historique */}
      {movements.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <History size={18} className="text-gold" /> Historique
            </h2>
            <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold/50">
              <option value="all">Tous les dépositaires</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="bg-midnight/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/10">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Dépositaire</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Quantité</th>
                    <th className="px-5 py-3 text-right">Montant</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMovements.map(m => {
                    const meta = TYPE_META[m.type];
                    const net = m.type === 'vente'
                      ? (m.qty ?? 0) * (m.unitPrice ?? 0) * (1 - (m.commissionPct ?? 0) / 100)
                      : null;
                    return (
                      <tr key={m.id} className="text-slate-300 hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">{new Date(m.date + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-5 py-3">{locName(m.locationId)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                          {m.note && <span className="block text-slate-600 text-xs mt-1">{m.note}</span>}
                        </td>
                        <td className="px-5 py-3 text-right">{m.qty ?? '—'}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {m.type === 'paiement' && <span className="text-gold font-bold">{money(m.amount ?? 0)}</span>}
                          {m.type === 'vente' && (
                            <span>
                              <span className="text-white font-bold">{money(net ?? 0)}</span>
                              <span className="block text-slate-600 text-xs">brut {money((m.qty ?? 0) * (m.unitPrice ?? 0))} · comm. {m.commissionPct ?? 0}%</span>
                            </span>
                          )}
                          {(m.type === 'depot' || m.type === 'retour') && '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {deleteConfirm === m.id ? (
                            <span className="inline-flex gap-1">
                              <button onClick={() => handleDeleteMovement(m.id)} className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"><Check size={13} /></button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"><X size={13} /></button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteConfirm(m.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Supprimer (erreur de saisie)">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingLocation && (
        <LocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={saveConsignmentLocation}
        />
      )}
      {movementFor && (
        <MovementModal
          location={movementFor}
          books={books}
          onClose={() => setMovementFor(null)}
          onSave={saveConsignmentMovement}
        />
      )}
    </div>
  );
};

export default AdminConsignations;
