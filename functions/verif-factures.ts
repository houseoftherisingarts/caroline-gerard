// Vérification sans réseau de la logique partagée des factures côté serveur : quelles relances partent ce
// matin, et quelle clé compte comme posée. Usage : npm --prefix functions run verif:factures
import assert from 'node:assert/strict';
import { relancesDues, planifierRecurrences, miroirPublic, REGLAGES_AUTOMATISMES, type ParametresFacturation } from './src/partage/lib/factures-calcul';
import type { Document } from './src/partage/types';

const clePosee = (v: string | undefined, p: string) => !!v && v.startsWith(p);
assert.equal(clePosee('A_REMPLIR', 're_'), false, 'valeur d’attente');
assert.equal(clePosee(undefined, 're_'), false);
assert.equal(clePosee('re_abc', 're_'), true);
assert.equal(clePosee('sk_live_x', 'sk_'), true);

const P: ParametresFacturation = { nomLegal: 'L', adresse: '', neq: '', tps: '', tvq: '', modalites: '', note: '', courriel: 'l@x.com', lienPaiementStripe: '', ...REGLAGES_AUTOMATISMES };
const facture = (extra: Partial<Document>): Document => ({
  id: 'f1', number: 'FAC-2026-0001', type: 'Invoice', clientId: 'c', clientName: 'Client', clientEmail: 'c@x.com', date: '2026-09-01',
  dueDate: '2026-10-01', items: [{ id: 'i', description: 'x', quantity: 1, price: 100 }], status: 'Sent', terms: '', jetonPublic: 'jeton', ...extra,
});

assert.equal(relancesDues([facture({})], P, '2026-10-08').length, 1, 'J+7');
assert.equal(relancesDues([facture({})], P, '2026-10-22').length, 1, 'J+21');
assert.equal(relancesDues([facture({})], P, '2026-11-15').length, 1, 'J+45');
assert.equal(relancesDues([facture({})], P, '2026-10-09').length, 0, 'J+8 : rien');
assert.equal(relancesDues([facture({ status: 'Paid' })], P, '2026-10-08').length, 0, 'payée');
assert.equal(relancesDues([facture({ status: 'Draft' })], P, '2026-10-08').length, 0, 'brouillon');
assert.equal(relancesDues([facture({ jetonPublic: undefined })], P, '2026-10-08').length, 0, 'jamais publiée');
assert.equal(relancesDues([facture({ relances: [{ date: '2026-10-05' }] })], P, '2026-10-08').length, 0, 'relancée il y a 3 jours');
assert.equal(relancesDues([facture({ relances: [{ date: '2026-09-30' }] })], P, '2026-10-08').length, 1, 'relancée il y a 8 jours');
assert.equal(relancesDues([facture({ paiements: [{ id: 'p', date: '2026-10-02', montant: 100, mode: 'virement' }] })], P, '2026-10-08').length, 0, 'solde nul');
assert.equal(relancesDues([facture({})], P, '2026-10-08')[0].jours, 7);

const modele = facture({ id: 'm', recurrence: { frequence: 'mensuelle', prochaine: '2026-10-16', actif: true, generees: [] } });
const plan = planifierRecurrences([modele], '2026-10-16');
assert.equal(plan.nouvelles.length, 1);
assert.equal(plan.modeles[0].recurrence.prochaine, '2026-11-16');
const miroir = miroirPublic({ ...plan.nouvelles[0], id: 'n1', status: 'Sent' }, { ...P, paiementCarte: true }, [modele], '2026-10-16T12:00:00.000Z');
assert.equal(miroir.solde, 100);
assert.equal(miroir.paiementCarte, true);
assert.equal(miroir.statut, 'Sent');

console.log('verif-factures : tout passe.');
