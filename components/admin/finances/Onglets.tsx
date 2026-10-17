// Barre d'onglets de la page Finances : neuf modules derrière une seule adresse, l'onglet actif dans
// le paramètre de requête (`/admin/finances?onglet=...`) pour ne pas toucher lib/routes.ts (partagé).
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ListChecks,
  Upload,
  GitCompareArrows,
  Landmark,
  FileBarChart2,
  BookOpen,
  Users,
  Settings,
} from 'lucide-react';
import type { Language } from '../../../lib/compta/ancrage';

export type OngletFinance =
  | 'apercu'
  | 'transactions'
  | 'import'
  | 'conciliation'
  | 'taxes'
  | 'rapports'
  | 'plan-comptable'
  | 'tiers'
  | 'reglages';

export const ONGLET_PAR_DEFAUT: OngletFinance = 'apercu';

interface DefinitionOnglet {
  id: OngletFinance;
  icone: LucideIcon;
  libelle: { FR: string; EN: string };
}

export const ONGLETS_FINANCE: DefinitionOnglet[] = [
  { id: 'apercu', icone: LayoutDashboard, libelle: { FR: 'Aperçu', EN: 'Overview' } },
  { id: 'transactions', icone: ListChecks, libelle: { FR: 'Transactions', EN: 'Transactions' } },
  { id: 'import', icone: Upload, libelle: { FR: 'Importer', EN: 'Import' } },
  { id: 'conciliation', icone: GitCompareArrows, libelle: { FR: 'Conciliation', EN: 'Reconciliation' } },
  { id: 'taxes', icone: Landmark, libelle: { FR: 'Taxes et impôt', EN: 'Taxes and income tax' } },
  { id: 'rapports', icone: FileBarChart2, libelle: { FR: 'Rapports', EN: 'Reports' } },
  { id: 'plan-comptable', icone: BookOpen, libelle: { FR: 'Plan comptable', EN: 'Chart of accounts' } },
  { id: 'tiers', icone: Users, libelle: { FR: 'Tiers', EN: 'Parties' } },
  { id: 'reglages', icone: Settings, libelle: { FR: 'Réglages', EN: 'Settings' } },
];

const IDS_VALIDES = new Set<string>(ONGLETS_FINANCE.map((o) => o.id));

/** Lit l'onglet depuis `?onglet=...` (window.location.search), retombe sur Aperçu si absent ou inconnu. */
export function ongletDepuisRecherche(recherche: string): OngletFinance {
  const valeur = new URLSearchParams(recherche).get('onglet');
  return valeur && IDS_VALIDES.has(valeur) ? (valeur as OngletFinance) : ONGLET_PAR_DEFAUT;
}

export const BarreOnglets: React.FC<{ actif: OngletFinance; lang: Language; onChange: (onglet: OngletFinance) => void }> = ({
  actif,
  lang,
  onChange,
}) => (
  <div className="flex gap-1 overflow-x-auto border-b border-filet" role="tablist">
    {ONGLETS_FINANCE.map((onglet) => {
      const Icone = onglet.icone;
      const estActif = onglet.id === actif;
      return (
        <button
          key={onglet.id}
          type="button"
          role="tab"
          aria-selected={estActif}
          onClick={() => onChange(onglet.id)}
          className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            estActif ? 'border-rose text-encre' : 'border-transparent text-gris hover:text-encre'
          }`}
        >
          <Icone className="w-4 h-4" aria-hidden="true" />
          {onglet.libelle[lang]}
        </button>
      );
    })}
  </div>
);
