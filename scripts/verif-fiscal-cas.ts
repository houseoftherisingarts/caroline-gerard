// Cas calculés à la main pour lib/compta/fiscal.ts, à partir des paliers 2026 lus dans
// lib/compta/fiscal-2026.ts (sources : docs/FISCAL-2026.md). Assertions simples (node:assert),
// tolérance d'arrondi explicite à chaque comparaison de montant.
//
// Se lance à travers esbuild (voir scripts/verif-fiscal.mjs, qui bundle ce fichier et l'exécute) :
// lib/compta/periodes.ts et lib/compta/fiscal-2026.ts importent lib/firestore.ts puis firebase.ts
// (config lue dans import.meta.env), donc --packages=external laisse react et firebase au vrai
// node_modules, et --define fournit un import.meta.env de secours (aucun appel Firestore n'a lieu
// dans les fonctions pures testées ici : useParametresFiscaux/useReglagesCompta ne sont pas testés).
import assert from 'node:assert/strict';
import { FISCAL_2026 } from '../lib/compta/fiscal-2026';
import { taxesARemettre, projectionTaxes, projectionImpot, impotEstime, periodeDeclarationCourante } from '../lib/compta/fiscal';
import type { Transaction, ReglagesCompta } from '../lib/compta/types';
import { REGLAGES_DEFAUT } from '../lib/compta/types';

let ok = 0;
const echecs: string[] = [];

function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) ok++;
  else echecs.push(detail ? `${nom} — ${detail}` : nom);
}

function proche(a: number, b: number, tolerance: number, nom: string) {
  verifie(nom, Math.abs(a - b) <= tolerance, `attendu ${b}, obtenu ${a} (écart ${(a - b).toFixed(4)}, tolérance ${tolerance})`);
}

function transactionRevenu(id: string, date: string, montant: number, tps: number, tvq: number): Transaction {
  return { id, date, description: 'Test', sens: 'revenu', montant, tps, tvq, total: montant + tps + tvq, compteId: 'rev-test', source: 'manuel', concilie: false, cree: null, modifie: null };
}
function transactionDepense(id: string, date: string, montant: number, tps: number, tvq: number): Transaction {
  return { id, date, description: 'Test', sens: 'depense', montant, tps, tvq, total: montant + tps + tvq, compteId: 'dep-test', source: 'manuel', concilie: false, cree: null, modifie: null };
}

// --- 1 à 6. impotEstime à six niveaux de profit (le contrat en demande au moins six) ---
// Chaque montant recalculé à la main par paliers, RRQ/RQAP, abattement et déduction (voir le
// détail de calcul dans le rapport rendu par ce script si un cas échoue).
{
  const cas: Array<{ profit: number; federal: number; quebec: number; rrq: number; rqap: number; total: number; tauxMarginal: number; tolerance: number }> = [
    { profit: 0, federal: 0, quebec: 0, rrq: 0, rqap: 0, total: 0, tauxMarginal: 0.2569, tolerance: 0.02 },
    { profit: 25000, federal: 660.25, quebec: 440.72, rrq: 2709.0, rqap: 191.0, total: 4000.97, tauxMarginal: 0.2569, tolerance: 0.02 },
    // RQAP non plafonné en dessous du maximum assurable (103 000 $) : 60 000 × 0,00764 = 458,40 $.
    { profit: 60000, federal: 4204.96, quebec: 4762.41, rrq: 7119.0, rqap: 458.4, total: 16544.77, tauxMarginal: 0.3069, tolerance: 0.02 },
    // RRQ plafonné dès que le profit dépasse le MGA supplémentaire (85 000 $) : 100 000 $ et 150 000 $
    // ci-dessous portent donc la même cotisation RRQ (9 790,60 $). Le RQAP, lui, ne plafonne qu'à
    // partir du maximum assurable (103 000 $) : 100 000 $ n'est pas encore plafonné (764 $),
    // 150 000 $ l'est (786,92 $, voir docs/FISCAL-2026.md, corrigé le 8 septembre : 786,92 $, pas 787,12 $).
    { profit: 100000, federal: 10457.23, quebec: 11850.71, rrq: 9790.6, rqap: 764.0, total: 32862.54, tauxMarginal: 0.3612, tolerance: 0.02 },
    { profit: 150000, federal: 20250.19, quebec: 23317.71, rrq: 9790.6, rqap: 786.92, total: 54145.42, tauxMarginal: 0.4746, tolerance: 0.02 },
    { profit: 250000, federal: 43680.77, quebec: 49067.71, rrq: 9790.6, rqap: 786.92, total: 103326.0, tauxMarginal: 0.49965, tolerance: 0.02 },
  ];
  for (const c of cas) {
    const r = impotEstime(c.profit, FISCAL_2026);
    const label = `impotEstime(${c.profit})`;
    proche(r.federal, c.federal, c.tolerance, `${label} fédéral`);
    proche(r.quebec, c.quebec, c.tolerance, `${label} Québec`);
    proche(r.rrq, c.rrq, 0.01, `${label} RRQ`);
    proche(r.rqap, c.rqap, 0.01, `${label} RQAP`);
    proche(r.total, c.total, c.tolerance, `${label} total`);
    proche(r.tauxMarginal, c.tauxMarginal, 0.001, `${label} taux marginal`);
    verifie(`${label} détail non vide`, r.detail.length > 0);
  }
  // Contrôle croisé des plafonds, deux seuils distincts : le RRQ plafonne dès que le profit dépasse
  // le MGA supplémentaire (85 000 $, donc 100k$ et 150k$ portent déjà la même cotisation RRQ); le
  // RQAP ne plafonne qu'au maximum assurable (103 000 $, donc 150k$ et 250k$ portent la même
  // cotisation RQAP, mais pas 100k$, encore en dessous).
  const r100 = impotEstime(100000, FISCAL_2026);
  const r150 = impotEstime(150000, FISCAL_2026);
  const r250 = impotEstime(250000, FISCAL_2026);
  proche(r100.rrq, r150.rrq, 0.001, 'RRQ déjà plafonné à 100k$ (identique à 150k$)');
  proche(r150.rqap, r250.rqap, 0.001, 'RQAP plafonné à 150k$ et 250k$ (maximum assurable atteint)');
  verifie('RQAP pas encore plafonné à 100k$', Math.abs(r100.rqap - r150.rqap) > 1, `${r100.rqap} vs ${r150.rqap}`);
}

