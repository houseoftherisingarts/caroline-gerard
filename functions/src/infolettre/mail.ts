// Le transport courriel que les fonctions de factures empruntent (functions/src/factures/). Le site n'a pas
// d'infolettre : ce fichier ne porte que ce que le module demande, Resend par SMTP avec le secret RESEND_API_KEY.
//   firebase functions:secrets:set RESEND_API_KEY   (clé du compte Resend, domaine carolinegerard.ca à vérifier)
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
export const REPLY_TO = 'caroline@carolinegerard.ca';
export const REGION = 'northamerica-northeast1';

export function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: RESEND_API_KEY.value() },
  });
}
