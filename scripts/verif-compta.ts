// Vérifications du cœur comptable (lib/compta/) : parseur CSV sur trois formats réels de banques
// québécoises, parseur OFX, empreinte de dédoublonnage, split des taxes, idempotence de
// transactionsDepuisFactures. Assertions simples (node:assert), pas de framework.
//
// Lancement : node scripts/verif-compta-run.mjs (bouchonne firebase.ts, dont initializeAuth plante sous Node 24).
// Ancienne commande esbuild directe, gardée pour mémoire :
// tsconfig.json n'est pas configuré pour l'exécution directe (moduleResolution: bundler, imports
// sans extension) : ce fichier se lance à travers esbuild, qui résout les imports TypeScript comme
// Vite le fait pour le reste du projet. lib/compta/transactions.ts importe lib/firestore.ts, donc
// firebase.ts (config Firebase lue dans import.meta.env) : --packages=external laisse react et
// firebase au vrai node_modules (à lancer depuis la racine du dépôt, jamais /tmp), et --define
// fournit un import.meta.env de secours (aucun appel Firestore n'a lieu dans les fonctions testées).
//   npx esbuild scripts/verif-compta.ts --bundle --platform=node --format=esm --packages=external \
//     --define:import.meta.env='{"VITE_FIREBASE_API_KEY":"test","VITE_FIREBASE_AUTH_DOMAIN":"test","VITE_FIREBASE_PROJECT_ID":"xena-test","VITE_FIREBASE_STORAGE_BUCKET":"test","VITE_FIREBASE_MESSAGING_SENDER_ID":"test","VITE_FIREBASE_APP_ID":"test","MODE":"verif"}' \
//     --outfile=.verif-compta-tmp.mjs && node .verif-compta-tmp.mjs; rm -f .verif-compta-tmp.mjs
import assert from 'node:assert/strict';
import { apercuCsv, parseOfx, lignesDepuisApercu, empreinte, calculerTaxes, parseDateSouple } from '../lib/compta/import';
import { transactionsDepuisFactures } from '../lib/compta/transactions';
import type { Document as DocumentFacture } from '../types';
import { calculerRecurrences, dateSuivante } from '../lib/compta/recurrence';
import { depensesRefacturables } from '../lib/compta/refacturation';
import { csvsDuPaquet, nomRecu } from '../lib/compta/paquet';
import { PLAN_COMPTABLE_DEFAUT } from '../lib/compta/plan-defaut';
import { REGLAGES_DEFAUT } from '../lib/compta/types';
import type { Recurrence, Transaction } from '../lib/compta/types';

let ok = 0;
const echecs: string[] = [];

function verifie(nom: string, condition: boolean, detail?: string) {
  if (condition) {
    ok++;
  } else {
    echecs.push(detail ? `${nom} — ${detail}` : nom);
  }
}

// --- 1. CSV Desjardins (point-virgule, en-tête française, montants avec virgule décimale) ---
{
  const csv = [
    'Date;Description;Débit;Crédit',
    '2026-01-05;Paiement Bell Mobilité;65,00;',
    '2026-01-08;Dépôt Facture 1042 Compagnie de danse Fil Rouge;;500,00',
    '2026-01-12;Frais mensuels;6,95;',
  ].join('\n');
  const apercu = apercuCsv(csv);
  verifie('Desjardins : en-tête reconnue', apercu.colonnes.join('|') === ['Date', 'Description', 'Débit', 'Crédit'].join('|'), apercu.colonnes.join('|'));
  verifie('Desjardins : 3 lignes détectées', apercu.lignes.length === 3, `${apercu.lignes.length}`);
  verifie('Desjardins : colonne date détectée', apercu.detection.date === 0);
  verifie('Desjardins : colonne débit détectée', apercu.detection.debit === 2);
  verifie('Desjardins : colonne crédit détectée', apercu.detection.credit === 3);
  const lignes = lignesDepuisApercu(apercu, apercu.detection);
  verifie('Desjardins : 3 lignes normalisées', lignes.length === 3, `${lignes.length}`);
  verifie('Desjardins : débit devient négatif', lignes[0].montant === -65, `${lignes[0].montant}`);
  verifie('Desjardins : crédit reste positif', lignes[1].montant === 500, `${lignes[1].montant}`);
  verifie('Desjardins : virgule décimale lue', lignes[2].montant === -6.95, `${lignes[2].montant}`);
  verifie('Desjardins : date ISO conservée', lignes[0].date === '2026-01-05', lignes[0].date);
}

