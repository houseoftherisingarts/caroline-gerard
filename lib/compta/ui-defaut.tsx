// Les primitives du back-office v2 (voir CANON-ADMIN.md) : papier, encre, un accent, Playfair pour
// les titres, Figtree pour le reste. Aucun verre, aucun dégradé, aucune ombre sur les panneaux.
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const EnTete: React.FC<{
  kicker?: string;
  titre: string;
  lede?: string;
  actions?: React.ReactNode;
}> = ({ kicker, titre, lede, actions }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-filet pb-6">
    <div className="min-w-0">
      {kicker && <p className="kicker text-rose mb-2">{kicker}</p>}
      <h1 className="font-serif text-h2 text-encre">{titre}</h1>
      {lede && <p className="mt-2 text-gris text-sm mesure">{lede}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export const Panneau: React.FC<{
  titre?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ titre, actions, className = '', children }) => (
  <section className={`bg-papier-2 border border-filet rounded-champ p-5 md:p-6 ${className}`}>
    {(titre || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {titre && <h2 className="font-sans font-semibold text-encre">{titre}</h2>}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

type Variante = 'primaire' | 'secondaire' | 'discret' | 'danger';
const VARIANTES: Record<Variante, string> = {
  primaire: 'rounded-pilule bg-bouton text-sur-bouton hover:bg-bouton-2 px-5',
  secondaire: 'rounded-pilule border border-filet text-encre hover:border-encre px-5',
  discret: 'rounded-pilule text-gris hover:text-encre px-3',
  danger: 'rounded-pilule border border-rose/30 text-rose hover:border-rose px-5',
};

export const Bouton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: LucideIcon; petit?: boolean }
> = ({ variante = 'primaire', icone: Icone, petit = false, className = '', children, type = 'button', ...props }) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
      petit ? 'min-h-[36px]' : 'min-h-[44px]'
    } ${VARIANTES[variante]} ${className}`}
    {...props}
  >
    {Icone && <Icone className="w-4 h-4" aria-hidden="true" />}
    {children}
  </button>
);

const CHAMP =
  'w-full bg-papier border border-filet rounded-champ px-4 py-3 text-encre placeholder-gris outline-none transition-colors focus:border-rose disabled:opacity-50';

export const Champ: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; aide?: string }> = ({
  label,
  aide,
  id,
  className = '',
  ...props
}) => {
  const ident = id ?? `champ-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={ident} className="text-petit font-semibold text-encre">
        {label}
      </label>
      <input id={ident} className={CHAMP} {...props} />
      {aide && <p className="text-[13px] text-gris">{aide}</p>}
    </div>
  );
};

export const Zone: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; aide?: string }> = ({
  label,
  aide,
  id,
  className = '',
  ...props
}) => {
  const ident = id ?? `zone-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={ident} className="text-petit font-semibold text-encre">
        {label}
      </label>
      <textarea id={ident} className={`${CHAMP} min-h-[7rem] resize-y`} {...props} />
      {aide && <p className="text-[13px] text-gris">{aide}</p>}
    </div>
  );
};

export const Selection: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({
  label,
  id,
  className = '',
  children,
  ...props
}) => {
  const ident = id ?? `selection-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={ident} className="text-petit font-semibold text-encre">
        {label}
      </label>
      <select id={ident} className={CHAMP} {...props}>
        {children}
      </select>
    </div>
  );
};

export const Etiquette: React.FC<{ tone?: 'neutre' | 'accent' | 'encre'; children: React.ReactNode; className?: string }> = ({
  tone = 'neutre',
  children,
  className = '',
}) => {
  const tons = {
    neutre: 'border border-filet text-gris',
    accent: 'bg-rose/10 text-rose',
    encre: 'bg-encre text-papier',
  };
  return (
    <span className={`inline-flex items-center rounded-pilule px-2.5 py-0.5 text-[13px] font-medium ${tons[tone]} ${className}`}>
      {children}
    </span>
  );
};

export const Chiffre: React.FC<{ valeur: React.ReactNode; libelle: string; note?: string }> = ({ valeur, libelle, note }) => (
  <div>
    <p className="font-serif text-display text-encre tabular-nums leading-none">{valeur}</p>
    <p className="kicker text-gris mt-3">{libelle}</p>
    {note && <p className="text-[13px] text-gris mt-1">{note}</p>}
  </div>
);

export const Vide: React.FC<{ titre: string; texte?: string; action?: React.ReactNode }> = ({ titre, texte, action }) => (
  <div className="py-14 text-center">
    <p className="font-serif text-h3 text-encre">{titre}</p>
    {texte && <p className="text-gris text-sm mt-2 mx-auto mesure">{texte}</p>}
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </div>
);

export const Chargement: React.FC<{ texte?: string }> = ({ texte }) => (
  <div className="py-14 flex flex-col items-center gap-3" role="status" aria-live="polite">
    <span className="w-8 h-8 rounded-pilule border-2 border-filet border-t-rose animate-spin" />
    {texte && <p className="text-gris text-sm">{texte}</p>}
  </div>
);
