import React, { useState, useEffect } from 'react';
import { MessageSquareQuote, Send, CheckCircle, Star } from 'lucide-react';
import { subscribeToTestimonials, saveTestimonial } from '../lib/firestore';
import { Testimonial } from '../types';
import EditableText from './EditableText';

interface Props {
  page: 'boutique' | 'apropos';
}

const TestimonialsSection: React.FC<Props> = ({ page }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [formQuote, setFormQuote] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    return subscribeToTestimonials(all => {
      setTestimonials(
        all
          .filter(t => t.page === page && t.isPublished)
          .sort((a, b) => {
            const ao = a.order, bo = b.order;
            if (ao != null && bo != null) return ao - bo;
            if (ao != null) return -1;
            if (bo != null) return 1;
            return b.createdAt.localeCompare(a.createdAt);
          })
      );
    });
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuote.trim() || !formName.trim()) return;
    setFormStatus('loading');
    try {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload: Testimonial = {
        id,
        quote: formQuote.trim(),
        signature: formName.trim(),
        page,
        type: 'client',
        isPublished: false, // pending admin review
        createdAt: new Date().toISOString(),
      };
      if (formEmail.trim()) payload.email = formEmail.trim();
      await saveTestimonial(payload);
      setFormStatus('success');
      setFormQuote('');
      setFormName('');
      setFormEmail('');
    } catch {
      setFormStatus('error');
    }
  };

  const sectionTitle =
    page === 'boutique'
      ? 'Ce que les gens en disent'
      : 'Ce que les gens en disent';

  const sectionKey =
    page === 'boutique' ? 'testimonials_boutique_title' : 'testimonials_apropos_title';

  return (
    <section className="w-full py-16 px-5 md:px-16 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-gold fill-current" />
            ))}
          </div>
          <EditableText
            tag="h2"
            contentKey={sectionKey}
            defaultValue={sectionTitle}
            className="font-serif text-3xl md:text-4xl text-white"
          />
          <EditableText
            tag="p"
            contentKey={`${sectionKey}_sub`}
            defaultValue="Des lecteurs qui ont vécu la magie du livre."
            className="text-slate-400 mt-3 text-base max-w-xl"
          />
        </div>

        {/* Testimonial cards */}
        {testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
            {testimonials.map(t => (
              <blockquote
                key={t.id}
                className="bg-midnight/60 backdrop-blur-md border border-gold/15 rounded-2xl px-7 py-8 shadow-lg relative group hover:border-gold/30 transition-colors"
              >
                <MessageSquareQuote className="w-7 h-7 text-gold/30 absolute top-6 right-6 group-hover:text-gold/50 transition-colors" />
                <p className="text-slate-200 text-base leading-relaxed italic mb-6 pr-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                    {t.signature.charAt(0).toUpperCase()}
                  </div>
                  <cite className="not-italic text-gold font-semibold text-sm tracking-wide">
                    — {t.signature}
                  </cite>
                </footer>
              </blockquote>
            ))}
          </div>
        )}

        {/* Client review form */}
        <div className="bg-midnight/40 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-10 max-w-2xl mx-auto">
          <h3 className="font-serif text-xl text-white mb-1 text-center">
            <EditableText
              tag="span"
              contentKey={`${sectionKey}_form_title`}
              defaultValue="Partage ton expérience"
            />
          </h3>
          <EditableText
            tag="p"
            contentKey={`${sectionKey}_form_sub`}
            defaultValue="Ton témoignage sera examiné avant publication."
            className="text-slate-500 text-xs text-center mb-8"
          />

          {formStatus === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-white font-bold">Merci pour ton témoignage !</p>
              <p className="text-slate-400 text-sm">Il sera publié après validation.</p>
              <button
                onClick={() => setFormStatus('idle')}
                className="text-gold text-sm underline underline-offset-4 mt-2"
              >
                Ajouter un autre témoignage
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={formQuote}
                onChange={e => setFormQuote(e.target.value)}
                placeholder="Partage ton expérience avec le livre..."
                rows={4}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors resize-none text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ton prénom et nom"
                  required
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors text-sm"
                />
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="Courriel (optionnel, non publié)"
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors text-sm"
                />
              </div>
              {formStatus === 'error' && (
                <p className="text-red-400 text-sm">Une erreur est survenue. Réessaie dans un moment.</p>
              )}
              <button
                type="submit"
                disabled={formStatus === 'loading' || !formQuote.trim() || !formName.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {formStatus === 'loading' ? 'Envoi...' : 'Soumettre mon témoignage'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
