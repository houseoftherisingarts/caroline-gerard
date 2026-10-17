// Constantes fiscales 2026 (Québec, travailleuse autonome) pour le prédicteur de taxes et d'impôt.
// Chaque bloc porte sa source et sa date de lecture. Tout est surchargeable par settings/fiscal
// (Alex ou Laurie ajustent sans redéploiement) via parametresFiscaux(surcharge).
//
// Lu le 2026-09-08 :
// - Fédéral (paliers, MPB, indexation 2 %) :
//   https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html
//   https://ca.finance.yahoo.com/news/cra-released-tax-numbers-2026-145834810.html
//   https://calculqc.ca/blog/fiscalite/paliers-imposition-quebec-2026.html (MPB fédéral 16 452 $, MPB min 14 829 $)
// - Québec (paliers, MPB, indexation 2,05 %) :
//   https://www.wealthsimple.com/fr-ca/learn/quebec-tax-brackets
//   https://calculqc.ca/blog/fiscalite/paliers-imposition-quebec-2026.html
// - Abattement du Québec (16,5 % du fédéral net) : règle stable, non indexée, Loi de l'impôt sur le revenu art. 120.
// - RRQ travailleur autonome (MGA 74 600 $, MGA supplémentaire 85 000 $, exemption 3 500 $,
//   taux base 10,6 %, 1re cotisation supplémentaire 2 %, 2e cotisation supplémentaire 8 %) :
//   https://www.revenuquebec.ca/fr/entreprises/retenues-a-la-source-et-cotisations-de-lemployeur/calcul-des-retenues-et-des-cotisations/cotisations-au-rrq/maximum-des-gains-admissibles-et-taux-de-cotisation/
//   https://www.astuceformations.com/blog/rrq-2026
// - RQAP travailleur autonome (taux 0,764 %, revenu maximal assurable 103 000 $, seuil minimal 2 000 $) :
//   https://www.quebec.ca/nouvelles/actualites/details/baisse-des-taux-de-cotisation-au-regime-quebecois-dassurance-parentale-en-2026
// - Acomptes provisionnels (seuils 3 000 $ fédéral / 1 800 $ Québec, dates 15 mars/juin/sept/déc) :
//   https://www.maxrefund.ca/fr/blog/tax-instalments-canada
// - TPS 5 %, TVQ 9,975 %, seuil d'inscription 30 000 $ : règles stables, non indexées.

export interface Palier {
  jusqua: number | null; // null = pas de plafond
  taux: number; // fraction, ex. 0.14 pour 14 %
}

export interface ParametresFiscaux {
  annee: number;
  federal: {
    paliers: Palier[];
    montantPersonnelMax: number;
    montantPersonnelMin: number;
    seuilReductionDebut: number; // revenu net où le MPB commence à diminuer
    seuilReductionFin: number; // revenu net où le MPB atteint son minimum
    tauxCredit: number; // taux de conversion des crédits non remboursables (palier le plus bas)
  };
  quebec: {
    paliers: Palier[];
    montantPersonnel: number;
    tauxCredit: number;
    abattement: number; // 16,5 % du fédéral net
  };
  rrq: {
    exemptionDeBase: number;
    mga: number; // maximum des gains admissibles
    mgaSupplementaire: number; // maximum des gains admissibles supplémentaire
    tauxBase: number; // 10,6 %, part travailleur autonome (déjà combinée)
    tauxPremiereSupplementaire: number; // 2 %
    tauxDeuxiemeSupplementaire: number; // 8 %, sur la tranche mga..mgaSupplementaire
  };
  rqap: {
    seuilMinimal: number; // 2 000 $, aucune cotisation en dessous
    maxAssurable: number; // 103 000 $
    tauxAutonome: number; // 0,764 %
  };
  taxes: {
    tauxTPS: number; // 5 %
    tauxTVQ: number; // 9,975 %
    seuilInscription: number; // 30 000 $
  };
  acomptes: {
    seuilFederal: number; // 3 000 $
    seuilQuebec: number; // 1 800 $
    dates: string[]; // 'MM-JJ', quatre échéances
  };
}

export const FISCAL_2026: ParametresFiscaux = {
  annee: 2026,
  federal: {
    paliers: [
      { jusqua: 58523, taux: 0.14 },
      { jusqua: 117045, taux: 0.205 },
      { jusqua: 181440, taux: 0.26 },
      { jusqua: 258482, taux: 0.29 },
      { jusqua: null, taux: 0.33 },
    ],
    montantPersonnelMax: 16452,
    montantPersonnelMin: 14829,
    seuilReductionDebut: 181440,
    seuilReductionFin: 258482,
    tauxCredit: 0.14,
  },
  quebec: {
    paliers: [
      { jusqua: 54345, taux: 0.14 },
      { jusqua: 108680, taux: 0.19 },
      { jusqua: 132245, taux: 0.24 },
      { jusqua: null, taux: 0.2575 },
    ],
    montantPersonnel: 18952,
    tauxCredit: 0.14,
    abattement: 0.165,
  },
  rrq: {
    exemptionDeBase: 3500,
    mga: 74600,
    mgaSupplementaire: 85000,
    tauxBase: 0.106,
    tauxPremiereSupplementaire: 0.02,
    tauxDeuxiemeSupplementaire: 0.08,
  },
  rqap: {
    seuilMinimal: 2000,
    maxAssurable: 103000,
    tauxAutonome: 0.00764,
  },
  taxes: {
    tauxTPS: 0.05,
    tauxTVQ: 0.09975,
    seuilInscription: 30000,
  },
  acomptes: {
    seuilFederal: 3000,
    seuilQuebec: 1800,
    dates: ['03-15', '06-15', '09-15', '12-15'],
  },
};

// Fusionne une surcharge partielle (settings/fiscal) sur les constantes de l'année.
export function parametresFiscaux(surcharge?: Partial<ParametresFiscaux>): ParametresFiscaux {
  if (!surcharge) return FISCAL_2026;
  return {
    ...FISCAL_2026,
    ...surcharge,
    federal: { ...FISCAL_2026.federal, ...surcharge.federal },
    quebec: { ...FISCAL_2026.quebec, ...surcharge.quebec },
    rrq: { ...FISCAL_2026.rrq, ...surcharge.rrq },
    rqap: { ...FISCAL_2026.rqap, ...surcharge.rqap },
    taxes: { ...FISCAL_2026.taxes, ...surcharge.taxes },
    acomptes: { ...FISCAL_2026.acomptes, ...surcharge.acomptes },
  };
}

// --- Lecture et écriture de la surcharge (settings/fiscal), à part des fonctions pures ci-dessus ---
import { useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, useDocument } from './ancrage';

/** Les paramètres fiscaux effectifs : les constantes de l'année, fusionnées avec settings/fiscal. */
export function useParametresFiscaux() {
  const { data, loading } = useDocument<Partial<ParametresFiscaux>>('settings/fiscal');
  const params = useMemo(() => parametresFiscaux(data || undefined), [data]);
  return { params, surchargee: !!data, loading };
}

/** Écrit une surcharge partielle (fusion peu profonde par bloc, voir parametresFiscaux). */
export async function enregistrerSurchargeFiscale(patch: Partial<ParametresFiscaux>): Promise<void> {
  await setDoc(doc(db, 'settings/fiscal'), patch, { merge: true });
}
