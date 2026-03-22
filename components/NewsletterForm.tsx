import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { saveSubscriber } from '../lib/firestore';
import EditableText from './EditableText';

const NewsletterForm = ({ compact = false }: { compact?: boolean }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Veuillez entrer une adresse courriel valide.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await saveSubscriber({
        id: email.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        email: email.toLowerCase().trim(),
        subscribedAt: new Date().toISOString(),
      });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  // ── Compact version (footer) ──────────────────────────────────────────────
  if (compact) {
    return (
      <div className="w-full border-b border-white/5 py-5 px-8">
        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> Vous êtes abonné(e)!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Star className="w-3.5 h-3.5 text-gold fill-current" />
              <span className="text-xs font-bold text-gold uppercase tracking-[0.15em]">Infolettre</span>
            </div>
            <div className="flex-1 relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="votre@courriel.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 px-5 py-2.5 bg-gold text-midnight text-sm font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'loading' ? 'Inscription...' : "M'abonner"}
            </button>
          </form>
        )}
        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      </div>
    );
  }

  // ── Full version ───────────────────────────────────────────────────────────
  return (
    <section className="w-full py-16 px-6 md:px-16 lg:px-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="bg-midnight/70 backdrop-blur-md border border-gold/25 rounded-2xl px-8 py-12 md:px-14 text-center shadow-[0_0_60px_rgba(212,175,55,0.07)]">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-6">
            <Star className="w-4 h-4 fill-current animate-pulse" />
            <span className="uppercase tracking-[0.2em] text-xs font-bold">Infolettre</span>
          </div>

          <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
            <EditableText
              tag="span"
              contentKey="newsletter_title_line1"
              defaultValue="Restez dans l'univers"
            />
            <br />
            <EditableText
              tag="span"
              contentKey="newsletter_title_italic"
              defaultValue="des rêves"
              className="italic text-gold"
            />
          </h2>

          <EditableText
            tag="p"
            contentKey="newsletter_description"
            defaultValue="Recevez en avant-première les nouvelles de Caroline — articles de blog, événements, conférences et lancements de livres."
            className="text-slate-400 text-lg mb-10 leading-relaxed"
          />

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="text-green-400 w-12 h-12" />
              <p className="text-white font-bold text-lg">Vous êtes abonné(e)!</p>
              <EditableText
                tag="p"
                contentKey="newsletter_success_text"
                defaultValue="Merci de rejoindre la communauté des rêveurs."
                className="text-slate-400 text-sm"
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="votre@courriel.com"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-8 py-4 bg-gold text-midnight font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === 'loading' ? 'Inscription...' : "M'abonner"}
              </button>
            </form>
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <div className="mt-10 pt-8 border-t border-white/10">
            <EditableText
              tag="p"
              contentKey="newsletter_cta_text"
              defaultValue="✨ <span style='font-weight:600'>Envie de plus?</span> Rejoignez la communauté des rêveurs"
              className="text-slate-300 text-base mb-4"
            />
            <Link
              to="/communaute"
              className="inline-flex items-center gap-2 px-8 py-3 border border-gold/40 text-gold rounded-xl hover:bg-gold hover:text-midnight font-bold transition-all"
            >
              <EditableText
                tag="span"
                contentKey="newsletter_cta_button"
                defaultValue="Créer mon espace membre"
              />
              <ArrowRight className="w-4 h-4" />
            </Link>
            <EditableText
              tag="p"
              contentKey="newsletter_cta_subtext"
              defaultValue="Connexion Google ou courriel · Accès à vos commandes · Agenda des événements"
              className="text-slate-600 text-xs mt-3"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterForm;