// --- 7. Taxes à remettre sur un exercice de 12 mois, avec des CTI et des RTI ---
{
  const reglages: ReglagesCompta = { ...REGLAGES_DEFAUT, frequenceTaxes: 'trimestrielle' };
  const transactions: Transaction[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    transactions.push(transactionRevenu(`rev-${m}`, `2026-${mm}-10`, 1000, 50, 99.75));
    transactions.push(transactionDepense(`dep-${m}`, `2026-${mm}-15`, 200, 10, 19.95));
  }
  const periode = { debut: '2026-01-01', fin: '2026-12-31', libelle: 'Exercice 2026' };
  const r = taxesARemettre(transactions, reglages, periode);

  proche(r.percu.tps, 600, 0.01, 'exercice 12 mois : TPS perçue');
  proche(r.percu.tvq, 1197.0, 0.01, 'exercice 12 mois : TVQ perçue');
  proche(r.credits.cti, 120, 0.01, 'exercice 12 mois : CTI');
  proche(r.credits.rti, 239.4, 0.01, 'exercice 12 mois : RTI');
  proche(r.net.tps, 480, 0.01, 'exercice 12 mois : net TPS (perçue moins CTI)');
  proche(r.net.tvq, 957.6, 0.01, 'exercice 12 mois : net TVQ (perçue moins RTI)');
  proche(r.net.total, 1437.6, 0.01, 'exercice 12 mois : net total');
  verifie('exercice 12 mois : échéance un mois après la fin (trimestrielle)', r.prochaineEcheance.date === '2027-01-31', r.prochaineEcheance.date);

  // Même période, déclaration annuelle : le solde reste exigible au 30 avril de l'année suivante,
  // même si la production est due au 15 juin (voir docs/FISCAL-2026.md).
  const rAnnuelle = taxesARemettre(transactions, { ...reglages, frequenceTaxes: 'annuelle' }, periode);
  verifie('exercice 12 mois : échéance au 30 avril (annuelle)', rAnnuelle.prochaineEcheance.date === '2027-04-30', rAnnuelle.prochaineEcheance.date);
}

