"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookStripeCaroline = exports.creerPaiementFacture = exports.STRIPE_WEBHOOK_SECRET_CAROLINE = exports.STRIPE_SECRET_KEY_CAROLINE = void 0;
// Paiement Stripe d'une facture publiée. Déployé depuis le 16 octobre 2026 (projet sur Blaze); les secrets
// portent la valeur d'attente A_REMPLIR tant qu'Alex n'a pas collé les vraies clés (docs/BRANCHEMENTS.md) :
//   firebase functions:secrets:set STRIPE_SECRET_KEY_CAROLINE     (clé secrète du compte Stripe de Caroline)
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET_CAROLINE (whsec_... rendu par le point de terminaison créé sur ce endpoint)
// Sans vraie clé, creerPaiementFacture répond failed-precondition et la page publique (pages/FacturePublique.tsx)
// le dit; le bouton ne paraît que si le réglage « paiement par carte » est coché (lib/factures-calcul.ts).
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const node_crypto_1 = require("node:crypto");
const mail_1 = require("../infolettre/mail");
const courriel_1 = require("./courriel");
const http_1 = require("../http");
exports.STRIPE_SECRET_KEY_CAROLINE = (0, params_1.defineSecret)('STRIPE_SECRET_KEY_CAROLINE');
exports.STRIPE_WEBHOOK_SECRET_CAROLINE = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET_CAROLINE');
const SITE_URL = 'https://carolinegerard.ca';
async function creerSession(cle, champs) {
    const rep = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(champs).toString(),
    });
    if (!rep.ok)
        throw new https_1.HttpsError('internal', 'Stripe a refusé la session de paiement.');
    return (await rep.json());
}
/** Signature Stripe-Signature : t=horodatage,v1=HMAC-SHA256(secret, `${t}.${corps}`), tolérance de 5 minutes. */
function evenementSigne(corps, entete, secret) {
    const parties = Object.fromEntries(entete.split(',').map((p) => p.split('=')));
    const t = parties.t;
    if (!t || !parties.v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300)
        return null;
    const attendu = (0, node_crypto_1.createHmac)('sha256', secret).update(`${t}.${corps.toString('utf8')}`).digest('hex');
    const a = Buffer.from(attendu), b = Buffer.from(parties.v1);
    return a.length === b.length && (0, node_crypto_1.timingSafeEqual)(a, b) ? JSON.parse(corps.toString('utf8')) : null;
}
/** Crée une session Stripe Checkout pour le montant exact de la facture, à partir de son jeton public. */
exports.creerPaiementFacture = (0, https_1.onCall)({ region: mail_1.REGION, secrets: [exports.STRIPE_SECRET_KEY_CAROLINE] }, async (request) => {
    const jeton = String(request.data?.jeton || '').trim();
    if (!jeton)
        throw new https_1.HttpsError('invalid-argument', 'Jeton manquant.');
    if (!(0, courriel_1.clePosee)(exports.STRIPE_SECRET_KEY_CAROLINE.value(), 'sk_'))
        throw new https_1.HttpsError('failed-precondition', 'Le paiement par carte n’est pas branché (clé Stripe).');
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`factures_publiques/${jeton}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Facture introuvable.');
    const facture = snap.data();
    if (facture.statut === 'Paid')
        throw new https_1.HttpsError('failed-precondition', 'Cette facture est déjà payée.');
    // Le solde du miroir tient compte des acomptes et des notes de crédit; un ancien miroir n'a que le total.
    const montantCentimes = Math.round((facture.solde ?? facture.totaux?.total ?? 0) * 100);
    if (!Number.isFinite(montantCentimes) || montantCentimes <= 0) {
        throw new https_1.HttpsError('failed-precondition', 'Montant invalide.');
    }
    const session = await creerSession(exports.STRIPE_SECRET_KEY_CAROLINE.value(), {
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
});
/** Le webhook Stripe : marque la facture payée une fois le paiement confirmé côté serveur. */
exports.webhookStripeCaroline = (0, https_1.onRequest)({ region: mail_1.REGION, secrets: [exports.STRIPE_SECRET_KEY_CAROLINE, exports.STRIPE_WEBHOOK_SECRET_CAROLINE], maxInstances: 5 }, async (req, res) => {
    if (req.method !== 'POST') {
        (0, http_1.pageWebhook)(res, 'webhookStripeCaroline', 'Stripe', 'Stripe › Développeurs › Webhooks (événement checkout.session.completed)');
        return;
    }
    const corps = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const event = evenementSigne(corps, req.header('stripe-signature') || '', exports.STRIPE_WEBHOOK_SECRET_CAROLINE.value());
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
            const db = (0, firestore_1.getFirestore)();
            const refDoc = db.doc(`documents/${documentId}`);
            const refMiroir = db.doc(`factures_publiques/${jeton}`);
            const [snapDoc, snapMiroir] = await Promise.all([refDoc.get(), refMiroir.get()]);
            const deja = (snapDoc.get('paiements') || []).some((p) => p.id === session.id);
            if (!deja) {
                const montant = Math.round(session.amount_total ?? 0) / 100;
                const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
                const miroir = snapMiroir.data();
                const solde = Math.round(((miroir?.solde ?? miroir?.totaux?.total ?? montant) - montant) * 100) / 100;
                const statut = solde <= 0.005 ? 'Paid' : 'Partial';
                const payeLe = firestore_1.FieldValue.serverTimestamp();
                await refDoc.set({ status: statut, payeLe, paiements: firestore_1.FieldValue.arrayUnion({ id: session.id, date, montant, mode: 'stripe' }) }, { merge: true });
                await refMiroir.set({ statut, solde, payeLe, paiements: firestore_1.FieldValue.arrayUnion({ date, montant, mode: 'stripe' }) }, { merge: true });
                console.log('[webhookStripeCaroline] paiement reçu', jeton, documentId, montant, statut);
            }
        }
    }
    res.status(200).send('ok');
});
//# sourceMappingURL=paiement.js.map