// Les deux blocs sous une ligne en édition (Transactions.tsx) : « À refacturer » et « Récurrence ».
// Ils lisent et écrivent un brouillon de Transaction ; l'enregistrement reste dans la ligne.
import React from 'react';
import { Champ, Selection, Bouton, type Language } from '../../../lib/compta/ancrage';
import { dateSuivante } from '../../../lib/compta/recurrence';
import type { Recurrence, Transaction } from '../../../lib/compta/types';

const TEXTES = {
  FR: {
    refacturer: 'À refacturer', client: 'Client à facturer',
    recurrence: 'Récurrence', aucune: 'Aucune', hebdomadaire: 'Chaque semaine', mensuelle: 'Chaque mois', annuelle: 'Chaque année',
    frequence: 'Fréquence', prochaine: 'Prochaine date', fin: 'Date de fin', actif: 'Actif',
    aide: 'Une dépense est ajoutée à chaque date, à l\'ouverture de Finances.',
  },
  EN: {
    refacturer: 'To rebill', client: 'Client to bill',
    recurrence: 'Recurrence', aucune: 'None', hebdomadaire: 'Every week', mensuelle: 'Every month', annuelle: 'Every year',
    frequence: 'Frequency', prochaine: 'Next date', fin: 'End date', actif: 'Active',
    aide: 'An expense is added on each date when Finances opens.',
  },
};

interface Props {
  lang: Language;
  brouillon: Transaction;
  onChange: (patch: Partial<Transaction>) => void;
  onEnregistrer: () => void;
  onFermer: () => void;
  enregistrer: string;
  annuler: string;
}

const BlocsEdition: React.FC<Props> = ({ lang, brouillon, onChange, onEnregistrer, onFermer, enregistrer, annuler }) => {
  const t = TEXTES[lang];
  const r = brouillon.recurrence;
  const choisir = (frequence: string) => {
    if (!frequence) return onChange({ recurrence: undefined });
    const f = frequence as Recurrence['frequence'];
    onChange({ recurrence: { generees: [], actif: true, ...r, frequence: f, prochaine: r?.prochaine || dateSuivante(brouillon.date, f) } });
  };
  const maj = (patch: Partial<Recurrence>) => r && onChange({ recurrence: { ...r, ...patch } });
  const case_ = 'w-5 h-5 accent-rose';
  return (
    // Collé à gauche et large comme l'écran : la ligne vit dans un tableau qui défile, ce bloc reste en vue.
    <div className="sticky left-0 w-[calc(100vw-6.5rem)] lg:w-[48rem] py-4 space-y-4">
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-encre min-h-[44px]">
          <input type="checkbox" className={case_} checked={!!brouillon.refacturable}
            onChange={(e) => onChange({ refacturable: e.target.checked || undefined, refactureA: e.target.checked ? brouillon.refactureA ?? brouillon.tiers : undefined })} />
          {t.refacturer}
        </label>
        {brouillon.refacturable && (
          <Champ label={t.client} value={brouillon.refactureA ?? brouillon.tiers ?? ''} onChange={(e) => onChange({ refactureA: e.target.value })} />
        )}
      </div>
      {brouillon.sens === 'depense' && (
        <div className="space-y-3">
          <p className="kicker text-gris">{t.recurrence}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Selection label={t.frequence} value={r?.frequence || ''} onChange={(e) => choisir(e.target.value)}>
              <option value="">{t.aucune}</option>
              <option value="hebdomadaire">{t.hebdomadaire}</option>
              <option value="mensuelle">{t.mensuelle}</option>
              <option value="annuelle">{t.annuelle}</option>
            </Selection>
            {r && <Champ label={t.prochaine} type="date" value={r.prochaine} onChange={(e) => maj({ prochaine: e.target.value })} />}
            {r && <Champ label={t.fin} type="date" value={r.fin || ''} onChange={(e) => maj({ fin: e.target.value || undefined })} />}
          </div>
          {r && (
            <label className="flex items-center gap-2 text-sm text-encre min-h-[44px]">
              <input type="checkbox" className={case_} checked={r.actif} onChange={(e) => maj({ actif: e.target.checked })} />
              {t.actif}
            </label>
          )}
          <p className="text-sm text-gris">{t.aide}</p>
        </div>
      )}
    </div>
    <div className="flex flex-wrap gap-2">
      <Bouton onClick={onEnregistrer}>{enregistrer}</Bouton>
      <Bouton variante="secondaire" onClick={onFermer}>{annuler}</Bouton>
    </div>
    </div>
  );
};

export default BlocsEdition;
