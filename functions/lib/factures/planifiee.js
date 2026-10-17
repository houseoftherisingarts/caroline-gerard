"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.facturesDuMatin = void 0;
exports.tourDuMatin = tourDuMatin;
// facturesDuMatin : chaque matin à 7 h 30 (Montréal), le serveur fait ce que l'onglet Factures faisait à
// l'ouverture, et ce que Laurie faisait à la main : il crée les factures récurrentes dues (et les publie puis
// les envoie si le réglage le permet), et il relance les factures en retard à J+7, J+21 et J+45.
// La logique de choix vient de lib/factures-calcul.ts (copié dans src/partage au build), la même qu'au client.
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const node_crypto_1 = require("node:crypto");
const mail_1 = require("../infolettre/mail");
const courriel_1 = require("./courriel");
const factures_calcul_1 = require("../partage/lib/factures-calcul");
const factures_courriel_1 = require("../partage/lib/factures-courriel");
const PARAMETRES_DEFAUT = {
    nomLegal: 'Caroline Gérard', adresse: '501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0', neq: '', tps: '781718333 RT0001', tvq: '1041635416 TQ0001', modalites: '', note: 'Merci de votre confiance.',
    courriel: mail_1.REPLY_TO, lienPaiementStripe: '', ...factures_calcul_1.REGLAGES_AUTOMATISMES,
};
const aujourdhuiMontreal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
async function tourDuMatin(aujourdhui = aujourdhuiMontreal()) {
    const db = (0, firestore_1.getFirestore)();
    const [reglages, snap] = await Promise.all([db.doc('settings/facturation').get(), db.collection('documents').get()]);
    const parametres = { ...PARAMETRES_DEFAUT, ...(reglages.data() || {}) };
    const documents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const nom = parametres.nomLegal || PARAMETRES_DEFAUT.nomLegal;
    const envoiPossible = (0, courriel_1.resendPret)();
    const contexte = { lang: 'FR', nom };
    // 1. Les récurrences dues : modèle avancé et facture créée dans le même lot, comme au client.
    const { nouvelles, modeles } = (0, factures_calcul_1.planifierRecurrences)(documents, aujourdhui);
    const envoyer = envoiPossible && parametres.envoiRecurrences !== false;
    const lot = db.batch();
    modeles.forEach((m) => lot.update(db.doc(`documents/${m.id}`), { recurrence: m.recurrence }));
    const creees = nouvelles.map((n) => {
        const ref = db.collection('documents').doc();
        const publiee = envoyer && !!n.clientEmail;
        const facture = publiee
            ? { ...n, id: ref.id, status: 'Sent', jetonPublic: (0, node_crypto_1.randomBytes)(24).toString('base64url'), envoyeeLe: aujourdhui }
            : { ...n, id: ref.id };
        const { id, ...donnees } = facture;
        lot.set(ref, { ...donnees, createdAt: firestore_1.FieldValue.serverTimestamp() });
        if (publiee)
            lot.set(db.doc(`factures_publiques/${facture.jetonPublic}`), (0, factures_calcul_1.miroirPublic)(facture, parametres, documents, new Date().toISOString()));
        return facture;
    });
    if (modeles.length)
        await lot.commit();
    let envoyees = 0;
    for (const f of creees.filter((f) => f.jetonPublic)) {
        const montant = (0, factures_calcul_1.soldeFacture)(f, documents, parametres).solde;
        await (0, courriel_1.envoyerCourrielFacture)((0, factures_courriel_1.courrielDocument)(f, montant, { ...contexte, lien: `${courriel_1.SITE_URL}/facture/${f.jetonPublic}` }), parametres.courriel);
        envoyees++;
    }
    // 2. Les relances : seulement les factures déjà publiées, aux jours convenus, jamais deux la même semaine.
    let relancees = 0;
    if (envoiPossible && parametres.relancesAutomatiques !== false) {
        for (const { doc, solde, jours } of (0, factures_calcul_1.relancesDues)(documents, parametres, aujourdhui)) {
            await (0, courriel_1.envoyerCourrielFacture)((0, factures_courriel_1.courrielRelance)(doc, solde, jours, { ...contexte, lien: `${courriel_1.SITE_URL}/facture/${doc.jetonPublic}` }), parametres.courriel);
            await db.doc(`documents/${doc.id}`).update({ relances: firestore_1.FieldValue.arrayUnion({ date: aujourdhui, auto: true }) });
            relancees++;
        }
    }
    console.log('[facturesDuMatin]', aujourdhui, { creees: creees.length, envoyees, relancees, envoiPossible });
    return { creees: creees.length, envoyees, relancees };
}
exports.facturesDuMatin = (0, scheduler_1.onSchedule)({ schedule: '30 7 * * *', timeZone: 'America/Toronto', region: mail_1.REGION, secrets: [mail_1.RESEND_API_KEY], retryCount: 1 }, async () => { await tourDuMatin(); });
//# sourceMappingURL=planifiee.js.map