// --- 2. CSV RBC (virgule, en-tête anglaise, montant déjà signé dans CAD$, dates MM/JJ/AAAA) ---
{
  const csv = [
    'Account Type,Transaction Date,Description 1,CAD$',
    'Chequing,01/05/2026,ADOBE SYSTEMS,-32.99',
    'Chequing,01/08/2026,DEPOSIT CLIENT ABC,500.00',
  ].join('\n');
  const apercu = apercuCsv(csv);
  verifie('RBC : colonne montant détectée (CAD$)', apercu.detection.montant === 3, `${apercu.detection.montant}`);
  verifie('RBC : colonne description détectée', apercu.detection.description === 2);
  const lignes = lignesDepuisApercu(apercu, apercu.detection);
  verifie('RBC : 2 lignes normalisées', lignes.length === 2, `${lignes.length}`);
  verifie('RBC : montant négatif lu tel quel', lignes[0].montant === -32.99, `${lignes[0].montant}`);
  verifie('RBC : date MM/JJ/AAAA convertie', lignes[0].date === '2026-01-05', lignes[0].date);
}

// --- 3. CSV BNC (sans en-tête : la détection ne devine rien, Laurie choisit les colonnes elle-même) ---
{
  const csv = ['2026-02-13,Retrait guichet,60.00,,', '2026-02-14,Virement reçu,,220.00,'].join('\n');
  const apercu = apercuCsv(csv);
  verifie('BNC : aucune en-tête, colonnes nommées par défaut', apercu.colonnes[0] === 'Colonne 1', apercu.colonnes[0]);
  verifie('BNC : aucune ligne perdue (2 lignes de données)', apercu.lignes.length === 2, `${apercu.lignes.length}`);
  verifie('BNC : détection automatique ne devine rien sans en-tête', apercu.detection.date === -1 && apercu.detection.montant === -1);
  // Laurie choisit les colonnes à la main dans Import.tsx : on simule son choix.
  const lignes = lignesDepuisApercu(apercu, { date: 0, description: 1, debit: 2, credit: 3, montant: -1 });
  verifie('BNC : après choix manuel, débit et crédit combinés correctement', lignes[0].montant === -60 && lignes[1].montant === 220, `${lignes[0].montant} / ${lignes[1].montant}`);
}

// --- 4. Format de date ambigu : le mois > 12 révèle un JJ/MM/AAAA plutôt qu'un MM/JJ/AAAA ---
{
  verifie('Date 13/02/2026 (JJ/MM, le 13 ne peut pas être un mois)', parseDateSouple('13/02/2026') === '2026-02-13', parseDateSouple('13/02/2026') ?? 'null');
  verifie('Date 02/13/2026 (même date, ordre inverse)', parseDateSouple('02/13/2026') === '2026-02-13', parseDateSouple('02/13/2026') ?? 'null');
}

