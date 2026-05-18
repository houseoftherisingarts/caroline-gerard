import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Check, X, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { PromoCode } from '../../types';
import { subscribeToPromoCodes, savePromoCode, deletePromoCode } from '../../lib/firestore';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-gold/50 transition-colors text-sm";

const EMPTY: Omit<PromoCode, 'id' | 'usedCount' | 'createdAt'> = {
  code: '',
  percentage: 10,
  expiresAt: '',
  maxUses: 0,
  isActive: true,
};

const AdminPromoCodes = () => {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToPromoCodes(list =>
      setCodes(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    );
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
             : name === 'percentage' || name === 'maxUses' ? parseInt(value) || 0
             : name === 'code' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '')
             : value,
    }));
  };

  const handleCreate = () => {
    if (!form.code || form.percentage < 1 || form.percentage > 100) return;
    const id = form.code.toUpperCase();
    const code: PromoCode = {
      id,
      code: id,
      percentage: form.percentage,
      expiresAt: form.expiresAt,
      maxUses: form.maxUses,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    savePromoCode(code);
    setForm(EMPTY);
    setShowForm(false);
  };

  const toggleActive = (c: PromoCode) => {
    savePromoCode({ ...c, isActive: !c.isActive });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const isExpired = (c: PromoCode) =>
    c.expiresAt ? new Date(c.expiresAt) < new Date() : false;

  const isExhausted = (c: PromoCode) =>
    c.maxUses > 0 && c.usedCount >= c.maxUses;

  const statusLabel = (c: PromoCode) => {
    if (!c.isActive) return { text: 'Désactivé', cls: 'bg-slate-500/10 text-slate-400' };
    if (isExpired(c)) return { text: 'Expiré', cls: 'bg-red-500/10 text-red-400' };
    if (isExhausted(c)) return { text: 'Épuisé', cls: 'bg-orange-500/10 text-orange-400' };
    return { text: 'Actif', cls: 'bg-green-500/10 text-green-400' };
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Codes Promo</h1>
          <p className="text-slate-400 mt-1 text-sm">Crée et gère tes codes de réduction.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-gold text-midnight px-5 py-2.5 rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2 text-sm shadow-lg shadow-gold/20"
        >
          <Plus size={16} /> Nouveau code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-midnight/60 backdrop-blur-md rounded-2xl border border-gold/30 p-6 space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2"><Tag size={16} className="text-gold" /> Nouveau code promo</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Code *</label>
              <input name="code" value={form.code} onChange={handleChange}
                placeholder="EX: BIENVENUE20" className={inputCls} maxLength={20} />
              <p className="text-xs text-slate-600 mt-1">Lettres et chiffres uniquement — majuscules automatiques</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Réduction (%) *</label>
              <input name="percentage" type="number" min="1" max="100" value={form.percentage} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date d'expiration</label>
              <input name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} className={inputCls} />
              <p className="text-xs text-slate-600 mt-1">Laisser vide = jamais</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre d'utilisations max</label>
              <input name="maxUses" type="number" min="0" value={form.maxUses} onChange={handleChange} className={inputCls} />
              <p className="text-xs text-slate-600 mt-1">0 = illimité</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-white/5 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">Annuler</button>
            <button
              onClick={handleCreate}
              disabled={!form.code || form.percentage < 1 || form.percentage > 100}
              className="flex-[2] py-2.5 bg-gold text-midnight rounded-xl font-bold hover:bg-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Créer le code
            </button>
          </div>
        </div>
      )}

      {/* Codes list */}
      {codes.length === 0 && !showForm && (
        <p className="text-center text-slate-500 italic py-16">Aucun code promo créé.</p>
      )}

      <div className="space-y-3">
        {codes.map(c => {
          const { text, cls } = statusLabel(c);
          return (
            <div key={c.id} className={`bg-midnight/60 backdrop-blur-md rounded-2xl border border-white/10 p-5 transition-all ${!c.isActive || isExpired(c) || isExhausted(c) ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start gap-3">
                {/* Code + copy */}
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xl text-gold tracking-widest">{c.code}</span>
                  <button onClick={() => copyCode(c.code)} className="p-1.5 text-slate-500 hover:text-gold transition-colors">
                    {copied === c.code ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{text}</span>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(c)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title={c.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {c.isActive ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                  </button>
                  {deleteConfirm === c.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => { deletePromoCode(c.id); setDeleteConfirm(null); }}
                        className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"><Check size={14} /></button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                <span><span className="text-slate-300 font-semibold">{c.percentage}%</span> de réduction</span>
                <span>
                  Utilisations : <span className="text-slate-300 font-semibold">{c.usedCount}</span>
                  {c.maxUses > 0 && <> / {c.maxUses}</>}
                  {c.maxUses === 0 && ' (illimitées)'}
                </span>
                {c.expiresAt && (
                  <span>Expire le : <span className={`font-semibold ${isExpired(c) ? 'text-red-400' : 'text-slate-300'}`}>
                    {new Date(c.expiresAt).toLocaleDateString('fr-CA')}
                  </span></span>
                )}
                <span>Créé le : {new Date(c.createdAt).toLocaleDateString('fr-CA')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPromoCodes;
