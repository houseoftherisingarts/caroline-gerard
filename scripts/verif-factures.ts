// Vérifications du calcul des factures (lib/factures-calcul.ts) : numérotation, rabais et remise,
// solde avec acomptes et notes de crédit, statut selon le solde, récurrences idempotentes.
//   npx esbuild scripts/verif-factures.ts --bundle --platform=node --format=esm --outfile=.verif-factures-tmp.mjs --log-level=error && node .verif-factures-tmp.mjs; rm -f .verif-factures-tmp.mjs
import assert from 'node:assert/strict';
import {
  avancer, calculerTotaux, enRetard, planifierRecurrences, prochainNumero, soldeFacture, statutSelonSolde,
} from '../lib/factures-calcul';
import type { Document } from '../types';

const taxes = { tps: '123', tvq: '456' };
const base = (p: Partial<Document>): Document => ({
  id: 'x', number: '', type: 'Invoice', clientId: 'c', clientName: 'Client', clientEmail: 'c@x.ca', date: '2026-10-01',
  dueDate: '2026-10-31', items: [{ id: 'l1', description: 'Atelier', quantity: 2, price: 500 }], status: 'Sent', terms: '', ...p,
} as Document);

// Numérotation : le plus grand de l'année plus un, par type, repart à 0001 l'année suivante.
const docs = [base({ number: 'FAC-2026-0007' }), base({ number: 'FAC-2026-0002' }), base({ number: 'DEV-2026-0003', type: 'Quote' }), base({ number: 'FAC-2025-0099' })];
assert.equal(prochainNumero(docs, 'Invoice', 2026), 'FAC-2026-0008');
assert.equal(prochainNumero(docs, 'Quote', 2026), 'DEV-2026-0004');
assert.equal(prochainNumero(docs, 'Credit', 2026), 'NC-2026-0001');
assert.equal(prochainNumero(docs, 'Invoice', 2027), 'FAC-2027-0001');

// Rabais 10 % sur la ligne, remise 100 $ avant les taxes, remise plafonnée au sous-total.
const t = calculerTotaux([{ id: 'l', description: 'a', quantity: 2, price: 500, rabais: 10 }], taxes, 100);
assert.equal(t.sousTotal, 900);
assert.equal(t.remise, 100);
assert.ok(Math.abs(t.total - 800 * 1.14975) < 1e-9);
assert.equal(calculerTotaux([{ id: 'l', description: 'a', quantity: 1, price: 50 }], taxes, 999).total, 0);
assert.equal(calculerTotaux([{ id: 'l', description: 'a', quantity: 1, price: 100 }], { tps: '', tvq: '' }).total, 100);

// Caroline : un livre ne porte que la TPS, le transport porte les deux, une ligne « aucune » rien.
const tl = calculerTotaux([
  { id: 'a', description: 'livre', quantity: 2, price: 25, taxe: 'tps' },
  { id: 'b', description: 'transport', quantity: 1, price: 6 },
  { id: 'c', description: 'don', quantity: 1, price: 10, taxe: 'aucune' },
], taxes);
assert.ok(Math.abs(tl.tps - 56 * 0.05) < 1e-9);
assert.ok(Math.abs(tl.tvq - 6 * 0.09975) < 1e-9);

// Solde : total 1149,75; acompte 500; note de crédit envoyée de 100 $ + taxes; un brouillon ne compte pas.
const fac = base({ id: 'f1', paiements: [{ id: 'p', date: '2026-10-02', montant: 500, mode: 'virement' }] });
const nc = base({ id: 'n1', type: 'Credit', factureId: 'f1', status: 'Sent', items: [{ id: 'l', description: 'c', quantity: 1, price: 100 }] });
const ncBrouillon = base({ id: 'n2', type: 'Credit', factureId: 'f1', status: 'Draft' });
const s = soldeFacture(fac, [fac, nc, ncBrouillon], taxes);
assert.equal(s.solde, Math.round((1149.75 - 500 - 114.975) * 100) / 100);
assert.equal(statutSelonSolde(fac, s), 'Partial');
const payee = base({ id: 'f1', paiements: [{ id: 'p', date: '2026-10-02', montant: 1149.75, mode: 'cheque' }] });
assert.equal(statutSelonSolde(payee, soldeFacture(payee, [payee], taxes)), 'Paid');
// Un remboursement (montant négatif) rouvre le solde : de Payée à Partielle.
const rembourse = base({ id: 'f1', status: 'Paid', paiements: [...payee.paiements!, { id: 'r', date: '2026-10-05', montant: -149.75, mode: 'autre' }] });
assert.equal(statutSelonSolde(rembourse, soldeFacture(rembourse, [rembourse], taxes)), 'Partial');
assert.equal(statutSelonSolde(base({ status: 'Paid' }), soldeFacture(base({ status: 'Paid' }), [], taxes)), 'Sent');

// Retard : échéance passée et pas payée.
assert.equal(enRetard(base({}), '2026-11-01'), true);
assert.equal(enRetard(base({ status: 'Paid' }), '2026-11-01'), false);
assert.equal(enRetard(base({}), '2026-10-31'), false);

// Récurrences : fin de mois ramenée au dernier jour, rattrapage des mois manqués, fin incluse, idempotence.
assert.equal(avancer('2026-01-31', 'mensuelle'), '2026-02-28');
assert.equal(avancer('2026-10-16', 'hebdomadaire'), '2026-10-23');
assert.equal(avancer('2024-02-29', 'annuelle'), '2025-02-28');
const modele = base({ id: 'm1', number: 'FAC-2026-0010', recurrence: { frequence: 'mensuelle', prochaine: '2026-08-01', fin: '2026-10-01', actif: true, generees: [] } });
const r1 = planifierRecurrences([modele], '2026-10-16');
assert.equal(r1.nouvelles.length, 3);
assert.deepEqual(r1.nouvelles.map((n) => n.number), ['FAC-2026-0011', 'FAC-2026-0012', 'FAC-2026-0013']);
assert.ok(r1.nouvelles.every((n) => n.status === 'Draft' && n.modeleId === 'm1' && n.dueDate === '2026-11-15'));
assert.deepEqual(r1.modeles[0].recurrence.generees, ['2026-08-01', '2026-09-01', '2026-10-01']);
const apres = [{ ...modele, recurrence: r1.modeles[0].recurrence }, ...r1.nouvelles.map((n, i) => ({ ...n, id: `g${i}` }) as Document)];
const r2 = planifierRecurrences(apres, '2026-10-16');
assert.equal(r2.nouvelles.length, 0);
assert.equal(planifierRecurrences([{ ...modele, recurrence: { ...modele.recurrence!, actif: false } }], '2026-10-16').nouvelles.length, 0);

console.log('verif-factures : tout passe.');
