// Dépense refacturable au client (module comptable). Fonctions pures partagées par Transactions.tsx
// (marquer une dépense « à refacturer ») et par l'éditeur de factures (importer ces dépenses en lignes).
// Contrat : lib/compta/types.ts (Transaction.refacturable, refactureA, refactureeDans).
import type { Transaction } from './types';
import type { InvoiceItem } from '../../types';
import { patchDoc } from './ancrage';

/** Dépenses marquées refacturables, pas encore portées sur une facture, pour un client donné (ou tous si vide). */
export function depensesRefacturables(transactions: Transaction[], clientName = ''): Transaction[] {
  const cible = clientName.trim().toLowerCase();
  return transactions.filter(
    (t) => t.sens === 'depense' && t.refacturable && !t.refactureeDans &&
      (!cible || (t.refactureA ?? t.tiers ?? '').trim().toLowerCase() === cible)
  );
}

/** Ligne de facture tirée d'une dépense : montant avant taxes, les taxes se recalculent sur la facture. */
export function ligneDepuisDepense(t: Transaction): InvoiceItem {
  return { id: `dep-${t.id}`, description: `${t.description} (${t.date})`, quantity: 1, price: t.montant };
}

/** Une fois la facture enregistrée, la dépense porte son identifiant et sort de la liste « à refacturer ». */
export async function marquerRefacturees(transactionIds: string[], factureId: string): Promise<void> {
  await Promise.all(transactionIds.map((id) => patchDoc<Transaction>('transactions', id, { refactureeDans: factureId })));
}
