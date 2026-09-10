/**
 * La rangée de partage d'une nouvelle. Le même composant sert sur le site public et dans
 * l'Espace Auteure, pour que Caroline publie et partage au même endroit.
 *
 * « Partager » ouvre la feuille de partage du téléphone (Facebook, Messenger, courriel, tout
 * ce qu'elle a d'installé) quand le navigateur la propose, ce qui est le cas sur iPhone et sur
 * Android. Sur un ordinateur, le bouton reste caché et les trois autres suffisent.
 */
import React, { useState } from 'react';
import { Facebook, Link as LinkIcon, Check, Share2, ClipboardCopy } from 'lucide-react';

type Props = {
  url: string;
  title: string;
  text?: string;
  className?: string;
};

const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-bold
               hover:text-gold hover:border-gold/50 hover:bg-gold/10 transition-all"
  >
    {children}
  </button>
);

const PartageBoutons = ({ url, title, text = '', className = '' }: Props) => {
  const [copie, setCopie] = useState<'lien' | 'texte' | null>(null);

  const flash = (quoi: 'lien' | 'texte') => {
    setCopie(quoi);
    setTimeout(() => setCopie(null), 2000);
  };

  const copier = async (valeur: string, quoi: 'lien' | 'texte') => {
    try {
      await navigator.clipboard.writeText(valeur);
      flash(quoi);
    } catch {
      // Navigateur qui refuse le presse-papiers : on montre le texte pour qu'elle le copie à la main.
      window.prompt('Copiez ce texte :', valeur);
    }
  };

  const partagePhone = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Partage annulé par Caroline : rien à faire.
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canNativeShare() && (
        <button
          type="button"
          onClick={partagePhone}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold text-midnight text-xs font-bold
                     hover:bg-white transition-colors"
        >
          <Share2 size={14} /> Partager
        </button>
      )}

      <Btn
        title="Partager sur Facebook"
        onClick={() => window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank', 'noopener,noreferrer,width=640,height=640',
        )}
      >
        <Facebook size={14} /> Facebook
      </Btn>

      <Btn title="Copier le lien de la nouvelle" onClick={() => copier(url, 'lien')}>
        {copie === 'lien' ? <Check size={14} className="text-green-400" /> : <LinkIcon size={14} />}
        {copie === 'lien' ? 'Lien copié' : 'Copier le lien'}
      </Btn>

      <Btn
        title="Copier le texte et le lien, prêts à coller"
        onClick={() => copier([title, text, url].filter(Boolean).join('\n\n'), 'texte')}
      >
        {copie === 'texte' ? <Check size={14} className="text-green-400" /> : <ClipboardCopy size={14} />}
        {copie === 'texte' ? 'Texte copié' : 'Copier le texte'}
      </Btn>
    </div>
  );
};

export default PartageBoutons;
