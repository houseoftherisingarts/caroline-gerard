// Tests des règles Firestore de l'agenda de rendez-vous (rendezvous, occupations, settings/agenda)
// et des leads du formulaire de contact et des demandes de conférence — porté du même contrat que
// celui de Laurie Belhumeur (Xena Horizon). Lancé via :
//   PATH="/usr/local/opt/openjdk/bin:$PATH" npx firebase emulators:exec --only firestore --project caroline-test "node tests/rules.test.mjs"
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const UID_A = 'user-a';
const UID_B = 'user-b';
const ADMIN_UID = 'qieZGM8Vnie92DblUtpvi710q3F3'; // Caroline — whitelist firestore.rules

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
    projectId: 'caroline-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8180,
    },
  });

  const dbA = testEnv.authenticatedContext(UID_A).firestore();
  const dbB = testEnv.authenticatedContext(UID_B).firestore();
  const dbAdmin = testEnv.authenticatedContext(ADMIN_UID).firestore();
  const dbAnon = testEnv.unauthenticatedContext().firestore();

  // ── settings/agenda : lecture libre, écriture admin seulement (couvert par settings/{id}) ──
  await verifie('un anonyme lit settings/agenda (ok)', assertSucceeds(getDoc(doc(dbAnon, 'settings', 'agenda'))));
  await verifie(
    'un client connecté écrit settings/agenda (refus attendu)',
    assertFails(setDoc(doc(dbA, 'settings', 'agenda'), { duree: 45 }, { merge: true }))
  );
  await verifie(
    'Caroline écrit settings/agenda (ok)',
    assertSucceeds(setDoc(doc(dbAdmin, 'settings', 'agenda'), { duree: 45 }, { merge: true }))
  );

  // ── rendezvous : la personne demande un créneau à son nom, ne peut confirmer elle-même, peut annuler ──
  const dans3Jours = new Date(Date.now() + 3 * 86400000);
  const fin3Jours = new Date(dans3Jours.getTime() + 45 * 60000);
  const rdvValide = (uid) => ({
    uid, nom: 'Personne A', courriel: 'a@example.com', debut: dans3Jours, fin: fin3Jours, duree: 45, statut: 'demande', salle: 'caroline-test', note: 'Mon projet', creePar: 'client', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await verifie('rendez-vous demandé par la personne (ok)', assertSucceeds(setDoc(doc(dbA, 'rendezvous', 'rdv-a'), rdvValide(UID_A))));
  await verifie("rendez-vous au nom d'un autre (refus attendu)", assertFails(setDoc(doc(dbA, 'rendezvous', 'rdv-b'), rdvValide(UID_B))));
  await verifie('rendez-vous déjà confirmé par la personne (refus attendu)', assertFails(setDoc(doc(dbA, 'rendezvous', 'rdv-c'), { ...rdvValide(UID_A), statut: 'confirme' })));
  await verifie('la personne confirme elle-même (refus attendu)', assertFails(updateDoc(doc(dbA, 'rendezvous', 'rdv-a'), { statut: 'confirme', updatedAt: serverTimestamp() })));
  await verifie('Caroline confirme (ok)', assertSucceeds(updateDoc(doc(dbAdmin, 'rendezvous', 'rdv-a'), { statut: 'confirme', updatedAt: serverTimestamp() })));
  await verifie('un autre lit le rendez-vous (refus attendu)', assertFails(getDoc(doc(dbB, 'rendezvous', 'rdv-a'))));
  await verifie('la personne annule (ok)', assertSucceeds(updateDoc(doc(dbA, 'rendezvous', 'rdv-a'), { statut: 'annule', updatedAt: serverTimestamp() })));
  await verifie('rendez-vous dont la durée ne colle pas (refus attendu)', assertFails(setDoc(doc(dbA, 'rendezvous', 'rdv-d'), { ...rdvValide(UID_A), duree: 240 })));

  // ── occupations : le miroir n'existe qu'avec un rendez-vous réel du même lot, aux mêmes heures ──
  const lot = writeBatch(dbA);
  lot.set(doc(dbA, 'rendezvous', 'rdv-e'), rdvValide(UID_A));
  lot.set(doc(dbA, 'occupations', 'rdv-e'), { debut: dans3Jours, fin: fin3Jours });
  await verifie('rendez-vous et occupation dans un même lot (ok)', assertSucceeds(lot.commit()));
  await verifie('occupation seule sans rendez-vous (refus attendu)', assertFails(setDoc(doc(dbA, 'occupations', 'occ-fantome'), { debut: dans3Jours, fin: fin3Jours })));
  const lotB = writeBatch(dbA);
  lotB.set(doc(dbA, 'rendezvous', 'rdv-f'), rdvValide(UID_A));
  lotB.set(doc(dbA, 'occupations', 'rdv-f'), { debut: dans3Jours, fin: new Date(fin3Jours.getTime() + 3600000) });
  await verifie('occupation aux mauvaises heures (refus attendu)', assertFails(lotB.commit()));
  await verifie('occupation lue par un autre compte connecté (ok)', assertSucceeds(getDoc(doc(dbB, 'occupations', 'rdv-e'))));
  await verifie('occupation lue sans compte (refus attendu)', assertFails(getDoc(doc(dbAnon, 'occupations', 'rdv-e'))));

  // ── leads : formulaire de contact et demandes de conférence, dateSouhaitee facultative ──
  await verifie(
    'lead public conforme, sans dateSouhaitee (ok)',
    assertSucceeds(
      setDoc(doc(dbAnon, 'leads', 'lead-1'), {
        id: 'lead-1', source: 'Formulaire de contact', name: 'Quelqu\'un', email: 'x@example.com',
        message: 'bonjour', date: new Date().toISOString(), isRead: false, archived: false,
      })
    )
  );
  await verifie(
    'lead avec dateSouhaitee valide (ok)',
    assertSucceeds(
      setDoc(doc(dbAnon, 'leads', 'lead-2'), {
        id: 'lead-2', source: 'Intervention - Une conférence', name: 'Quelqu\'un', email: 'x@example.com',
        message: 'bonjour', date: new Date().toISOString(), isRead: false, archived: false, dateSouhaitee: '2026-10-01',
      })
    )
  );
  await verifie(
    'lead avec un champ en trop (refus attendu)',
    assertFails(
      setDoc(doc(dbAnon, 'leads', 'lead-3'), {
        id: 'lead-3', source: 'Formulaire de contact', name: 'Quelqu\'un', email: 'x@example.com',
        message: 'bonjour', date: new Date().toISOString(), isRead: false, archived: false, role: 'admin',
      })
    )
  );
  await verifie(
    'lead avec dateSouhaitee trop longue (refus attendu)',
    assertFails(
      setDoc(doc(dbAnon, 'leads', 'lead-4'), {
        id: 'lead-4', source: 'Intervention - Une conférence', name: 'Quelqu\'un', email: 'x@example.com',
        message: 'bonjour', date: new Date().toISOString(), isRead: false, archived: false, dateSouhaitee: '2026-10-01T00:00:00Z',
      })
    )
  );
  await verifie('un client anonyme lit les leads (refus attendu)', assertFails(getDoc(doc(dbAnon, 'leads', 'lead-1'))));
  await verifie('Caroline lit les leads (ok)', assertSucceeds(getDoc(doc(dbAdmin, 'leads', 'lead-1'))));

  await testEnv.cleanup();

  console.log(resultats.join('\n'));
  console.log(`\n${ok} passés, ${fail} échoués sur ${ok + fail}.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Échec du script de test :', e);
  process.exit(1);
});
