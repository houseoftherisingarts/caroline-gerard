// L'administratrice du site, pour les fonctions de factures. Miroir de isAdmin() dans firestore.rules et de
// assertAdmin() de src/index.ts : l'UID d'abord, puis les courriels Vexel vérifiés. Le suffixe @admin.local
// n'est volontairement pas reconnu.
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

const ADMIN_UIDS = ['qieZGM8Vnie92DblUtpvi710q3F3', 'lcfLrSZjcUTxwAgMe8tkCivdXQj1'];
const ADMIN_EMAILS = ['alex@lesalondesinconnus.com', 'krystine@inspiratanature.com'];

export function assertAdmin(request: CallableRequest): void {
  const auth = request.auth;
  const ok = !!auth && (
    ADMIN_UIDS.includes(auth.uid)
    || (!!auth.token.email && ADMIN_EMAILS.includes(auth.token.email) && auth.token.email_verified === true)
  );
  if (!ok) throw new HttpsError('permission-denied', "Réservé à l'administratrice du site.");
}
