// Le transporteur des courriels de facturation : même Resend que l'infolettre (functions/src/infolettre/mail.ts),
// une adresse d'expédition à part. Tant que la clé Resend n'est pas une vraie clé (`re_…`), rien ne part :
// le client retombe sur le courriel prérempli (lib/factures-envoi.ts).
import { RESEND_API_KEY, REPLY_TO, createTransporter } from '../infolettre/mail';
import type { Courriel } from '../partage/lib/factures-courriel';

export const SITE_URL = 'https://carolinegerard.ca';
export const EXPEDITEUR_FACTURES = '"Caroline Gérard" <factures@carolinegerard.ca>';

/** Une clé de secret est posée pour vrai quand elle porte le préfixe du service, pas la valeur d'attente. */
export const clePosee = (valeur: string | undefined, prefixe: string): boolean => !!valeur && valeur.startsWith(prefixe);
export const resendPret = (): boolean => clePosee(RESEND_API_KEY.value(), 're_');

export async function envoyerCourrielFacture(c: Courriel, replyTo = REPLY_TO): Promise<void> {
  const transporter = createTransporter();
  try {
    await transporter.sendMail({ from: EXPEDITEUR_FACTURES, replyTo, to: c.a, subject: c.sujet, text: c.corps });
  } finally {
    transporter.close();
  }
}
