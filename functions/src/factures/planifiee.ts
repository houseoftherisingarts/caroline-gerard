// facturesDuMatin : chaque matin à 7 h 30 (Montréal), le serveur fait ce que l'onglet Factures faisait à
// l'ouverture, et ce que Laurie faisait à la main : il crée les factures récurrentes dues (et les publie puis
// les envoie si le réglage le permet), et il relance les factures en retard à J+7, J+21 et J+45.
// La logique de choix vient de lib/factures-calcul.ts (copié dans src/partage au build), la même qu'au client.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { RESEND_API_KEY, REGION, REPLY_TO } from '../infolettre/mail';
import { envoyerCourrielFacture, resendPret, SITE_URL } from './courriel';
import type { Document } from '../partage/types';
import {
  miroirPublic, planifierRecurrences, relancesDues, soldeFacture, REGLAGES_AUTOMATISMES, type ParametresFacturation,
} from '../partage/lib/factures-calcul';
import { courrielDocument, courrielRelance } from '../partage/lib/factures-courriel';

const PARAMETRES_DEFAUT: ParametresFacturation = {
  nomLegal: 'Caroline Gérard', adresse: '501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0', neq: '', tps: '781718333 RT0001', tvq: '1041635416 TQ0001', modalites: '', note: 'Merci de votre confiance.',
  courriel: REPLY_TO, lienPaiementStripe: '', ...REGLAGES_AUTOMATISMES,
};

const aujourdhuiMontreal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

export async function tourDuMatin(aujourdhui = aujourdhuiMontreal()): Promise<{ creees: number; envoyees: number; relancees: number }> {
  const db = getFirestore();
  const [reglages, snap] = await Promise.all([db.doc('settings/facturation').get(), db.collection('documents').get()]);
  const parametres: ParametresFacturation = { ...PARAMETRES_DEFAUT, ...(reglages.data() || {}) };
  const documents = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Document, 'id'>) }));
  const nom = parametres.nomLegal || PARAMETRES_DEFAUT.nomLegal;
  const envoiPossible = resendPret();
  const contexte = { lang: 'FR' as const, nom };

  // 1. Les récurrences dues : modèle avancé et facture créée dans le même lot, comme au client.
  const { nouvelles, modeles } = planifierRecurrences(documents, aujourdhui);
  const envoyer = envoiPossible && parametres.envoiRecurrences !== false;
  const lot = db.batch();
  modeles.forEach((m) => lot.update(db.doc(`documents/${m.id}`), { recurrence: m.recurrence }));
  const creees: Document[] = nouvelles.map((n) => {
    const ref = db.collection('documents').doc();
    const publiee = envoyer && !!n.clientEmail;
    const facture: Document = publiee
      ? { ...n, id: ref.id, status: 'Sent', jetonPublic: randomBytes(24).toString('base64url'), envoyeeLe: aujourdhui }
      : { ...n, id: ref.id };
    const { id, ...donnees } = facture;
    lot.set(ref, { ...donnees, createdAt: FieldValue.serverTimestamp() });
    if (publiee) lot.set(db.doc(`factures_publiques/${facture.jetonPublic}`), miroirPublic(facture, parametres, documents, new Date().toISOString()));
    return facture;
  });
  if (modeles.length) await lot.commit();

  let envoyees = 0;
  for (const f of creees.filter((f) => f.jetonPublic)) {
    const montant = soldeFacture(f, documents, parametres).solde;
    await envoyerCourrielFacture(courrielDocument(f, montant, { ...contexte, lien: `${SITE_URL}/facture/${f.jetonPublic}` }), parametres.courriel);
    envoyees++;
  }

  // 2. Les relances : seulement les factures déjà publiées, aux jours convenus, jamais deux la même semaine.
  let relancees = 0;
  if (envoiPossible && parametres.relancesAutomatiques !== false) {
    for (const { doc, solde, jours } of relancesDues(documents, parametres, aujourdhui)) {
      await envoyerCourrielFacture(courrielRelance(doc, solde, jours, { ...contexte, lien: `${SITE_URL}/facture/${doc.jetonPublic}` }), parametres.courriel);
      await db.doc(`documents/${doc.id}`).update({ relances: FieldValue.arrayUnion({ date: aujourdhui, auto: true }) });
      relancees++;
    }
  }

  console.log('[facturesDuMatin]', aujourdhui, { creees: creees.length, envoyees, relancees, envoiPossible });
  return { creees: creees.length, envoyees, relancees };
}

export const facturesDuMatin = onSchedule(
  { schedule: '30 7 * * *', timeZone: 'America/Toronto', region: REGION, secrets: [RESEND_API_KEY], retryCount: 1 },
  async () => { await tourDuMatin(); },
);
