"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAdmin = assertAdmin;
// L'administratrice du site, pour les fonctions de factures. Miroir de isAdmin() dans firestore.rules et de
// assertAdmin() de src/index.ts : l'UID d'abord, puis les courriels Vexel vérifiés. Le suffixe @admin.local
// n'est volontairement pas reconnu.
const https_1 = require("firebase-functions/v2/https");
const ADMIN_UIDS = ['qieZGM8Vnie92DblUtpvi710q3F3', 'lcfLrSZjcUTxwAgMe8tkCivdXQj1'];
const ADMIN_EMAILS = ['alex@lesalondesinconnus.com', 'krystine@inspiratanature.com'];
function assertAdmin(request) {
    const auth = request.auth;
    const ok = !!auth && (ADMIN_UIDS.includes(auth.uid)
        || (!!auth.token.email && ADMIN_EMAILS.includes(auth.token.email) && auth.token.email_verified === true));
    if (!ok)
        throw new https_1.HttpsError('permission-denied', "Réservé à l'administratrice du site.");
}
//# sourceMappingURL=send.js.map