// --- 5. OFX/QFX (balises SGML sans fermeture systématique) ---
{
  const ofx = `
OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260305120000[-5:EST]
<TRNAMT>-42.50
<NAME>STRIPE
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260308
<TRNAMT>350.00
<MEMO>Facture Studio Ancrage
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTRNRS></BANKMSGSRSV1></OFX>`.trim();
  const lignes = parseOfx(ofx);
  verifie('OFX : 2 transactions extraites', lignes.length === 2, `${lignes.length}`);
  verifie('OFX : date avec heure et fuseau tronquée à AAAA-MM-JJ', lignes[0].date === '2026-03-05', lignes[0].date);
  verifie('OFX : montant négatif (débit)', lignes[0].montant === -42.5, `${lignes[0].montant}`);
  verifie('OFX : NAME utilisé comme description', lignes[0].description === 'STRIPE', lignes[0].description);
  verifie('OFX : MEMO en secours si NAME absent', lignes[1].description === 'Facture Studio Ancrage', lignes[1].description);
  verifie('OFX : montant positif (crédit)', lignes[1].montant === 350, `${lignes[1].montant}`);
}

// --- 6. Empreinte de dédoublonnage : stable, insensible à la casse, tronquée à 60 caractères de description ---
{
  const a = { date: '2026-03-05', description: 'Stripe', montant: -42.5 };
  const b = { date: '2026-03-05', description: 'STRIPE  ', montant: -42.5 };
  const c = { date: '2026-03-05', description: 'Stripe', montant: -42.51 };
  verifie('Empreinte : insensible à la casse et aux espaces', empreinte(a) === empreinte(b), `${empreinte(a)} / ${empreinte(b)}`);
  verifie('Empreinte : un cent d\'écart change l\'empreinte', empreinte(a) !== empreinte(c));
}

// --- 7. Split des taxes : l'exemple exact de la mission (100 $ total, TPS 5 %, TVQ 9,975 %) ---
{
  const split = calculerTaxes(100, { depuisTotal: true });
  // Convention d'arrondi : chaque composante est arrondie indépendamment au cent (voir format.ts,
  // arrondiSous) ; leur somme peut s'écarter d'un cent du total d'origine, qui reste la valeur de
  // référence (celle du relevé bancaire). Ici : 86,98 + 4,35 + 8,68 = 100,01, un cent au-dessus des
  // 100 $ d'origine — écart attendu et sans conséquence, le total inscrit prime.
  verifie('Split 100 $ : montant avant taxes = 86,98 $', split.montant === 86.98, `${split.montant}`);
  verifie('Split 100 $ : TPS = 4,35 $', split.tps === 4.35, `${split.tps}`);
  verifie('Split 100 $ : TVQ = 8,68 $', split.tvq === 8.68, `${split.tvq}`);
  verifie('Split 100 $ : total conservé = 100 $', split.total === 100, `${split.total}`);

  const sansTaxes = calculerTaxes(50, { sansTaxes: true });
  verifie('Split « sans taxes » : TPS et TVQ à zéro', sansTaxes.tps === 0 && sansTaxes.tvq === 0 && sansTaxes.montant === 50);

  const depuisAvantTaxes = calculerTaxes(86.98);
  verifie('Split depuis un montant déjà avant taxes : total ≈ 100 $', Math.abs(depuisAvantTaxes.total - 100) < 0.02, `${depuisAvantTaxes.total}`);
}

// --- 8. Idempotence de transactionsDepuisFactures : deux passes sur les mêmes factures ne dupliquent rien ---
{
  const facture = (partiel: Partial<DocumentFacture>): DocumentFacture => ({
    id: '', number: '', type: 'Invoice', clientId: '', clientName: '', clientEmail: '', date: '', items: [], status: 'Paid', terms: '', ...partiel,
  });
  const poste = (price: number, quantity = 1) => ({ id: 'i1', description: 'Prestation', quantity, price });
  const documents: DocumentFacture[] = [
    facture({ id: 'fact-1', date: '2026-02-01', number: 'F-001', clientName: 'Studio Ancrage', items: [poste(500)] }),
    facture({ id: 'fact-2', date: '2026-02-05', number: 'F-002', clientName: 'Marie-Ève Boutin', status: 'Sent', items: [poste(100, 2)] }),
    facture({ id: 'fact-3', date: '2026-02-10', number: 'F-003', clientName: 'Festival des Cimes', items: [poste(900)] }),
  ];
  const premierePasse = transactionsDepuisFactures(documents);
  verifie('Idempotence : seules les factures payées sont dérivées (2 sur 3)', premierePasse.length === 2, `${premierePasse.length}`);
  verifie('Idempotence : identifiant stable facture_<id>', premierePasse[0].id === 'facture_fact-1', premierePasse[0].id);

  const transactionsExistantes = premierePasse.map((p) => ({ ...p, cree: null, modifie: null }) as Transaction);
  const deuxiemePasse = transactionsDepuisFactures(documents);
  verifie('Idempotence : la deuxième passe reproduit les mêmes identifiants (rien de nouveau à écrire)', deuxiemePasse.every((d) => transactionsExistantes.some((t) => t.id === d.id)));
  verifie('Idempotence : toujours 2 candidates, jamais plus (pas de doublon créé)', deuxiemePasse.length === 2, `${deuxiemePasse.length}`);
  verifie('Idempotence : le montant avant taxes vient des items (500 $)', premierePasse[0].montant === 500, `${premierePasse[0].montant}`);
}


