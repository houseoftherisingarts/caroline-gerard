"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendPret = exports.clePosee = exports.EXPEDITEUR_FACTURES = exports.SITE_URL = void 0;
exports.envoyerCourrielFacture = envoyerCourrielFacture;
// Le transporteur des courriels de facturation : même Resend que l'infolettre (functions/src/infolettre/mail.ts),
// une adresse d'expédition à part. Tant que la clé Resend n'est pas une vraie clé (`re_…`), rien ne part :
// le client retombe sur le courriel prérempli (lib/factures-envoi.ts).
const mail_1 = require("../infolettre/mail");
exports.SITE_URL = 'https://carolinegerard.ca';
exports.EXPEDITEUR_FACTURES = '"Caroline Gérard" <factures@carolinegerard.ca>';
/** Une clé de secret est posée pour vrai quand elle porte le préfixe du service, pas la valeur d'attente. */
const clePosee = (valeur, prefixe) => !!valeur && valeur.startsWith(prefixe);
exports.clePosee = clePosee;
const resendPret = () => (0, exports.clePosee)(mail_1.RESEND_API_KEY.value(), 're_');
exports.resendPret = resendPret;
async function envoyerCourrielFacture(c, replyTo = mail_1.REPLY_TO) {
    const transporter = (0, mail_1.createTransporter)();
    try {
        await transporter.sendMail({ from: exports.EXPEDITEUR_FACTURES, replyTo, to: c.a, subject: c.sujet, text: c.corps });
    }
    finally {
        transporter.close();
    }
}
//# sourceMappingURL=courriel.js.map