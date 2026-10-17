// Prédicteur de taxes à remettre et d'impôt estimé, à partir des transactions de la comptabilité.
// Fonctions pures, sans Firestore. Voir docs/FISCAL-2026.md pour les sources des constantes.
import type { Transaction, ReglagesCompta, Periode } from './types';
import type { ParametresFiscaux, Palier } from './fiscal-2026';
import { periodesDe } from './periodes';

// --- Utilitaires de dates ---

const iso = (d: Date): string => d.toISOString().slice(0, 10);

// L'exercice (au sens de periodesDe) qui contient la date donnée, quelle que soit l'année civile.
function exerciceContenant(reglages: ReglagesCompta, aujourdhui: Date): Periode {
  const dateStr = iso(aujourdhui);
  const anneeCivile = aujourdhui.getFullYear();
  for (const decalage of [0, -1, 1]) {
    const { exercice } = periodesDe(reglages, anneeCivile + decalage);
    if (dateStr >= exercice.debut && dateStr <= exercice.fin) return exercice;
  }
  return periodesDe(reglages, anneeCivile).exercice;
}

// --- Paliers d'imposition ---

function impotSelonPaliers(revenu: number, paliers: Palier[]): number {
  let impot = 0;
  let precedent = 0;
  for (const p of paliers) {
    const plafond = p.jusqua ?? Infinity;
    if (revenu <= precedent) break;
    const tranche = Math.min(revenu, plafond) - precedent;
    if (tranche > 0) impot += tranche * p.taux;
    precedent = plafond;
  }
  return impot;
}

function tauxMarginalSelonPaliers(revenu: number, paliers: Palier[]): number {
  for (const p of paliers) {
    if (p.jusqua === null || revenu <= p.jusqua) return p.taux;
  }
  return paliers[paliers.length - 1].taux;
}

// Montant personnel de base fédéral, réduit linéairement entre les deux seuils.
function montantPersonnelFederal(revenu: number, federal: ParametresFiscaux['federal']): number {
  if (revenu <= federal.seuilReductionDebut) return federal.montantPersonnelMax;
  if (revenu >= federal.seuilReductionFin) return federal.montantPersonnelMin;
  const proportion =
    (revenu - federal.seuilReductionDebut) / (federal.seuilReductionFin - federal.seuilReductionDebut);
  return federal.montantPersonnelMax - proportion * (federal.montantPersonnelMax - federal.montantPersonnelMin);
}

// --- Taxes à remettre ---

/**
 * La période de déclaration en cours selon la fréquence choisie (mensuelle, trimestrielle ou
 * annuelle) : le mois, le trimestre ou l'exercice complet qui contient la date donnée. Utilisée pour
 * afficher « à date » sur la bonne fenêtre, celle que Laurie doit vraiment remettre.
 */
export function periodeDeclarationCourante(reglages: ReglagesCompta, aujourdhui: Date): Periode {
  const exercice = exerciceContenant(reglages, aujourdhui);
  if (reglages.frequenceTaxes === 'annuelle') return exercice;
  const dateStr = iso(aujourdhui);
  const anneeExercice = new Date(exercice.debut).getUTCFullYear();
  const { trimestres, mois } = periodesDe(reglages, anneeExercice);
  const liste = reglages.frequenceTaxes === 'mensuelle' ? mois : trimestres;
  return liste.find((p) => dateStr >= p.debut && dateStr <= p.fin) || exercice;
}

export interface TaxesARemettre {
  percu: { tps: number; tvq: number };
  credits: { cti: number; rti: number };
  net: { tps: number; tvq: number; total: number };
  prochaineEcheance: { date: string; libelle: string };
}

// Prochaine échéance de déclaration selon la fréquence choisie. Mensuelle et trimestrielle : un mois
// après la fin de la période. Annuelle (le cas d'une personne en affaires) : production au 15 juin,
// mais le solde reste exigible au 30 avril, donc c'est cette date qui compte comme échéance de paiement.
function prochaineEcheanceTaxes(reglages: ReglagesCompta, periode: Periode): { date: string; libelle: string } {
  // periode.fin est une date calendaire ('AAAA-MM-JJ'), analysée en UTC minuit par le moteur JS :
  // les accesseurs doivent rester en UTC (getUTC*, Date.UTC), sinon un fuseau à l'ouest de l'UTC
  // (Québec, UTC-4/-5) recule d'un jour la date obtenue (bogue trouvé le 8 septembre, voir
  // scripts/verif-fiscal-cas.ts). Même convention que lib/compta/periodes.ts.
  const fin = new Date(periode.fin);
  if (reglages.frequenceTaxes === 'annuelle') {
    const anneeSuivante = fin.getUTCFullYear() + 1;
    return { date: `${anneeSuivante}-04-30`, libelle: 'Paiement du solde (déclaration due au 15 juin)' };
  }
  const echeance = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() + 1, fin.getUTCDate()));
  return { date: iso(echeance), libelle: 'Déclaration et paiement' };
}

