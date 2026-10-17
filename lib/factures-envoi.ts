// L'envoi des courriels de facturation par le site lui-même (functions/src/factures/envoyer.ts, Resend),
// et le paiement par carte au montant exact (functions/src/factures/paiement.ts, Stripe Checkout).
// Tant que la clé Resend n'est pas posée chez Firebase, la fonction répond failed-precondition et
// le bouton retombe sur le courriel prérempli (mailto), comme avant.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './compta/ancrage';
import { lienMailto, type Courriel } from './factures-courriel';

export const REGION_FONCTIONS = 'northamerica-northeast1';
const fonctions = () => getFunctions(app, REGION_FONCTIONS);

/** Envoie par le site; sinon ouvre le logiciel de courriel de Laurie. Rend vrai si le site a envoyé. */
export async function envoyerCourriel(courriel: Courriel): Promise<boolean> {
  try {
    await httpsCallable(fonctions(), 'envoyerDocumentFacture')(courriel);
    return true;
  } catch {
    window.location.href = lienMailto(courriel);
    return false;
  }
}

/** Ouvre la session Stripe Checkout de la facture. Rend faux si le paiement par carte n'est pas branché. */
export async function payerParCarte(jeton: string): Promise<boolean> {
  try {
    const { data } = await httpsCallable<{ jeton: string }, { url: string }>(fonctions(), 'creerPaiementFacture')({ jeton });
    if (!data?.url) return false;
    window.location.href = data.url;
    return true;
  } catch {
    return false;
  }
}