// --- 9. Dépenses récurrentes : pures, idempotentes, bornées par la date de fin ---
{
  const modele = (r: Partial<Recurrence>, partiel: Partial<Transaction> = {}): Transaction => ({
    id: 'm1', date: '2026-01-02', description: 'Hébergement du site', sens: 'depense', montant: 29, tps: 1.45, tvq: 2.89, total: 33.34,
    compteId: 'dep-logiciels', tiers: 'Hébergeur Nord', source: 'import', concilie: true, cree: null, modifie: null,
    recurrence: { frequence: 'mensuelle', prochaine: '2026-09-15', actif: true, generees: [], ...r }, ...partiel,
  });
  const AUJ = '2026-10-16';

  // une période passée
  let c = calculerRecurrences([modele({ prochaine: '2026-10-01' })], AUJ);
  verifie('Récurrence : une période passée crée une dépense', c.nouvelles.length === 1, `${c.nouvelles.length}`);
  verifie('Récurrence : date due, identifiant stable', c.nouvelles[0].data.date === '2026-10-01' && c.nouvelles[0].id === 'rec_m1_2026-10-01', c.nouvelles[0].id);
  verifie('Récurrence : copie description, compte, tiers, montants, taxes', c.nouvelles[0].data.description === 'Hébergement du site' && c.nouvelles[0].data.compteId === 'dep-logiciels' && c.nouvelles[0].data.tiers === 'Hébergeur Nord' && c.nouvelles[0].data.montant === 29 && c.nouvelles[0].data.tps === 1.45 && c.nouvelles[0].data.tvq === 2.89 && c.nouvelles[0].data.total === 33.34);
  verifie('Récurrence : source manuel, non conciliée, sans récurrence', c.nouvelles[0].data.source === 'manuel' && c.nouvelles[0].data.concilie === false && !('recurrence' in c.nouvelles[0].data));
  verifie('Récurrence : le modèle avance d\'une période et note la date', c.modeles[0].recurrence.prochaine === '2026-11-01' && c.modeles[0].recurrence.generees.join() === '2026-10-01', JSON.stringify(c.modeles[0]));

  // trois périodes passées (15 sept, 15 oct = 2 ; 15 août, 15 sept, 15 oct = 3)
  c = calculerRecurrences([modele({ prochaine: '2026-08-15' })], AUJ);
  verifie('Récurrence : trois périodes passées créent trois dépenses', c.nouvelles.map((n) => n.data.date).join() === '2026-08-15,2026-09-15,2026-10-15', c.nouvelles.map((n) => n.data.date).join());
  verifie('Récurrence : la prochaine date est dans le futur', c.modeles[0].recurrence.prochaine === '2026-11-15', c.modeles[0].recurrence.prochaine);

  // fin atteinte
  c = calculerRecurrences([modele({ prochaine: '2026-08-15', fin: '2026-09-20' })], AUJ);
  verifie('Récurrence : s\'arrête à la date de fin (2 sur 3)', c.nouvelles.length === 2, `${c.nouvelles.length}`);
  verifie('Récurrence : le modèle devient inactif après la fin', c.modeles[0].recurrence.actif === false);

  // inactif
  c = calculerRecurrences([modele({ prochaine: '2026-08-15', actif: false })], AUJ);
  verifie('Récurrence : un modèle inactif ne génère rien et ne bouge pas', c.nouvelles.length === 0 && c.modeles.length === 0);

  // déjà générée
  c = calculerRecurrences([modele({ prochaine: '2026-10-01', generees: ['2026-10-01'] })], AUJ);
  verifie('Récurrence : une date déjà générée n\'est pas recréée', c.nouvelles.length === 0, `${c.nouvelles.length}`);
  verifie('Récurrence : mais le modèle avance quand même', c.modeles[0]?.recurrence.prochaine === '2026-11-01', c.modeles[0]?.recurrence.prochaine);

  // futur, revenu, deuxième passe
  verifie('Récurrence : une date future ne génère rien', calculerRecurrences([modele({ prochaine: '2026-10-17' })], AUJ).nouvelles.length === 0);
  verifie('Récurrence : un revenu n\'est jamais un modèle', calculerRecurrences([modele({ prochaine: '2026-10-01' }, { sens: 'revenu' })], AUJ).nouvelles.length === 0);
  const apres = { ...modele({ prochaine: '2026-08-15' }), recurrence: calculerRecurrences([modele({ prochaine: '2026-08-15' })], AUJ).modeles[0].recurrence };
  verifie('Récurrence : deuxième passe sur le modèle mis à jour, rien de nouveau', calculerRecurrences([apres], AUJ).nouvelles.length === 0);

  // calendrier
  verifie('Période : hebdomadaire = +7 jours', dateSuivante('2026-10-16', 'hebdomadaire') === '2026-10-23');
  verifie('Période : mensuelle le 31 janvier replie sur le 28 février', dateSuivante('2026-01-31', 'mensuelle') === '2026-02-28', dateSuivante('2026-01-31', 'mensuelle'));
  verifie('Période : annuelle le 29 février 2028 replie sur le 28 février 2029', dateSuivante('2028-02-29', 'annuelle') === '2029-02-28', dateSuivante('2028-02-29', 'annuelle'));
  verifie('Période : mensuelle décembre passe à janvier', dateSuivante('2026-12-10', 'mensuelle') === '2027-01-10');
}

