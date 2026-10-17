// Plan comptable du métier « auteure » (gabarit _vexel-base/modules/compta/site/lib/compta/plans/).
// Plan de départ d'une artiste autonome au Québec qui vend ses œuvres, donne des conférences et anime des ateliers.
// Les libellés du gabarit « auteure » sont renommés pour elle (œuvres, conférences, ateliers); les identifiants
// restent ceux du gabarit. Les bourses du CALQ et du Conseil des arts du Canada ont leur compte. L'impression des œuvres vendues en direct va au coût des ventes
// (classe 5000). Les repas d'affaires sont déductibles à 50 %.
// Surchargeable dans Firestore settings/plan_comptable (PlanComptable.tsx) : ce fichier ne sert que de valeur de départ.
import type { Compte } from './types';

export const PLAN_COMPTABLE_DEFAUT: Compte[] = [
  // --- Revenus ---
  { id: 'rev-droits-auteur', code: '4000', nom: "Droits d'auteur et redevances", nomEn: 'Royalties', sens: 'revenu', ordre: 10, actif: true },
  { id: 'rev-a-valoir', code: '4010', nom: 'À-valoir', nomEn: 'Advances', sens: 'revenu', ordre: 20, actif: true },
  { id: 'rev-ventes-livres', code: '4100', nom: "Ventes directes d'œuvres", nomEn: 'Direct sales of works', sens: 'revenu', ordre: 30, actif: true },
  { id: 'rev-bourses', code: '4200', nom: 'Bourses et prix', nomEn: 'Grants and prizes', sens: 'revenu', ordre: 40, actif: true },
  { id: 'rev-animations', code: '4300', nom: 'Conférences, animations et événements', nomEn: 'Talks, readings and events', sens: 'revenu', ordre: 50, actif: true },
  { id: 'rev-ateliers', code: '4400', nom: 'Ateliers', nomEn: 'Workshops', sens: 'revenu', ordre: 60, actif: true },
  { id: 'rev-autres', code: '4900', nom: 'Autres revenus', nomEn: 'Other revenue', sens: 'revenu', ordre: 70, actif: true },

  // --- Coût des ventes et dépenses déductibles ---
  { id: 'dep-impression', code: '5000', nom: 'Impression et production des œuvres', nomEn: 'Printing and production of works', sens: 'depense', deductible: 1, ordre: 100, actif: true },
  { id: 'dep-envois', code: '5010', nom: "Envois postaux des œuvres", nomEn: 'Shipping of works', sens: 'depense', deductible: 1, ordre: 110, actif: true },
  { id: 'dep-revision', code: '5100', nom: 'Révision, correction et traduction', nomEn: 'Editing, proofreading and translation', sens: 'depense', deductible: 1, ordre: 120, actif: true },
  { id: 'dep-illustration', code: '5110', nom: 'Illustration et graphisme', nomEn: 'Illustration and design', sens: 'depense', deductible: 1, ordre: 130, actif: true },
  { id: 'dep-bureau-domicile', code: '6000', nom: 'Bureau à domicile', nomEn: 'Home office', sens: 'depense', deductible: 1, ordre: 140, actif: true },
  { id: 'dep-telecom', code: '6010', nom: 'Télécommunications', nomEn: 'Telecommunications', sens: 'depense', deductible: 1, ordre: 150, actif: true },
  { id: 'dep-logiciels', code: '6020', nom: 'Logiciels et abonnements', nomEn: 'Software and subscriptions', sens: 'depense', deductible: 1, ordre: 160, actif: true },
  { id: 'dep-publicite', code: '6030', nom: 'Publicité et site web', nomEn: 'Advertising and website', sens: 'depense', deductible: 1, ordre: 170, actif: true },
  { id: 'dep-fournitures', code: '6040', nom: 'Fournitures', nomEn: 'Supplies', sens: 'depense', deductible: 1, ordre: 180, actif: true },
  { id: 'dep-honoraires', code: '6050', nom: 'Honoraires professionnels', nomEn: 'Professional fees', sens: 'depense', deductible: 1, ordre: 190, actif: true },
  { id: 'dep-perfectionnement', code: '6060', nom: 'Perfectionnement professionnel', nomEn: 'Professional development', sens: 'depense', deductible: 1, ordre: 200, actif: true },
  { id: 'dep-documentation', code: '6065', nom: 'Livres et documentation', nomEn: 'Books and research material', sens: 'depense', deductible: 1, ordre: 210, actif: true },
  { id: 'dep-deplacements', code: '6070', nom: 'Déplacements', nomEn: 'Travel', sens: 'depense', deductible: 1, ordre: 220, actif: true },
  { id: 'dep-salons', code: '6075', nom: 'Salons, événements et kiosques', nomEn: 'Fairs, events and booths', sens: 'depense', deductible: 1, ordre: 230, actif: true },
  { id: 'dep-repas', code: '6080', nom: 'Repas et représentation', nomEn: 'Meals and entertainment', sens: 'depense', deductible: 0.5, ordre: 240, actif: true },
  { id: 'dep-assurances', code: '6090', nom: 'Assurances', nomEn: 'Insurance', sens: 'depense', deductible: 1, ordre: 250, actif: true },
  { id: 'dep-frais-bancaires', code: '6100', nom: 'Frais bancaires et Stripe', nomEn: 'Bank and Stripe fees', sens: 'depense', deductible: 1, ordre: 260, actif: true },
  { id: 'dep-cotisations', code: '6110', nom: 'Cotisations professionnelles', nomEn: 'Professional dues', sens: 'depense', deductible: 1, ordre: 270, actif: true },
  { id: 'dep-amortissement', code: '6120', nom: 'Amortissement', nomEn: 'Depreciation', sens: 'depense', deductible: 1, ordre: 280, actif: true },
  { id: 'dep-taxes-permis', code: '6130', nom: 'Taxes et permis', nomEn: 'Taxes and licenses', sens: 'depense', deductible: 1, ordre: 290, actif: true },
  { id: 'dep-autres', code: '6900', nom: 'Autres dépenses', nomEn: 'Other expenses', sens: 'depense', deductible: 1, ordre: 300, actif: true },
];
