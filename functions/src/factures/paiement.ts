// Paiement Stripe d'une facture publiée. Déployé depuis le 16 octobre 2026 (projet sur Blaze); les secrets
// portent la valeur d'attente A_REMPLIR tant qu'Alex n'a pas collé les vraies clés (docs/BRANCHEMENTS.md) :
//   firebase functions:secrets:set STRIPE_SECRET_KEY_CAROLINE     (clé secrète du compte Stripe de Caroline)
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET_CAROLINE (whsec_... rendu par le point de terminaison créé sur ce endpoint)
// Sans vraie clé, creerPaiementFacture répond failed-precondition et la page publique (pages/FacturePublique.tsx)
// le dit; le bouton ne paraît que si le réglage « paiement par carte » est coché (lib/factures-calcul.ts).
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { REGION } from '../infolettre/mail';
import { clePosee } from './courriel';
import { pageWebhook } from '../http';

export const STRIPE_SECRET_KEY_CAROLINE = defineSecret('STRIPE_SECRET_KEY_CAROLINE');
export const STRIPE_WEBHOOK_SECRET_CAROLINE = defineSecret('STRIPE_WEBHOOK_SECRET_CAROLINE');

const SITE_URL = 'https://carolinegerard.ca';

// Ajout propre à Caroline : le site n'a pas le paquet npm « stripe », et aucune dépendance nouvelle n'est permise.
// Les deux appels dont le module a besoin (créer une session Checkout, vérifier la signature d'un webhook)
// passent donc par l'API REST de Stripe et par node:crypto.
interface SessionStripe { id: string; url?: string; amount_total?: number; metadata?: Record<string, string> }
interface EvenementStripe { type: string; data: { object: SessionStripe } }

async function creerSession(cle: string, champs: Record<string, string>): Promise<SessionStripe> {
  const rep = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(champs).toString(),
  });
  if (!rep.ok) throw new HttpsError('internal', 'Stripe a refusé la session de paiement.');
  return (await rep.json()) as SessionStripe;
}

/** Signature Stripe-Signature : t=horodatage,v1=HMAC-SHA256(secret, `${t}.${corps}`), tolérance de 5 minutes. */
function evenementSigne(corps: Buffer, entete: string, secret: string): EvenementStripe | null {
  const parties = Object.fromEntries(entete.split(',').map((p) => p.split('=') as [string, string]));
  const t = parties.t;
  if (!t || !parties.v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return null;
  const attendu = createHmac('sha256', secret).update(`${t}.${corps.toString('utf8')}`).digest('hex');
  const a = Buffer.from(attendu), b = Buffer.from(parties.v1);
  return a.length === b.length && timingSafeEqual(a, b) ? (JSON.parse(corps.toString('utf8')) as EvenementStripe) : null;
}

interface Totaux { sousTotal: number; tps: number; tvq: number; total: number; }
interface FacturePubliqueDoc {
  documentId: string;
  numero: string;
  clientEmail?: string;
  statut: string;
  totaux: Totaux;
  /** Solde après paiements et notes de crédit (lib/factures.ts, publierFacture et synchroniserMiroir). */
  solde?: number;
}

/** Crée une session Stripe Checkout pour le montant exact de la facture, à partir de son jeton public. */
export const creerPaiementFacture = onCall(
  { region: REGION, secrets: [STRIPE_SECRET_KEY_CAROLINE] },
  async (request) => {
    const jeton = String(request.data?.jeton || '').trim();
    if (!jeton) throw new HttpsError('invalid-argument', 'Jeton manquant.');
    if (!clePosee(STRIPE_SECRET_KEY_CAROLINE.value(), 'sk_')) throw new HttpsError('failed-precondition', 'Le paiement par carte n’est pas branché (clé Stripe).');

    const db = getFirestore();
    const ref = db.doc(`factures_publiques/${jeton}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Facture introuvable.');
    const facture = snap.data() as FacturePubliqueDoc;

    if (facture.statut === 'Paid') throw new HttpsError('failed-precondition', 'Cette facture est déjà payée.');
    // Le solde du miroir tient compte des acomptes et des notes de crédit; un ancien miroir n'a que le total.
    const montantCentimes = Math.round((facture.solde ?? facture.totaux?.total ?? 0) * 100);
    if (!Number.isFinite(montantCentimes) || montantCentimes <= 0) {
      throw new HttpsError('failed-precondition', 'Montant invalide.');
    }

    const session = await creerSession(STRIPE_SECRET_KEY_CAROLINE.value(), {
      mode: 'payment',
      'payment_method_types[0]': 'card',
      ...(facture.clientEmail ? { customer_email: facture.clientEmail } : {}),
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': `Facture ${facture.numero} Caroline Gérard`,
      'line_items[0][price_data][unit_amount]': String(montantCentimes),
      'line_items[0][quantity]': '1',
      'metadata[jeton]': jeton,
      'metadata[documentId]': facture.documentId,
      'metadata[numero]': facture.numero,
      success_url: `${SITE_URL}/facture/${jeton}?paye=1`,
      cancel_url: `${SITE_URL}/facture/${jeton}?annule=1`,
    });

    return { url: session.url };
  },
);

/** Le webhook Stripe : marque la facture payée une fois le paiement confirmé côté serveur. */
export const webhookStripeCaroline = onRequest(
  { region: REGION, secrets: [STRIPE_SECRET_KEY_CAROLINE, STRIPE_WEBHOOK_SECRET_CAROLINE], maxInstances: 5 },
  async (req, res) => {
    if (req.method !== 'POST') { pageWebhook(res, 'webhookStripeCaroline', 'Stripe', 'Stripe › Développeurs › Webhooks (événement checkout.session.completed)'); return; }
    const corps: Buffer = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body || {}));

    const event = evenementSigne(corps, req.header('stripe-signature') || '', STRIPE_WEBHOOK_SECRET_CAROLINE.value());
    if (!event) {
      res.status(400).send('signature invalide');
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const jeton = session.metadata?.jeton;
      const documentId = session.metadata?.documentId;
      if (jeton && documentId) {
        // Même contrat que l'admin (types.ts, Paiement; lib/factures-calcul.ts, statutSelonSolde) : un
        // paiement en mode « stripe » s'ajoute, la facture passe Partielle ou Payée selon le solde restant.
        const db = getFirestore();
        const refDoc = db.doc(`documents/${documentId}`);
        const refMiroir = db.doc(`factures_publiques/${jeton}`);
        const [snapDoc, snapMiroir] = await Promise.all([refDoc.get(), refMiroir.get()]);
        const deja = ((snapDoc.get('paiements') as { id?: string }[] | undefined) || []).some((p) => p.id === session.id);
        if (!deja) {
          const montant = Math.round(session.amount_total ?? 0) / 100;
          const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
          const miroir = snapMiroir.data() as FacturePubliqueDoc | undefined;
          const solde = Math.round(((miroir?.solde ?? miroir?.totaux?.total ?? montant) - montant) * 100) / 100;
          const statut = solde <= 0.005 ? 'Paid' : 'Partial';
          const payeLe = FieldValue.serverTimestamp();
          await refDoc.set({ status: statut, payeLe, paiements: FieldValue.arrayUnion({ id: session.id, date, montant, mode: 'stripe' }) }, { merge: true });
          await refMiroir.set({ statut, solde, payeLe, paiements: FieldValue.arrayUnion({ date, montant, mode: 'stripe' }) }, { merge: true });
          console.log('[webhookStripeCaroline] paiement reçu', jeton, documentId, montant, statut);
        }
      }
    }

    res.status(200).send('ok');
  },
);