// --- 10. depensesRefacturables : dépenses cochées, pas encore refacturées, filtrables par client ---
{
  const dep = (id: string, partiel: Partial<Transaction>): Transaction => ({
    id, date: '2026-09-01', description: id, sens: 'depense', montant: 10, tps: 0, tvq: 0, total: 10, compteId: 'dep-fournitures',
    source: 'manuel', concilie: false, cree: null, modifie: null, ...partiel,
  });
  const liste = [
    dep('a', { refacturable: true, refactureA: 'Studio Ancrage' }),
    dep('b', { refacturable: true, tiers: 'Studio Ancrage' }),
    dep('c', { refacturable: true, refactureA: 'Studio Ancrage', refactureeDans: 'FAC-1' }),
    dep('d', { refacturable: false, refactureA: 'Studio Ancrage' }),
    dep('e', { refacturable: true, refactureA: 'Autre client' }),
    dep('f', { sens: 'revenu', refacturable: true, refactureA: 'Studio Ancrage' }),
  ];
  verifie('Refacturables : toutes les dépenses cochées non refacturées (a, b, e)', depensesRefacturables(liste).map((t) => t.id).join() === 'a,b,e', depensesRefacturables(liste).map((t) => t.id).join());
  verifie('Refacturables : par client, casse et espaces ignorés, tiers en secours (a, b)', depensesRefacturables(liste, '  studio ancrage ').map((t) => t.id).join() === 'a,b');
  verifie('Refacturables : une dépense déjà refacturée sort de la liste', !depensesRefacturables(liste).some((t) => t.id === 'c'));
  verifie('Refacturables : un revenu n\'y entre jamais', !depensesRefacturables(liste).some((t) => t.id === 'f'));
  verifie('Refacturables : client inconnu, liste vide', depensesRefacturables(liste, 'Personne').length === 0);
}

