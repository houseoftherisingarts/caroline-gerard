"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGION = exports.REPLY_TO = exports.RESEND_API_KEY = void 0;
exports.createTransporter = createTransporter;
// Le transport courriel que les fonctions de factures empruntent (functions/src/factures/). Le site n'a pas
// d'infolettre : ce fichier ne porte que ce que le module demande, Resend par SMTP avec le secret RESEND_API_KEY.
//   firebase functions:secrets:set RESEND_API_KEY   (clé du compte Resend, domaine carolinegerard.ca à vérifier)
const params_1 = require("firebase-functions/params");
const nodemailer = require("nodemailer");
exports.RESEND_API_KEY = (0, params_1.defineSecret)('RESEND_API_KEY');
exports.REPLY_TO = 'caroline@carolinegerard.ca';
exports.REGION = 'northamerica-northeast1';
function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: exports.RESEND_API_KEY.value() },
    });
}
//# sourceMappingURL=mail.js.map