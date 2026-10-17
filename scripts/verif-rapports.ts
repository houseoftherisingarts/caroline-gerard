// Vérifications pures de lib/compta/rapports.ts : état des résultats (colonnes, filtrage des comptes
// inactifs, totaux), âge des comptes clients (quatre tranches, seules les factures Sent comptent) et
// export CSV (échappement virgule/guillemet). Assertions simples (node:assert), pas de framework.
//
// tsconfig.json n'est pas configuré pour l'exécution directe (moduleResolution: bundler, imports sans
// extension) : ce fichier se lance à travers esbuild, comme scripts/verif-compta.ts et
// scripts/verif-fiscal-cas.ts. lib/compta/rapports.ts importe lib/compta/periodes.ts, qui importe
// lib/firestore.ts puis firebase.ts (config lue dans import.meta.env) : --packages=external laisse
// react et firebase au vrai node_modules (lancer depuis la racine du dépôt), et --define fournit un
// import.meta.env de secours (aucun appel Firestore n'a lieu dans les fonctions testées ici).
//   npx esbuild scripts/verif-rapports.ts --bundle --platform=node --format=esm --packages=external \
//     --define:import.meta.env='{"VITE_FIREBASE_API_KEY":"test","VITE_FIREBASE_AUTH_DOMAIN":"test","VITE_FIREBASE_PROJECT_ID":"xena-test","VITE_FIREBASE_STORAGE_BUCKET":"test","VITE_FIREBASE_MESSAGING_SENDER_ID":"test","VITE_FIREBASE_APP_ID":"test","MODE":"verif"}' \
//     --outfile=.verif-rapports-tmp.mjs && node .verif-rapports-tmp.mjs; rm -f .verif-rapports-tmp.mjs
import assert from 'node:assert/strict';
import { etatDesResultats, depensesParCompte, ageDesComptesClients, exportCsv } from '../lib/compta/rapports';
import type { Compte, Transaction, Periode } from '../lib/compta/types';
import type { Document as DocumentFacture } from '../types';

let ok = 0;
const echecs: string[] = [];

function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) ok++;
  else echecs.push(detail ? `${nom} — ${detail}` : nom);
}

function tr(id: string, date: string, sens: 'revenu' | 'depense', compteId: string, montant: number): Transaction {
  return { id, date, description: `Test ${id}`, sens, montant, tps: 0, tvq: 0, total: montant, compteId, source: 'manuel', concilie: false, cree: null, modifie: null };
}

function proche(a: number, b: number, nom: string, tolerance = 0.01) {
  verifie(nom, Math.abs(a - b) <= tolerance, `attendu ${b}, obtenu ${a}`);
}

// --- 1. État des résultats : deux comptes de revenu, un compte de dépense, un compte inactif exclu ---
{
  const comptes: Compte[] = [
    { id: 'rev-a', code: '4000', nom: 'Accompagnement', nomEn: 'Coaching', sens: 'revenu', ordre: 10, actif: true },
    { id: 'rev-b', code: '4100', nom: 'Formation', nomEn: 'Training', sens: 'revenu', ordre: 20, actif: true },
    { id: 'rev-c', code: '4900', nom: 'Compte retiré', nomEn: 'Retired account', sens: 'revenu', ordre: 30, actif: false },
    { id: 'dep-a', code: '6000', nom: 'Logiciels', nomEn: 'Software', sens: 'depense', ordre: 100, actif: true },
  ];
  const transactions: Transaction[] = [
    tr('t1', '2026-01-05', 'revenu', 'rev-a', 1000),
    tr('t2', '2026-01-20', 'revenu', 'rev-b', 400),
    tr('t3', '2026-02-10', 'revenu', 'rev-a', 600),
    tr('t4', '2026-01-08', 'depense', 'dep-a', 80),
    tr('t5', '2026-02-08', 'depense', 'dep-a', 120),
    tr('t6', '2026-01-15', 'revenu', 'rev-c', 999), // compte inactif : ne doit apparaître nulle part
    tr('t7', '2025-12-31', 'revenu', 'rev-a', 5000), // hors période : ignorée
  ];
  const periode: Periode = { debut: '2026-01-01', fin: '2026-02-28', libelle: 'Test' };
  const etat = etatDesResultats(transactions, comptes, periode, 'mois');

  verifie('État : deux colonnes (janvier, février)', etat.colonnes.length === 2, `${etat.colonnes.length}`);
  verifie('État : deux lignes de revenu (compte inactif exclu)', etat.revenus.length === 2, `${etat.revenus.length}`);
  verifie('État : une ligne de dépense', etat.depenses.length === 1, `${etat.depenses.length}`);
  const revA = etat.revenus.find((l) => l.compte.id === 'rev-a')!;
  verifie('État : rev-a colonne janvier = 1000', revA.parColonne[0] === 1000, `${revA.parColonne[0]}`);
  verifie('État : rev-a colonne février = 600', revA.parColonne[1] === 600, `${revA.parColonne[1]}`);
  verifie('État : rev-a total = 1600 (2025 hors période exclu)', revA.total === 1600, `${revA.total}`);
  verifie('État : total des revenus = 2000', etat.totalRevenus === 2000, `${etat.totalRevenus}`);
  verifie('État : total des dépenses = 200', etat.totalDepenses === 200, `${etat.totalDepenses}`);
  verifie('État : profit = 1800', etat.profit === 1800, `${etat.profit}`);
  verifie('État : profit par colonne janvier = 1320', etat.profitParColonne[0] === 1320, `${etat.profitParColonne[0]}`);

  // --- Dépenses par compte, sur la même période : une seule ligne, part = 100 % ---
  const repartition = depensesParCompte(transactions, comptes, periode);
  verifie('Dépenses par compte : une ligne', repartition.length === 1, `${repartition.length}`);
  verifie('Dépenses par compte : montant = 200', repartition[0]?.montant === 200, `${repartition[0]?.montant}`);
  verifie('Dépenses par compte : part = 100 %', repartition[0]?.part === 1, `${repartition[0]?.part}`);
}

