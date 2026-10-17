"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envoyerDocumentFacture = void 0;
// envoyerDocumentFacture : le bouton Envoyer, Relancer ou l'état de compte de l'admin (lib/factures-envoi.ts)
// passe ici le courriel déjà rendu par lib/factures-courriel.ts, et le site l'envoie par Resend au nom de
// Laurie. Admin seulement. Sans clé Resend : failed-precondition, et l'admin ouvre le mailto comme avant.
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const mail_1 = require("../infolettre/mail");
const send_1 = require("../infolettre/send");
const courriel_1 = require("./courriel");
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.envoyerDocumentFacture = (0, https_1.onCall)({ region: mail_1.REGION, secrets: [mail_1.RESEND_API_KEY] }, async (request) => {
    (0, send_1.assertAdmin)(request);
    if (!(0, courriel_1.resendPret)())
        throw new https_1.HttpsError('failed-precondition', 'Le courriel du site n’est pas branché (clé Resend).');
    const a = String(request.data?.a || '').trim();
    const sujet = String(request.data?.sujet || '').trim().slice(0, 200);
    const corps = String(request.data?.corps || '').slice(0, 10000);
    if (!COURRIEL.test(a) || !sujet || !corps)
        throw new https_1.HttpsError('invalid-argument', 'Destinataire, sujet ou corps manquant.');
    const replyTo = (await (0, firestore_1.getFirestore)().doc('settings/facturation').get()).get('courriel');
    await (0, courriel_1.envoyerCourrielFacture)({ a, sujet, corps }, COURRIEL.test(replyTo || '') ? replyTo : undefined);
    return { ok: true };
});
//# sourceMappingURL=envoyer.js.map