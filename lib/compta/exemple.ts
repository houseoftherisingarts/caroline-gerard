// Jeu d'exemple en mémoire pour la boucle de vérification visuelle de Finances (--mode verif) : les
// factures qui alimentent l'âge des comptes clients (Apercu.tsx, Rapports.tsx), jamais utilisées en
// production (voir lib/compta/transactions.ts, même garde `import.meta.env.MODE === 'verif'`).
// Le grand livre de démonstration vit dans lib/compta/transactions.ts (useTransactions) : ce fichier
// ne duplique pas ces transactions, il complète seulement ce que useTransactions ne couvre pas.
import { REGLAGES_DEFAUT } from './types';
import type { ReglagesCompta } from './types';
import type { Document, DocumentStatus } from '../../types';

export const EXEMPLE_REGLAGES: ReglagesCompta = {
  ...REGLAGES_DEFAUT,
  numeroTPS: '123456789RT0001',
  numeroTVQ: '1234567890TQ0001',
  anneeFiscale: new Date().getFullYear(),
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ajouterJours = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

const AUJOURDHUI = new Date();

function facture(
  id: string,
  numero: string,
  clientName: string,
  clientEmail: string,
  joursDepasses: number,
  montantItem: number,
  status: DocumentStatus = 'Sent'
): Document {
  const dueDate = ajouterJours(AUJOURDHUI, -joursDepasses);
  return {
    id,
    number: numero,
    type: 'Invoice',
    clientId: id,
    clientName,
    clientEmail,
    date: iso(ajouterJours(dueDate, -15)),
    dueDate: iso(dueDate),
    items: [{ id: '1', description: 'Accompagnement stratégique', quantity: 1, price: montantItem }],
    status,
    terms: 'Paiement dû dans les 15 jours suivant réception.',
  };
}

// Six factures : deux à peine échues, deux nettement en retard, une pas encore due, une payée (pour
// montrer que « payée » sort bien de l'âge des comptes clients).
export const EXEMPLE_FACTURES: Document[] = [
  facture('ex-fac-1', 'FAC-2026-101', 'Studio Bruit Blanc', 'info@studiobruitblanc.example', 12, 950),
  facture('ex-fac-2', 'FAC-2026-098', 'Festival Traces', 'codirection@festivaltraces.example', 45, 1200),
  facture('ex-fac-3', 'FAC-2026-091', 'Collectif Angle Mort', 'accueil@collectifanglemort.example', 75, 680),
  facture('ex-fac-4', 'FAC-2026-084', 'École nationale de théâtre', 'administration@ecoletheatre.example', 130, 1500),
  facture('ex-fac-5', 'FAC-2026-112', 'Maison de la culture Frontenac', 'culture@frontenac.example', -5, 900),
  facture('ex-fac-6', 'FAC-2026-115', 'Ville de Repentigny, Service culturel', 'service.culturel@repentigny.example', -20, 1100, 'Paid'),
];
