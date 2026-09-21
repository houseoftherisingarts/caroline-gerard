// Banc d'essai : remplace lib/firestore pour rendre les pages Ventes & stock et Dépositaires
// avec des données factices, sans Firebase ni connexion. Fichier temporaire de vérification.
import type { ConsignmentLocation, ConsignmentMovement, StockMovement } from '../../../types';

const LOCS: ConsignmentLocation[] = [
  { id: 'l1', name: "Zélia Galerie d'art", commissionPct: 30, createdAt: '2026-05-01T00:00:00Z' },
  { id: 'l2', name: 'Librairie Magie-Lune', commissionPct: 40, createdAt: '2026-05-01T00:00:00Z' },
];
const CONS: ConsignmentMovement[] = [
  { id: 'c1', locationId: 'l1', type: 'depot', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 10, date: '2026-06-02', createdAt: '2026-06-02T12:00:00Z' },
  { id: 'c2', locationId: 'l1', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 3, unitPrice: 25, commissionPct: 30, tpsPct: 5, tps: 3.57, tvq: 0, taxesIncluses: true, date: '2026-08-14', createdAt: '2026-08-14T12:00:00Z' },
  { id: 'c3', locationId: 'l2', type: 'depot', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 6, date: '2026-06-10', createdAt: '2026-06-10T12:00:00Z' },
  { id: 'c4', locationId: 'l2', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 2, unitPrice: 25, commissionPct: 40, tpsPct: 0, tps: 0, tvq: 0, date: '2026-09-03', createdAt: '2026-09-03T12:00:00Z' },
  { id: 'c5', locationId: 'l1', type: 'paiement', amount: 50, date: '2026-09-01', createdAt: '2026-09-01T12:00:00Z' },
];
const STOCK: StockMovement[] = [
  { id: 's1', type: 'entree', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 60, date: '2026-05-20', note: 'Inventaire de départ', createdAt: '2026-05-20T12:00:00Z' },
  { id: 's2', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 4, unitPrice: 25, payment: 'comptant', eventName: 'Marché Capibusca', eventCost: 40, tpsPct: 5, tps: 5, tvq: 0, date: '2026-07-19', createdAt: '2026-07-19T12:00:00Z' },
  { id: 's3', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 1, unitPrice: 25, payment: 'web', shipping: 10, tpsPct: 5, tps: 1.75, tvq: 1, date: '2026-08-02', createdAt: '2026-08-02T12:00:00Z' },
  { id: 's4', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 2, unitPrice: 25, payment: 'square', tip: 5, eventName: 'Salon du livre de Rimouski', tpsPct: 5, tps: 2.5, tvq: 0, date: '2026-09-12', createdAt: '2026-09-12T12:00:00Z' },
  { id: 's5', type: 'vente', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 1, unitPrice: 25, payment: 'comptant', date: '2026-06-05', createdAt: '2026-06-05T12:00:00Z' },
  { id: 's6', type: 'don', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: 3, note: 'Bibliothèque de Trois-Pistoles', date: '2026-09-10', createdAt: '2026-09-10T12:00:00Z' },
  { id: 's7', type: 'ajustement', bookId: 'b1', bookTitle: 'William et les univers invisibles', qty: -1, note: 'Exemplaire abîmé', date: '2026-08-20', createdAt: '2026-08-20T12:00:00Z' },
];

const sub = <T,>(data: T[]) => (cb: (items: T[]) => void) => { cb(data); return () => {}; };
export const subscribeToConsignmentLocations = sub(LOCS);
export const subscribeToConsignmentMovements = sub(CONS);
export const subscribeToStockMovements = sub(STOCK);
export const saveStockMovement = async () => {};
export const deleteStockMovement = async () => {};
export const saveConsignmentLocation = async () => {};
export const deleteConsignmentLocation = async () => {};
export const saveConsignmentMovement = async () => {};
export const deleteConsignmentMovement = async () => {};