// --- 8. Projection au jour 90 sur un exercice de 365 jours ---
{
  const reglages: ReglagesCompta = { ...REGLAGES_DEFAUT, frequenceTaxes: 'trimestrielle' };
  const aujourdhui = new Date('2026-03-31T00:00:00Z'); // 90 jours écoulés depuis le 1er janvier 2026 (non bissextile, 365 jours)
  const transactions: Transaction[] = [];
  // 90 transactions, une par jour du 1er janvier au 31 mars : montants ronds pour que la mise à
  // l'échelle (365 / 90) tombe sur des chiffres exacts, faciles à vérifier à la main.
  const debut = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 90; i++) {
    const d = new Date(debut.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    transactions.push(transactionRevenu(`ex-${i}`, iso, 1000, 10, 20));
  }

  const projTaxes = projectionTaxes(transactions, reglages, aujourdhui);
  verifie('projection jour 90/365 : jours écoulés', projTaxes.joursEcoules === 90, String(projTaxes.joursEcoules));
  verifie('projection jour 90/365 : pas trop jeune', projTaxes.trojeune === false);
  proche(projTaxes.net.tps, 900, 0.01, 'projection jour 90/365 : net TPS à date');
  proche(projTaxes.net.tvq, 1800, 0.01, 'projection jour 90/365 : net TVQ à date');
  // Mise à l'échelle exacte : 900 * 365/90 = 3650, 1800 * 365/90 = 7300, 90000 * 365/90 = 365000.
  proche(projTaxes.netProjete.tps, 3650, 0.01, 'projection jour 90/365 : TPS projetée (900 × 365/90)');
  proche(projTaxes.netProjete.tvq, 7300, 0.01, 'projection jour 90/365 : TVQ projetée (1800 × 365/90)');
  proche(projTaxes.netProjete.total, 10950, 0.01, 'projection jour 90/365 : total projeté (2700 × 365/90)');

  const params = FISCAL_2026;
  const projImpot = projectionImpot(transactions, reglages, params, aujourdhui);
  proche(projImpot.profitADate, 90000, 0.01, 'projection jour 90/365 : profit à date (90 × 1000)');
  proche(projImpot.profitProjete, 365000, 0.01, 'projection jour 90/365 : profit projeté (1000 × 365)');
  verifie('projection jour 90/365 : pas trop jeune (impôt)', projImpot.trojeune === false);
  // Cohérence interne : l'impôt à date et projeté doit être exactement impotEstime() du même profit
  // (impotEstime lui-même déjà vérifié aux six niveaux ci-dessus, donc pas re-décortiqué ici).
  const attenduADate = impotEstime(90000, params);
  const attenduProjete = impotEstime(365000, params);
  proche(projImpot.impotADate.total, attenduADate.total, 0.01, 'projection jour 90/365 : impôt à date = impotEstime(90000)');
  proche(projImpot.impotProjete.total, attenduProjete.total, 0.01, 'projection jour 90/365 : impôt projeté = impotEstime(365000)');

  // À 365 000 $ projetés, l'impôt fédéral et québécois dépassent largement les seuils d'acomptes
  // (3 000 $ et 1 800 $) : quatre versements suggérés, qui se répartissent l'impôt en parts égales.
  verifie('projection jour 90/365 : quatre acomptes suggérés', projImpot.acomptesSuggeres.length === 4, String(projImpot.acomptesSuggeres.length));
  const sommeAcomptes = projImpot.acomptesSuggeres.reduce((s, a) => s + a.montant, 0);
  proche(sommeAcomptes, attenduProjete.federal + attenduProjete.quebec, 0.1, 'projection jour 90/365 : somme des acomptes = fédéral + Québec projetés');
  verifie(
    'projection jour 90/365 : dates des acomptes',
    projImpot.acomptesSuggeres.map((a) => a.date).join(',') === '2026-03-15,2026-06-15,2026-09-15,2026-12-15',
    projImpot.acomptesSuggeres.map((a) => a.date).join(',')
  );

  // Moins de 30 jours écoulés : la projection doit se déclarer trop jeune plutôt que d'extrapoler
  // un rythme fiable sur presque rien.
  const troisSemaines = new Date(Date.UTC(2026, 0, 20));
  const projJeune = projectionTaxes(transactions.slice(0, 20), reglages, troisSemaines);
  verifie('projection < 30 jours : se déclare trop jeune', projJeune.trojeune === true, String(projJeune.joursEcoules));
}

// --- 9. periodeDeclarationCourante suit la fréquence choisie ---
{
  const aujourdhui = new Date('2026-05-15T00:00:00Z');
  const mensuelle: ReglagesCompta = { ...REGLAGES_DEFAUT, frequenceTaxes: 'mensuelle' };
  const trimestrielle: ReglagesCompta = { ...REGLAGES_DEFAUT, frequenceTaxes: 'trimestrielle' };
  const annuelle: ReglagesCompta = { ...REGLAGES_DEFAUT, frequenceTaxes: 'annuelle' };
  const pMois = periodeDeclarationCourante(mensuelle, aujourdhui);
  const pTrim = periodeDeclarationCourante(trimestrielle, aujourdhui);
  const pAnnee = periodeDeclarationCourante(annuelle, aujourdhui);
  verifie('periodeDeclarationCourante : mensuelle = mai', pMois.debut === '2026-05-01' && pMois.fin === '2026-05-31', `${pMois.debut}..${pMois.fin}`);
  verifie('periodeDeclarationCourante : trimestrielle = T2', pTrim.debut === '2026-04-01' && pTrim.fin === '2026-06-30', `${pTrim.debut}..${pTrim.fin}`);
  verifie('periodeDeclarationCourante : annuelle = exercice complet', pAnnee.debut === '2026-01-01' && pAnnee.fin === '2026-12-31', `${pAnnee.debut}..${pAnnee.fin}`);
}

console.log(`${ok} vérifications passées, ${echecs.length} échec(s).`);
if (echecs.length > 0) {
  console.log('Échecs :');
  for (const e of echecs) console.log(`  - ${e}`);
  process.exitCode = 1;
}
