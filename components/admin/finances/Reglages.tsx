// Réglages généraux de la comptabilité (settings/compta) : début d'exercice, méthode, numéros de
// taxes. La fréquence des déclarations, le statut d'inscription aux taxes et la surcharge des paliers
// fiscaux vivent déjà dans l'onglet Taxes et impôt (components/admin/finances/TaxesImpot.tsx, bâtisseur
// K) : ce panneau y renvoie plutôt que de dédoubler ce formulaire. Canon : CANON-ADMIN.md.
import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Panneau, Champ, Selection, Bouton, type Language } from '../../../lib/compta/ancrage';
import { useReglagesCompta, enregistrerReglagesCompta } from '../../../lib/compta/periodes';
import { EXEMPLE_REGLAGES } from '../../../lib/compta/exemple';
import type { OngletFinance } from './Onglets';

interface Props {
  lang: Language;
  onAllerA?: (onglet: OngletFinance) => void;
}

const TEXTES = {
  FR: {
    kicker: 'Comptabilité',
    titre: 'Réglages',
    lede: 'Les bases de ta comptabilité : quand ton exercice commence, comment tu comptabilises, tes numéros de taxes.',
    exercice: 'Début de l\'exercice (mois-jour)', exerciceAide: '01-01 pour une année civile, ou la date de ton choix.',
    methode: 'Méthode comptable', caisse: 'Comptabilité de caisse', exerciceOpt: 'Comptabilité d\'exercice',
    numeroTPS: 'Numéro d\'inscription TPS', numeroTVQ: 'Numéro d\'inscription TVQ',
    enregistrer: 'Enregistrer les réglages', enregistre: 'Réglages enregistrés.',
    formatInvalide: 'Le début d\'exercice doit être au format MM-JJ (par exemple 01-01).',
    fiscalTitre: 'Fréquence des taxes et paliers d\'impôt',
    fiscalTexte: 'La fréquence de déclaration, le statut d\'inscription aux taxes et la surcharge des paliers d\'impôt se règlent dans l\'onglet Taxes et impôt.',
    fiscalLien: 'Aller à Taxes et impôt',
  },
  EN: {
    kicker: 'Accounting',
    titre: 'Settings',
    lede: 'The basics of your bookkeeping: when your fiscal year starts, how you record it, your tax numbers.',
    exercice: 'Fiscal year start (month-day)', exerciceAide: '01-01 for a calendar year, or the date of your choice.',
    methode: 'Accounting method', caisse: 'Cash basis', exerciceOpt: 'Accrual basis',
    numeroTPS: 'GST registration number', numeroTVQ: 'QST registration number',
    enregistrer: 'Save settings', enregistre: 'Settings saved.',
    formatInvalide: 'The fiscal year start must be in MM-DD format (e.g. 01-01).',
    fiscalTitre: 'Tax frequency and income tax brackets',
    fiscalTexte: 'Filing frequency, tax registration status and the income tax bracket override are set in the Taxes and income tax tab.',
    fiscalLien: 'Go to Taxes and income tax',
  },
};

const Reglages: React.FC<Props> = ({ lang, onAllerA }) => {
  const t = TEXTES[lang];
  const { reglages, loading } = useReglagesCompta();
  const modeVerif = import.meta.env.MODE === 'verif';

  // Copie locale le temps de l'édition, comme PlanComptable.tsx et TaxesImpot.tsx. En verif, un jeu
  // d'exemple affiche des numéros plausibles tant que Laurie n'en a pas encore inscrit (jamais écrit,
  // juste affiché : voir lib/compta/exemple.ts).
  const valeurDepart = modeVerif && !reglages.numeroTPS ? { ...reglages, numeroTPS: EXEMPLE_REGLAGES.numeroTPS, numeroTVQ: EXEMPLE_REGLAGES.numeroTVQ } : reglages;

  const [exerciceDebut, setExerciceDebut] = useState<string | null>(null);
  const [methode, setMethode] = useState<typeof reglages.methode | null>(null);
  const [numeroTPS, setNumeroTPS] = useState<string | null>(null);
  const [numeroTVQ, setNumeroTVQ] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [confirme, setConfirme] = useState(false);

  const aChange = exerciceDebut !== null || methode !== null || numeroTPS !== null || numeroTVQ !== null;

  const enregistrer = async () => {
    setErreur(false);
    setConfirme(false);
    if (exerciceDebut !== null && !/^\d{2}-\d{2}$/.test(exerciceDebut)) {
      setErreur(true);
      return;
    }
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {};
      if (exerciceDebut !== null) patch.exerciceDebut = exerciceDebut;
      if (methode !== null) patch.methode = methode;
      if (numeroTPS !== null) patch.numeroTPS = numeroTPS;
      if (numeroTVQ !== null) patch.numeroTVQ = numeroTVQ;
      if (Object.keys(patch).length > 0) await enregistrerReglagesCompta(patch);
      setExerciceDebut(null);
      setMethode(null);
      setNumeroTPS(null);
      setNumeroTVQ(null);
      setConfirme(true);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <p className="text-gris text-sm mesure">{t.lede}</p>

      <Panneau>
        <div className="grid gap-5 sm:grid-cols-2">
          <Champ
            label={t.exercice}
            aide={t.exerciceAide}
            value={exerciceDebut ?? valeurDepart.exerciceDebut}
            onChange={(e) => setExerciceDebut(e.target.value)}
            placeholder="01-01"
          />
          <Selection label={t.methode} value={methode ?? valeurDepart.methode} onChange={(e) => setMethode(e.target.value as typeof reglages.methode)}>
            <option value="caisse">{t.caisse}</option>
            <option value="exercice">{t.exerciceOpt}</option>
          </Selection>
          <Champ
            label={t.numeroTPS}
            value={numeroTPS ?? (valeurDepart.numeroTPS || '')}
            onChange={(e) => setNumeroTPS(e.target.value)}
            placeholder="123456789RT0001"
          />
          <Champ
            label={t.numeroTVQ}
            value={numeroTVQ ?? (valeurDepart.numeroTVQ || '')}
            onChange={(e) => setNumeroTVQ(e.target.value)}
            placeholder="1234567890TQ0001"
          />
        </div>

        {erreur && <p className="text-sm text-rose mt-4">{t.formatInvalide}</p>}
        {confirme && !aChange && <p className="text-sm text-gris mt-4">{t.enregistre}</p>}

        <div className="mt-6">
          <Bouton onClick={enregistrer} disabled={!aChange || busy}>{t.enregistrer}</Bouton>
        </div>
      </Panneau>

      <Panneau titre={t.fiscalTitre}>
        <p className="text-sm text-gris mesure">{t.fiscalTexte}</p>
        <button
          type="button"
          onClick={() => onAllerA?.('taxes')}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose hover:text-encre transition-colors"
        >
          {t.fiscalLien} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </Panneau>
    </div>
  );
};

export default Reglages;
