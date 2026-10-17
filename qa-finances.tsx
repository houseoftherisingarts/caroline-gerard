// Harnais de capture pour la boucle de vérification visuelle du module comptable (scripts/qa-finances.cjs).
// Jamais lié depuis le site (aucune route dans lib/routes.ts, aucun lien dans App.tsx) : une adresse
// interne, buildée à part par scripts/vite.qa.config.ts dans dist-verif, à côté du vrai bundle.
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Transactions from './components/admin/finances/Transactions';
import Import from './components/admin/finances/Import';
import Conciliation from './components/admin/finances/Conciliation';
import PlanComptable from './components/admin/finances/PlanComptable';
import Tiers from './components/admin/finances/Tiers';
import Recus from './components/admin/finances/Recus';
import TaxesImpot from './components/admin/finances/TaxesImpot';
import CartesFiscales from './components/admin/finances/CartesFiscales';
import Apercu from './components/admin/finances/Apercu';
import Rapports from './components/admin/finances/Rapports';
import Reglages from './components/admin/finances/Reglages';
import type { Language } from './lib/compta/ancrage';
import type { Transaction } from './lib/compta/types';

const params = new URLSearchParams(window.location.search);
const lang = (params.get('lang') === 'EN' ? 'EN' : 'FR') as Language;
const cle = params.get('c') || 'transactions';

const TRANSACTION_EXEMPLE_SANS: Transaction = {
  id: 'exemple-recu-sans', date: '2026-09-03', description: 'Formation en ligne, marque personnelle',
  sens: 'depense', montant: 349, tps: 17.45, tvq: 34.81, total: 401.26, compteId: 'dep-perfectionnement',
  tiers: 'Formation en ligne, marque personnelle', source: 'manuel', concilie: false, cree: null, modifie: null,
};

const TRANSACTION_EXEMPLE_AVEC: Transaction = {
  ...TRANSACTION_EXEMPLE_SANS, id: 'exemple-recu-avec',
  recu: { chemin: 'recus/exemple/facture.jpg', url: '/images/banniere-defaut-960.jpg', nom: 'facture-formation.jpg', contentType: 'image/jpeg', taille: 184320 },
};

function Page() {
  if (cle === 'recus') {
    const avecRecu = params.get('recu') === 'avec';
    return <Recus transaction={avecRecu ? TRANSACTION_EXEMPLE_AVEC : TRANSACTION_EXEMPLE_SANS} lang={lang} onFermer={() => {}} />;
  }
  if (cle === 'apercu') {
    // ?rec=2 simule « 2 dépenses récurrentes ajoutées » (le vrai nombre vient de useDepensesRecurrentes).
    return (
      <div className="bg-papier min-h-screen px-6 md:px-10 py-10">
        <Apercu lang={lang} recurrentesAjoutees={Number(params.get('rec')) || 0} />
      </div>
    );
  }
  const Composant = { transactions: Transactions, import: Import, conciliation: Conciliation, 'plan-comptable': PlanComptable, tiers: Tiers, 'taxes-impot': TaxesImpot, 'cartes-fiscales': CartesFiscales, apercu: Apercu, rapports: Rapports, reglages: Reglages }[cle] || Transactions;
  return (
    <div className="bg-papier min-h-screen px-6 md:px-10 py-10">
      <Composant lang={lang} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Page />);
