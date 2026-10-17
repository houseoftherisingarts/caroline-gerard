// Deux mini-cartes réutilisables : le montant de taxes à remettre et l'impôt estimé, projetés à la
// fin de l'exercice au rythme actuel. Montées au-dessus des transactions (Transactions.tsx) et dans
// l'aperçu (rapports.ts) pour qu'à chaque chargement, le montant à mettre de côté saute aux yeux.
// Mêmes fonctions pures que TaxesImpot.tsx (lib/compta/fiscal.ts) : un seul calcul, deux affichages.
import React from 'react';
import { Panneau, Chiffre, type Language } from '../../../lib/compta/ancrage';
import { useTransactions } from '../../../lib/compta/transactions';
import { useReglagesCompta } from '../../../lib/compta/periodes';
import { useParametresFiscaux } from '../../../lib/compta/fiscal-2026';
import { projectionTaxes, projectionImpot } from '../../../lib/compta/fiscal';
import { formatMontant } from '../../../lib/compta/format';

interface Props {
  lang: Language;
  className?: string;
}

const TEXTES = {
  FR: {
    taxes: 'Taxes à remettre',
    taxesNote: 'Projeté, fin d\'exercice',
    taxesJeune: 'Trop tôt pour projeter',
    impot: 'Impôt estimé',
    impotNote: 'Au rythme actuel',
  },
  EN: {
    taxes: 'Taxes owing',
    taxesNote: 'Projected, year end',
    taxesJeune: 'Too early to project',
    impot: 'Estimated income tax',
    impotNote: 'At your current pace',
  },
};

const CartesFiscales: React.FC<Props> = ({ lang, className = '' }) => {
  const t = TEXTES[lang];
  const { data: transactions } = useTransactions();
  const { reglages } = useReglagesCompta();
  const { params } = useParametresFiscaux();
  const aujourdhui = new Date();

  const taxes = projectionTaxes(transactions, reglages, aujourdhui);
  const impot = projectionImpot(transactions, reglages, params, aujourdhui);

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <Panneau>
        <Chiffre
          valeur={taxes.trojeune ? '·' : formatMontant(taxes.netProjete.total)}
          libelle={t.taxes}
          note={taxes.trojeune ? t.taxesJeune : t.taxesNote}
        />
      </Panneau>
      <Panneau>
        <Chiffre
          valeur={impot.trojeune ? '·' : formatMontant(impot.impotProjete.total)}
          libelle={t.impot}
          note={impot.trojeune ? t.taxesJeune : t.impotNote}
        />
      </Panneau>
    </div>
  );
};

export default CartesFiscales;
