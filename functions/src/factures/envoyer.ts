// envoyerDocumentFacture : le bouton Envoyer, Relancer ou l'état de compte de l'admin (lib/factures-envoi.ts)
// passe ici le courriel déjà rendu par lib/factures-courriel.ts, et le site l'envoie par Resend au nom de
// Laurie. Admin seulement. Sans clé Resend : failed-precondition, et l'admin ouvre le mailto comme avant.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { RESEND_API_KEY, REGION } from '../infolettre/mail';
import { assertAdmin } from '../infolettre/send';
import { envoyerCourrielFacture, resendPret } from './courriel';

const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const envoyerDocumentFacture = onCall({ region: REGION, secrets: [RESEND_API_KEY] }, async (request) => {
  assertAdmin(request);
  if (!resendPret()) throw new HttpsError('failed-precondition', 'Le courriel du site n’est pas branché (clé Resend).');
  const a = String(request.data?.a || '').trim();
  const sujet = String(request.data?.sujet || '').trim().slice(0, 200);
  const corps = String(request.data?.corps || '').slice(0, 10000);
  if (!COURRIEL.test(a) || !sujet || !corps) throw new HttpsError('invalid-argument', 'Destinataire, sujet ou corps manquant.');
  const replyTo = (await getFirestore().doc('settings/facturation').get()).get('courriel') as string | undefined;
  await envoyerCourrielFacture({ a, sujet, corps }, COURRIEL.test(replyTo || '') ? replyTo : undefined);
  return { ok: true };
});