export function taxesARemettre(
  transactions: Transaction[],
  reglages: ReglagesCompta,
  periode: Periode
): TaxesARemettre {
  let percuTps = 0;
  let percuTvq = 0;
  let ctiTps = 0;
  let rtiTvq = 0;
  for (const tr of transactions) {
    if (tr.date < periode.debut || tr.date > periode.fin) continue;
    if (tr.sens === 'revenu') {
      percuTps += tr.tps;
      percuTvq += tr.tvq;
    } else {
      ctiTps += tr.tps;
      rtiTvq += tr.tvq;
    }
  }
  const netTps = percuTps - ctiTps;
  const netTvq = percuTvq - rtiTvq;
  return {
    percu: { tps: percuTps, tvq: percuTvq },
    credits: { cti: ctiTps, rti: rtiTvq },
    net: { tps: netTps, tvq: netTvq, total: netTps + netTvq },
    prochaineEcheance: prochaineEcheanceTaxes(reglages, periode),
  };
}

export interface ProjectionTaxes {
  trojeune: boolean;
  joursEcoules: number;
  net: TaxesARemettre['net'];
  netProjete: TaxesARemettre['net'];
  prochaineEcheance: { date: string; libelle: string };
}

export function projectionTaxes(
  transactions: Transaction[],
  reglages: ReglagesCompta,
  aujourdhui: Date
): ProjectionTaxes {
  const exercice = exerciceContenant(reglages, aujourdhui);
  const debut = new Date(exercice.debut);
  const fin = new Date(exercice.fin);
  const periodeADate: Periode = { debut: exercice.debut, fin: iso(aujourdhui), libelle: 'Exercice à date' };
  const aDate = taxesARemettre(transactions, reglages, periodeADate);
  const joursEcoules = Math.max(1, Math.round((aujourdhui.getTime() - debut.getTime()) / 86400000) + 1);
  const joursExercice = Math.max(1, Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1);
  const trojeune = joursEcoules < 30;
  const facteur = trojeune ? 1 : joursExercice / joursEcoules;
  return {
    trojeune,
    joursEcoules,
    net: aDate.net,
    netProjete: {
      tps: Math.round(aDate.net.tps * facteur * 100) / 100,
      tvq: Math.round(aDate.net.tvq * facteur * 100) / 100,
      total: Math.round(aDate.net.total * facteur * 100) / 100,
    },
    prochaineEcheance: prochaineEcheanceTaxes(reglages, exercice),
  };
}

// --- Impôt estimé ---

export interface LigneImpot {
  libelle: string;
  montant: number;
}

export interface ImpotEstime {
  federal: number;
  quebec: number;
  rrq: number;
  rqap: number;
  total: number;
  tauxEffectif: number;
  tauxMarginal: number;
  detail: LigneImpot[];
}

