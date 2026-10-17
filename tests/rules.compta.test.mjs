// Tests des règles du module compta (_vexel-base/modules/compta) : factures, miroir public, grand livre,
// tiers, réglages de facturation, pièces jointes et reçus. Ils lisent firestore.rules et storage.rules du
// site, une fois les blocs du module fusionnés. Lancé via :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec --only firestore,storage --project <projet> "node tests/rules.compta.test.mjs"
// ADMIN_UID donne l'uid d'un compte admin de la liste isAdmin() du site (par défaut, celui d'Alex sur Xena).
// Sans storage dans --only, le volet Storage est sauté.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

const UID_A = 'user-a';
const ADMIN_UID = process.env.ADMIN_UID || 'O5qf5A3WdfV7daxkBKOIt0RnBUD2';
const hote = (variable, defaut) => {
  const [host, port] = (process.env[variable] || defaut).split(':');
  return { host, port: Number(port) };
};

let ok = 0;
let fail = 0;
const resultats = [];

async function verifie(nom, promesse) {
  try {
    await promesse;
    resultats.push(`✅ ${nom}`);
    ok++;
  } catch (e) {
    resultats.push(`❌ ${nom}\n   ${e.message.split('\n')[0]}`);
    fail++;
  }
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-compta',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), ...hote('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080') },
    ...(process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ? { storage: { rules: readFileSync('storage.rules', 'utf8'), ...hote('FIREBASE_STORAGE_EMULATOR_HOST', '127.0.0.1:9199') } }
      : {}),
  });

  const dbA = testEnv.authenticatedContext(UID_A).firestore();
  const dbAdmin = testEnv.authenticatedContext(ADMIN_UID).firestore();
  const dbAnon = testEnv.unauthenticatedContext().firestore();

  // 1. Module comptable (lib/compta/) : transactions et tiers, admin seulement, comme clients/documents.
  await verifie("L'admin lit les transactions (ok)", assertSucceeds(getDocs(collection(dbAdmin, 'transactions'))));
  await verifie("L'admin écrit une transaction (ok)", assertSucceeds(setDoc(doc(dbAdmin, 'transactions', 'tr-admin'), { date: '2026-09-01', description: 'Test', sens: 'depense', montant: 10, tps: 0.5, tvq: 1, total: 11.5, compteId: 'dep-fournitures', source: 'manuel', concilie: false })));
  await verifie('un client connecté lit les transactions (refus attendu)', assertFails(getDocs(collection(dbA, 'transactions'))));
  await verifie('un client connecté écrit une transaction (refus attendu)', assertFails(setDoc(doc(dbA, 'transactions', 'tr-intrus'), { montant: 1 })));
  await verifie('un anonyme lit les transactions (refus attendu)', assertFails(getDocs(collection(dbAnon, 'transactions'))));
  await verifie('un anonyme écrit une transaction (refus attendu)', assertFails(setDoc(doc(dbAnon, 'transactions', 'tr-anon'), { montant: 1 })));
  await verifie("L'admin lit les tiers (ok)", assertSucceeds(getDocs(collection(dbAdmin, 'tiers'))));
  await verifie("L'admin écrit un tiers (ok)", assertSucceeds(setDoc(doc(dbAdmin, 'tiers', 'tier-admin'), { nom: 'Fournisseur test', type: 'fournisseur' })));
  await verifie('un client connecté lit les tiers (refus attendu)', assertFails(getDocs(collection(dbA, 'tiers'))));
  await verifie('un client connecté écrit un tiers (refus attendu)', assertFails(setDoc(doc(dbA, 'tiers', 'tier-intrus'), { nom: 'x', type: 'client' })));
  await verifie('un anonyme lit les tiers (refus attendu)', assertFails(getDocs(collection(dbAnon, 'tiers'))));

  // 2. Factures (pages/AdminInvoices.tsx) : documents admin seulement; le miroir factures_publiques se lit
  // par son jeton, ne se liste pas, ne s'écrit que par l'admin et ne porte que les champs de la page publique.
  const factureTest = { type: 'Invoice', number: 'FAC-2026-0001', clientName: 'Client test', clientEmail: 'c@example.com', date: '2026-10-01', dueDate: '2026-10-31', items: [], status: 'Sent', terms: '', paiements: [{ id: 'p1', date: '2026-10-02', montant: 100, mode: 'virement', note: 'privée' }] };
  await verifie("L'admin écrit une facture (ok)", assertSucceeds(setDoc(doc(dbAdmin, 'documents', 'fac-1'), factureTest)));
  await verifie("L'admin lit les factures (ok)", assertSucceeds(getDocs(collection(dbAdmin, 'documents'))));
  await verifie('un client connecté lit une facture (refus attendu)', assertFails(getDoc(doc(dbA, 'documents', 'fac-1'))));
  await verifie('un client connecté écrit une facture (refus attendu)', assertFails(setDoc(doc(dbA, 'documents', 'fac-intrus'), factureTest)));
  await verifie('un anonyme liste les factures (refus attendu)', assertFails(getDocs(collection(dbAnon, 'documents'))));
  const miroirTest = {
    documentId: 'fac-1', numero: 'FAC-2026-0001', type: 'Invoice', date: '2026-10-01', dueDate: '2026-10-31',
    clientName: 'Client test', clientEmail: 'c@example.com', items: [], totaux: { sousTotal: 0, remise: 0, tps: 0, tvq: 0, total: 0 },
    statut: 'Partial', modalites: '', note: '', vendeur: { nomLegal: 'X', adresse: '', neq: '', tps: '', tvq: '', courriel: '' },
    lienPaiementStripe: '', publieLe: '2026-10-01T00:00:00Z', remise: 0, factureNumero: '',
    paiements: [{ date: '2026-10-02', montant: 100, mode: 'virement' }], credits: [], solde: 50, piecesJointes: [{ nom: 'plan.pdf', url: 'https://x' }],
  };
  await verifie("L'admin publie le miroir complet (ok)", assertSucceeds(setDoc(doc(dbAdmin, 'factures_publiques', 'jeton-1'), miroirTest)));
  await verifie("L'admin allume le paiement par carte sur le miroir (ok)", assertSucceeds(updateDoc(doc(dbAdmin, 'factures_publiques', 'jeton-1'), { paiementCarte: true })));
  await verifie("L'admin met à jour paiements et solde du miroir (ok)", assertSucceeds(updateDoc(doc(dbAdmin, 'factures_publiques', 'jeton-1'), { statut: 'Paid', solde: 0, paiements: [] })));
  await verifie("L'admin glisse une note privée dans le miroir (refus attendu)", assertFails(setDoc(doc(dbAdmin, 'factures_publiques', 'jeton-2'), { ...miroirTest, notesPrivees: 'x' })));
  await verifie("L'admin recopie la récurrence dans le miroir (refus attendu)", assertFails(updateDoc(doc(dbAdmin, 'factures_publiques', 'jeton-1'), { recurrence: { actif: true } })));
  await verifie('un anonyme lit le miroir par son jeton (ok)', assertSucceeds(getDoc(doc(dbAnon, 'factures_publiques', 'jeton-1'))));
  await verifie('un anonyme liste les miroirs (refus attendu)', assertFails(getDocs(collection(dbAnon, 'factures_publiques'))));
  await verifie('un anonyme marque le miroir payé (refus attendu)', assertFails(updateDoc(doc(dbAnon, 'factures_publiques', 'jeton-1'), { statut: 'Paid' })));
  await verifie('un client connecté écrit un miroir (refus attendu)', assertFails(setDoc(doc(dbA, 'factures_publiques', 'jeton-3'), miroirTest)));

  // 3. Pièces jointes des factures dans Storage : documents/{docId}/{nom}, admin seulement, PDF ou image, 20 Mo.
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const stAdmin = testEnv.authenticatedContext(ADMIN_UID).storage();
    const stA = testEnv.authenticatedContext(UID_A).storage();
    const stAnon = testEnv.unauthenticatedContext().storage();
    const petit = new Uint8Array([37, 80, 68, 70]);
    await verifie("L'admin téléverse un PDF joint (ok)", assertSucceeds(uploadBytes(ref(stAdmin, 'documents/fac-1/plan.pdf'), petit, { contentType: 'application/pdf' })));
    await verifie("L'admin téléverse une image jointe (ok)", assertSucceeds(uploadBytes(ref(stAdmin, 'documents/fac-1/photo.png'), petit, { contentType: 'image/png' })));
    await verifie("L'admin téléverse un fichier zip (refus attendu)", assertFails(uploadBytes(ref(stAdmin, 'documents/fac-1/archive.zip'), petit, { contentType: 'application/zip' })));
    await verifie("L'admin téléverse un PDF de 21 Mo (refus attendu)", assertFails(uploadBytes(ref(stAdmin, 'documents/fac-1/gros.pdf'), new Uint8Array(21 * 1024 * 1024), { contentType: 'application/pdf' })));
    await verifie("L'admin lit une pièce jointe (ok)", assertSucceeds(getBytes(ref(stAdmin, 'documents/fac-1/plan.pdf'))));
    await verifie('un client connecté lit une pièce jointe par le SDK (refus attendu)', assertFails(getBytes(ref(stA, 'documents/fac-1/plan.pdf'))));
    await verifie('un anonyme téléverse une pièce jointe (refus attendu)', assertFails(uploadBytes(ref(stAnon, 'documents/fac-1/intrus.pdf'), petit, { contentType: 'application/pdf' })));
    await verifie('un client connecté supprime une pièce jointe (refus attendu)', assertFails(deleteObject(ref(stA, 'documents/fac-1/plan.pdf'))));
    await verifie("L'admin supprime une pièce jointe (ok)", assertSucceeds(deleteObject(ref(stAdmin, 'documents/fac-1/photo.png'))));
  }

  // 4. Les réglages de facturation portent l'identité légale (NEQ, TPS, TVQ) : admin seulement, jamais publics.
  await verifie("L'admin écrit les réglages de facturation (ok)", assertSucceeds(setDoc(doc(dbAdmin, 'settings/facturation'), { nomLegal: 'X', neq: '1234567890' })));
  await verifie("L'admin lit les réglages de facturation (ok)", assertSucceeds(getDoc(doc(dbAdmin, 'settings/facturation'))));
  await verifie('un client connecté lit les réglages de facturation (refus attendu)', assertFails(getDoc(doc(dbA, 'settings/facturation'))));
  await verifie('un anonyme lit les réglages de facturation (refus attendu)', assertFails(getDoc(doc(dbAnon, 'settings/facturation'))));

  // 5. Reçus des dépenses dans Storage : recus/{transactionId}/{nom}, admin seulement, image ou PDF, 15 Mo.
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const stAdmin = testEnv.authenticatedContext(ADMIN_UID).storage();
    const stA = testEnv.authenticatedContext(UID_A).storage();
    const petit = new Uint8Array([37, 80, 68, 70]);
    await verifie("L'admin dépose un reçu en image (ok)", assertSucceeds(uploadBytes(ref(stAdmin, 'recus/tr-1/recu.jpg'), petit, { contentType: 'image/jpeg' })));
    await verifie("L'admin dépose un reçu en zip (refus attendu)", assertFails(uploadBytes(ref(stAdmin, 'recus/tr-1/recu.zip'), petit, { contentType: 'application/zip' })));
    await verifie('un client connecté lit un reçu (refus attendu)', assertFails(getBytes(ref(stA, 'recus/tr-1/recu.jpg'))));
    await verifie("L'admin retire un reçu (ok)", assertSucceeds(deleteObject(ref(stAdmin, 'recus/tr-1/recu.jpg'))));
  }

  await testEnv.cleanup();

  console.log(resultats.join('\n'));
  console.log(`\n${ok} passés, ${fail} échoués sur ${ok + fail}.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Échec du script de test :', e);
  process.exit(1);
});