// --- 11. Paquet pour le comptable : les cinq CSV, le LISEZ-MOI et le nom des reçus ---
{
  const tx = (id: string, date: string, partiel: Partial<Transaction> = {}): Transaction => ({
    id, date, description: `Tx, ${id}`, sens: 'depense', montant: 100, tps: 5, tvq: 9.98, total: 114.98, compteId: 'dep-fournitures',
    tiers: 'Papeterie "Ancrage"', source: 'manuel', concilie: true, cree: null, modifie: null, ...partiel,
  });
  const exercice = { debut: '2026-01-01', fin: '2026-12-31', libelle: 'Exercice 2026' };
  const transactions = [
    tx('t1', '2026-03-05', { recu: { chemin: 'r/a', url: 'http://x/a.jpg', nom: 'facture a.jpg', contentType: 'image/jpeg', taille: 1 } }),
    tx('t2', '2026-04-10', { sens: 'revenu', compteId: 'rev-formation' }),
    tx('t3', '2025-12-31'),
  ];
  const f = csvsDuPaquet({ transactions, comptes: PLAN_COMPTABLE_DEFAUT, tiers: [{ id: 'x', nom: 'Studio Ancrage', type: 'client' }], reglages: REGLAGES_DEFAUT, exercice, lang: 'FR' });
  const texte = (nom: string) => new TextDecoder().decode(f.find((x) => x.nom === nom)?.data || new Uint8Array());
  verifie('Paquet : les six fichiers de tête', ['LISEZ-MOI.txt', 'transactions.csv', 'etat-des-resultats.csv', 'taxes.csv', 'plan-comptable.csv', 'tiers.csv'].every((n) => f.some((x) => x.nom === n)), f.map((x) => x.nom).join());
  verifie('Paquet : transactions.csv garde 2 lignes de l\'exercice (pas celle de 2025)', texte('transactions.csv').trim().split('\n').length === 3, `${texte('transactions.csv').trim().split('\n').length}`);
  verifie('Paquet : transactions.csv échappe virgules et guillemets, reçu oui/non', texte('transactions.csv').includes('"Tx, t1"') && texte('transactions.csv').includes('"Papeterie ""Ancrage"""') && texte('transactions.csv').includes(',oui,') && texte('transactions.csv').includes(',non,'));
  verifie('Paquet : code et nom du compte présents', texte('transactions.csv').includes('Code du compte') && texte('transactions.csv').includes(PLAN_COMPTABLE_DEFAUT.find((c) => c.id === 'dep-fournitures')!.code));
  verifie('Paquet : taxes.csv a 4 périodes trimestrielles', texte('taxes.csv').trim().split('\n').length === 5, `${texte('taxes.csv').trim().split('\n').length}`);
  verifie('Paquet : tiers.csv et plan-comptable.csv remplis', texte('tiers.csv').includes('Studio Ancrage') && texte('plan-comptable.csv').trim().split('\n').length === PLAN_COMPTABLE_DEFAUT.length + 1);
  verifie('Paquet : LISEZ-MOI en trois phrases', texte('LISEZ-MOI.txt').trim().split('\n').length === 3);
  verifie('Paquet : nom de reçu = date_identifiant_nom, sans espace', nomRecu(transactions[0]) === 'recus/2026-03-05_t1_facture_a.jpg', nomRecu(transactions[0]));
}

console.log(`${ok} vérifications passées.`);
if (echecs.length) {
  console.log(`${echecs.length} échec(s) :`);
  for (const e of echecs) console.log(`  ❌ ${e}`);
  process.exit(1);
} else {
  console.log('Tout passe.');
}
