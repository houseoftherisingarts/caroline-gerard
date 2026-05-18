import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, MessageSquareQuote, BookOpen, User } from 'lucide-react';
import { subscribeToTestimonials, saveTestimonial, deleteTestimonial, toggleTestimonialPublished } from '../../lib/firestore';
import { Testimonial } from '../../types';

type PageFilter = 'all' | 'boutique' | 'apropos';

const AdminTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<PageFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // New testimonial form state
  const [newQuote, setNewQuote] = useState('');
  const [newSignature, setNewSignature] = useState('');
  const [newPage, setNewPage] = useState<'boutique' | 'apropos'>('boutique');
  const [newPublished, setNewPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeToTestimonials(all => {
      setTestimonials(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });
  }, []);

  const filtered = filter === 'all' ? testimonials : testimonials.filter(t => t.page === filter);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.trim() || !newSignature.trim()) return;
    setSaving(true);
    try {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await saveTestimonial({
        id,
        quote: newQuote.trim(),
        signature: newSignature.trim(),
        page: newPage,
        type: 'admin',
        isPublished: newPublished,
        createdAt: new Date().toISOString(),
      });
      setNewQuote('');
      setNewSignature('');
      setNewPage('boutique');
      setNewPublished(true);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTestimonial(id);
    setConfirmDelete(null);
  };

  const handleToggle = async (t: Testimonial) => {
    await toggleTestimonialPublished(t.id, !t.isPublished);
  };

  return (
    <div className="max-w-4xl animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">Témoignages</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Gérez les citations «&nbsp;Ce que les gens en disent&nbsp;» de la boutique et de la page À propos.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors text-sm"
        >
          <Plus size={16} /> Ajouter une citation
        </button>
      </div>

      {/* New testimonial form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-midnight/60 border border-gold/20 rounded-2xl p-6 mb-8 space-y-4"
        >
          <h2 className="text-white font-bold text-base mb-2">Nouvelle citation</h2>
          <textarea
            value={newQuote}
            onChange={e => setNewQuote(e.target.value)}
            placeholder="Texte de la citation..."
            rows={4}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors resize-none text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={newSignature}
              onChange={e => setNewSignature(e.target.value)}
              placeholder="Signature (ex : Marie L., Montréal)"
              required
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors text-sm"
            />
            <select
              value={newPage}
              onChange={e => setNewPage(e.target.value as 'boutique' | 'apropos')}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/40 transition-colors text-sm"
            >
              <option value="boutique">Boutique</option>
              <option value="apropos">À Propos</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNewPublished(v => !v)}
              className={`relative w-10 h-5.5 rounded-full transition-colors focus:outline-none ${newPublished ? 'bg-green-500/70' : 'bg-red-500/70'}`}
              style={{ height: '22px', width: '40px' }}
              aria-pressed={newPublished}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newPublished ? 'translate-x-[18px]' : 'translate-x-0'}`} />
            </button>
            <span className="text-slate-300 text-sm">{newPublished ? 'Publier immédiatement' : 'Garder masqué'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'boutique', 'apropos'] as PageFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === f ? 'bg-gold text-midnight' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            {f === 'all' ? 'Tous' : f === 'boutique' ? 'Boutique' : 'À Propos'}
            <span className="ml-2 text-xs opacity-70">
              ({testimonials.filter(t => f === 'all' || t.page === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <MessageSquareQuote className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-serif text-lg">Aucun témoignage pour l'instant.</p>
          <p className="text-sm mt-1">Ajoutez une citation ou attendez que des lecteurs en soumettent.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className={`bg-midnight/60 border rounded-2xl px-6 py-5 transition-colors ${t.isPublished ? 'border-white/10' : 'border-red-500/20'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${t.isPublished ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {t.isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
                      {t.isPublished ? 'Publié' : 'Masqué'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${t.page === 'boutique' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {t.page === 'boutique' ? <BookOpen size={11} /> : <User size={11} />}
                      {t.page === 'boutique' ? 'Boutique' : 'À Propos'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${t.type === 'client' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {t.type === 'client' ? '👤 Lecteur' : '✍️ Admin'}
                    </span>
                  </div>

                  {/* Quote */}
                  <p className="text-slate-200 text-sm leading-relaxed italic mb-3">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Signature + email */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-gold text-sm font-semibold">— {t.signature}</span>
                    {t.email && (
                      <span className="text-slate-500 text-xs">{t.email}</span>
                    )}
                    <span className="text-slate-600 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(t)}
                    title={t.isPublished ? 'Masquer' : 'Publier'}
                    className={`p-2 rounded-xl transition-colors ${t.isPublished ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400'}`}
                  >
                    {t.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  {confirmDelete === t.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs transition-colors"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      className="p-2 rounded-xl bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTestimonials;