// --- 2. Âge des comptes clients : quatre tranches, seules les factures Invoice+Sent comptent ---
{
  const aujourdhui = new Date('2026-09-08T12:00:00Z');
  const facture = (id: string, joursDepasses: number, montant: number, status: DocumentFacture['status'] = 'Sent'): DocumentFacture => ({
    id, number: id, type: 'Invoice', clientId: id, clientName: id, clientEmail: 'test@example.com',
    date: '2026-08-01', dueDate: new Date(aujourdhui.getTime() - joursDepasses * 86400000).toISOString().slice(0, 10),
    items: [{ id: '1', description: 'Service', quantity: 1, price: montant }], status, terms: '',
  });
  const documents: DocumentFacture[] = [
    facture('f1', 10, 100), // 0-30
    facture('f2', 45, 200), // 31-60
    facture('f3', 75, 300), // 61-90
    facture('f4', 120, 400), // 90+
    facture('f5', 5, 999, 'Paid'), // payée : ne compte pas
    { id: 'q1', number: 'q1', type: 'Quote', clientId: 'q1', clientName: 'q1', clientEmail: 'x', date: '2026-08-01', items: [{ id: '1', description: '', quantity: 1, price: 1000 }], status: 'Sent', terms: '' }, // devis : pas une facture
  ];
  const age = ageDesComptesClients(documents, aujourdhui);
  // totalDocumentTTC applique les taxes (14,975 %, voir lib/compta/rapports.ts) : les montants
  // avant taxes (100, 200, 300, 400) ressortent multipliés par 1,14975.
  proche(age.tranches[0].montant, 114.975, 'Âge : tranche 0-30 = 100$ TTC');
  proche(age.tranches[1].montant, 229.95, 'Âge : tranche 31-60 = 200$ TTC');
  proche(age.tranches[2].montant, 344.925, 'Âge : tranche 61-90 = 300$ TTC');
  proche(age.tranches[3].montant, 459.9, 'Âge : tranche 90+ = 400$ TTC');
  proche(age.total, 1149.75, 'Âge : total = 1000$ TTC (payée et devis exclus)');
  verifie('Âge : 4 factures comptées', age.nombreTotal === 4, `${age.nombreTotal}`);
}

// --- 3. Export CSV : en-tête, échappement virgule et guillemet ---
{
  const csv = exportCsv([
    { Compte: 'Accompagnement', Montant: 1000 },
    { Compte: 'Client "Le Fil Rouge", inc.', Montant: 400.5 },
  ]);
  const lignes = csv.split('\n');
  verifie('CSV : en-tête', lignes[0] === 'Compte,Montant', lignes[0]);
  verifie('CSV : ligne simple', lignes[1] === 'Accompagnement,1000', lignes[1]);
  verifie('CSV : virgule et guillemet échappés', lignes[2] === '"Client ""Le Fil Rouge"", inc.",400.5', lignes[2]);
  verifie('CSV vide : chaîne vide', exportCsv([]) === '', 'non vide');
}

console.log(`${ok} vérification${ok > 1 ? 's' : ''} passée${ok > 1 ? 's' : ''}.`);
if (echecs.length > 0) {
  console.log(`${echecs.length} échec${echecs.length > 1 ? 's' : ''} :`);
  for (const e of echecs) console.log(`- ${e}`);
  process.exitCode = 1;
}