// Calcul complet par paliers pour une travailleuse autonome du Québec, à partir d'un profit net
// (revenus moins dépenses). Traitement des cotisations RRQ/RQAP conforme à la ligne 248 de Revenu
// Québec (voir docs/FISCAL-2026.md) : moitié de la cotisation de base RRQ déductible du revenu,
// l'autre moitié créditée; les cotisations supplémentaires (bonification 2019) entièrement déductibles;
// le RQAP autonome (part employée seulement) entièrement crédité.
export function impotEstime(profitNet: number, params: ParametresFiscaux): ImpotEstime {
  const profit = Math.max(0, profitNet);

  const baseCotisable = Math.max(0, Math.min(profit, params.rrq.mga) - params.rrq.exemptionDeBase);
  const rrqBase = baseCotisable * params.rrq.tauxBase;
  const rrq1re = baseCotisable * params.rrq.tauxPremiereSupplementaire;
  const tranche2e = Math.max(0, Math.min(profit, params.rrq.mgaSupplementaire) - params.rrq.mga);
  const rrq2e = tranche2e * params.rrq.tauxDeuxiemeSupplementaire;
  const rrqTotal = rrqBase + rrq1re + rrq2e;

  const rqap = profit < params.rqap.seuilMinimal ? 0 : Math.min(profit, params.rqap.maxAssurable) * params.rqap.tauxAutonome;

  const deductionRRQ = rrqBase / 2 + rrq1re + rrq2e;
  const revenuImposable = Math.max(0, profit - deductionRRQ);
  const montantCreditRRQRQAP = rrqBase / 2 + rqap;

  const federalAvantCredits = impotSelonPaliers(revenuImposable, params.federal.paliers);
  const quebecAvantCredits = impotSelonPaliers(revenuImposable, params.quebec.paliers);

  const mpbFederal = montantPersonnelFederal(revenuImposable, params.federal);
  const creditFederal = (mpbFederal + montantCreditRRQRQAP) * params.federal.tauxCredit;
  const creditQuebec = (params.quebec.montantPersonnel + montantCreditRRQRQAP) * params.quebec.tauxCredit;

  const federalNetAvantAbattement = Math.max(0, federalAvantCredits - creditFederal);
  const abattement = federalNetAvantAbattement * params.quebec.abattement;
  const federalNet = federalNetAvantAbattement - abattement;
  const quebecNet = Math.max(0, quebecAvantCredits - creditQuebec);

  const total = federalNet + quebecNet + rrqTotal + rqap;
  const tauxEffectif = profit > 0 ? total / profit : 0;

  const tauxMarginalFederal = tauxMarginalSelonPaliers(revenuImposable, params.federal.paliers);
  const tauxMarginalQuebec = tauxMarginalSelonPaliers(revenuImposable, params.quebec.paliers);
  const tauxMarginal = tauxMarginalFederal * (1 - params.quebec.abattement) + tauxMarginalQuebec;

  const detail: LigneImpot[] = [
    { libelle: 'Profit net', montant: profit },
    { libelle: 'Cotisation RRQ (base + 1re supplémentaire)', montant: rrqBase + rrq1re },
    { libelle: 'Cotisation RRQ (2e supplémentaire)', montant: rrq2e },
    { libelle: 'Cotisation RQAP', montant: rqap },
    { libelle: 'Déduction de revenu (RRQ)', montant: -deductionRRQ },
    { libelle: 'Revenu imposable', montant: revenuImposable },
    { libelle: 'Impôt fédéral avant crédits', montant: federalAvantCredits },
    { libelle: 'Crédits non remboursables (fédéral)', montant: -creditFederal },
    { libelle: 'Abattement du Québec (16,5 %)', montant: -abattement },
    { libelle: 'Impôt fédéral net', montant: federalNet },
    { libelle: 'Impôt québécois avant crédits', montant: quebecAvantCredits },
    { libelle: 'Crédits non remboursables (Québec)', montant: -creditQuebec },
    { libelle: 'Impôt québécois net', montant: quebecNet },
  ];

  return { federal: federalNet, quebec: quebecNet, rrq: rrqTotal, rqap, total, tauxEffectif, tauxMarginal, detail };
}

export interface ProjectionImpot {
  trojeune: boolean;
  profitADate: number;
  profitProjete: number;
  impotADate: ImpotEstime;
  impotProjete: ImpotEstime;
  acomptesSuggeres: { date: string; montant: number }[];
}

// Profit net (revenus - dépenses, avant taxes) sur une période.
function profitPeriode(transactions: Transaction[], debut: string, fin: string): number {
  let revenus = 0;
  let depenses = 0;
  for (const tr of transactions) {
    if (tr.date < debut || tr.date > fin) continue;
    if (tr.sens === 'revenu') revenus += tr.montant;
    else depenses += tr.montant;
  }
  return revenus - depenses;
}

export function projectionImpot(
  transactions: Transaction[],
  reglages: ReglagesCompta,
  params: ParametresFiscaux,
  aujourdhui: Date
): ProjectionImpot {
  const exercice = exerciceContenant(reglages, aujourdhui);
  const debut = new Date(exercice.debut);
  const fin = new Date(exercice.fin);
  const profitADate = profitPeriode(transactions, exercice.debut, iso(aujourdhui));
  const joursEcoules = Math.max(1, Math.round((aujourdhui.getTime() - debut.getTime()) / 86400000) + 1);
  const joursExercice = Math.max(1, Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1);
  const trojeune = joursEcoules < 30;
  const profitProjete = trojeune ? profitADate : profitADate * (joursExercice / joursEcoules);

  const impotADate = impotEstime(profitADate, params);
  const impotProjete = impotEstime(profitProjete, params);

  const acomptesSuggeres: { date: string; montant: number }[] = [];
  const declenche =
    impotProjete.federal > params.acomptes.seuilFederal || impotProjete.quebec > params.acomptes.seuilQuebec;
  if (declenche && !trojeune) {
    const montantParVersement = Math.round(((impotProjete.federal + impotProjete.quebec) / 4) * 100) / 100;
    for (const md of params.acomptes.dates) {
      acomptesSuggeres.push({ date: `${params.annee}-${md}`, montant: montantParVersement });
    }
  }

  return { trojeune, profitADate, profitProjete, impotADate, impotProjete, acomptesSuggeres };
}
