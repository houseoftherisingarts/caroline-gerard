// Contrat commun du module comptable (Xena Horizon, septembre 2026). Écrit en premier : tous les
// autres fichiers de lib/compta/ et components/admin/finances/ importent d'ici. Ne pas dupliquer ces
// formes ailleurs (voir docs/BRANCHEMENTS.md et CLAUDE.md pour le reste du canon).

export type Sens = 'revenu' | 'depense';

export interface Compte {
  id: string;
  code: string;
  nom: string;
  nomEn: string;
  sens: Sens;
  /** 1 par défaut (déductible en entier). 0.5 pour les repas et la représentation (règle fiscale québécoise). */
  deductible?: number;
  ordre: number;
  actif: boolean;
}

export interface Recurrence {
  frequence: 'hebdomadaire' | 'mensuelle' | 'annuelle';
  /** AAAA-MM-JJ, la prochaine date à générer. */
  prochaine: string;
  /** AAAA-MM-JJ, dernière date permise (comprise). */
  fin?: string;
  actif: boolean;
  /** Dates déjà générées, pour ne jamais créer deux fois la même. */
  generees: string[];
}

export interface Transaction {
  id: string;
  /** AAAA-MM-JJ */
  date: string;
  description: string;
  sens: Sens;
  /** Avant taxes, en dollars. */
  montant: number;
  tps: number;
  tvq: number;
  total: number;
  compteId: string;
  /** Client ou fournisseur. */
  tiers?: string;
  source: 'manuel' | 'facture' | 'import';
  factureId?: string;
  /** Pour dédoublonner un import bancaire. */
  importId?: string;
  recu?: {
    chemin: string;
    url: string;
    nom: string;
    contentType: string;
    taille: number;
  };
  concilie: boolean;
  notes?: string;
  /** Dépense à refacturer au client (lib/compta/refacturation.ts). */
  refacturable?: boolean;
  /** Nom du client à facturer, sinon `tiers`. */
  refactureA?: string;
  /** Identifiant du document de facture qui la porte, une fois refacturée. */
  refactureeDans?: string;
  /** Sur une dépense modèle : génère les dépenses dues à l'ouverture de Finances (lib/compta/recurrence.ts). */
  recurrence?: Recurrence;
  cree: unknown;
  modifie: unknown;
}

export interface ReglagesCompta {
  /** 'MM-JJ', '01-01' par défaut. */
  exerciceDebut: string;
  frequenceTaxes: 'annuelle' | 'trimestrielle' | 'mensuelle';
  inscritTaxes: boolean;
  /** 5 */
  tauxTPS: number;
  /** 9.975 */
  tauxTVQ: number;
  numeroTPS?: string;
  numeroTVQ?: string;
  methode: 'caisse' | 'exercice';
  anneeFiscale: number;
}

export interface Periode {
  debut: string;
  fin: string;
  libelle: string;
}

/** Une règle de catégorisation apprise quand Laurie corrige une transaction importée. */
export interface RegleCategorisation {
  motif: string;
  compteId: string;
  tiers?: string;
}

export interface Tiers {
  id: string;
  nom: string;
  type: 'client' | 'fournisseur';
  courriel?: string;
  notes?: string;
}

export const REGLAGES_DEFAUT: ReglagesCompta = {
  exerciceDebut: '01-01',
  frequenceTaxes: 'trimestrielle',
  inscritTaxes: true,
  tauxTPS: 5,
  tauxTVQ: 9.975,
  methode: 'caisse',
  anneeFiscale: new Date().getFullYear(),
};
