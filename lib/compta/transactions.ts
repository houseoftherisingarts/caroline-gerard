// Cœur comptable : lecture temps réel, écriture, dérivation depuis les factures payées, totaux par
// période. Les composants de components/admin/finances/ passent tous par ici, jamais directement par
// lib/firestore.ts pour la collection `transactions`.
import { useMemo } from 'react';
import { serverTimestamp, deleteField } from 'firebase/firestore';
import { useCollection, createDoc, patchDoc, removeDoc, writeDoc } from './ancrage';
import type { Periode, Transaction } from './types';
import type { Document as DocumentFacture } from '../../types';
import { arrondiSous } from './format';
import { dansPeriode } from './periodes';

const TAUX_TPS_DEFAUT = 0.05;
const TAUX_TVQ_DEFAUT = 0.09975;

function totalAvantTaxes(items: { quantity: number; price: number }[] = []): number {
  return items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
}

/**
 * Dérive des transactions de revenu à partir des factures payées (collection `documents`). Pure et
 * idempotente : l'identifiant de chaque transaction dérivée est `facture_<idFacture>`, toujours le
 * même pour une même facture. Ne catégorise pas (compte « Autres revenus » par défaut) : Laurie
 * recatégorise dans Transactions.tsx si besoin, une seule fois, l'import suivant ne l'écrase pas.
 */
export function transactionsDepuisFactures(
  documents: DocumentFacture[]
): Array<{ id: string } & Omit<Transaction, 'id' | 'cree' | 'modifie'>> {
  return documents
    .filter((d) => d.type === 'Invoice' && d.status === 'Paid' && d.date)
    .map((d) => {
      const montant = arrondiSous(totalAvantTaxes(d.items));
      const tps = arrondiSous(montant * TAUX_TPS_DEFAUT);
      const tvq = arrondiSous(montant * TAUX_TVQ_DEFAUT);
      return {
        id: `facture_${d.id}`,
        date: d.date,
        description: `Facture ${d.number}, ${d.clientName}`,
        sens: 'revenu' as const,
        montant,
        tps,
        tvq,
        total: arrondiSous(montant + tps + tvq),
        compteId: 'rev-autres',
        tiers: d.clientName,
        source: 'facture' as const,
        factureId: d.id,
        concilie: false,
      };
    });
}

/** Écrit seulement les factures payées qui n'ont pas encore de transaction (par factureId). */
export async function importerFacturesPayees(
  documents: DocumentFacture[],
  transactionsExistantes: Transaction[]
): Promise<number> {
  const dejaImportees = new Set(transactionsExistantes.filter((t) => t.factureId).map((t) => t.factureId));
  const candidates = transactionsDepuisFactures(documents).filter((c) => !dejaImportees.has(c.factureId));
  for (const { id, ...data } of candidates) {
    await writeDoc('transactions', id, { ...data, cree: serverTimestamp(), modifie: serverTimestamp() });
  }
  return candidates.length;
}

export async function ajouterTransaction(
  data: Omit<Transaction, 'id' | 'cree' | 'modifie'>
): Promise<string> {
  // Firestore refuse `undefined` : un champ vide ne s'écrit pas.
  const propre = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  return createDoc<any>('transactions', { ...propre, cree: serverTimestamp(), modifie: serverTimestamp() }, { withTimestamp: false });
}

export async function modifierTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  const { id: _drop, cree: _c, modifie: _m, ...rest } = patch as any;
  // `undefined` retire le champ (décocher « À refacturer », supprimer la récurrence).
  const champs = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === undefined ? deleteField() : v]));
  await patchDoc('transactions', id, { ...champs, modifie: serverTimestamp() });
}

export async function supprimerTransaction(id: string): Promise<void> {
  await removeDoc('transactions', id);
}

export function totaux(
  transactions: Transaction[],
  periode: Periode
): { revenus: number; depenses: number; profit: number; tpsPercue: number; tvqPercue: number; tpsPayee: number; tvqPayee: number } {
  const dans = transactions.filter((t) => dansPeriode(t.date, periode));
  const revenus = dans.filter((t) => t.sens === 'revenu');
  const depenses = dans.filter((t) => t.sens === 'depense');
  const somme = (arr: Transaction[], champ: 'montant' | 'tps' | 'tvq') => arrondiSous(arr.reduce((s, t) => s + (t[champ] || 0), 0));
  const totalRevenus = somme(revenus, 'montant');
  const totalDepenses = somme(depenses, 'montant');
  return {
    revenus: totalRevenus,
    depenses: totalDepenses,
    profit: arrondiSous(totalRevenus - totalDepenses),
    tpsPercue: somme(revenus, 'tps'),
    tvqPercue: somme(revenus, 'tvq'),
    tpsPayee: somme(depenses, 'tps'),
    tvqPayee: somme(depenses, 'tvq'),
  };
}

// --- Jeu d'exemple pour la boucle de vérification visuelle (mode `verif` seulement, voir CLAUDE.md) ---
// Une année plausible de revenus et de dépenses d'une consultante autonome. Jamais utilisé en
// production : `useTransactions` ne s'en sert que si le document réel est vide sous MODE === 'verif'.

function genererExemple(): Transaction[] {
  const annee = new Date().getFullYear();
  const items: Transaction[] = [];
  let n = 0;
  const ajoute = (t: Omit<Transaction, 'id' | 'cree' | 'modifie'>) => {
    n += 1;
    items.push({ ...t, id: `exemple-${n}`, cree: null, modifie: null });
  };

  const clientsRecurrents = ['Compagnie de danse Fil Rouge', 'Studio Ancrage', 'Coop des Arts Vivants', 'Marie-Ève Boutin', 'Festival des Cimes'];
  const fournisseurs = ['Bell Mobilité', 'Adobe', 'Canva', 'Postes Canada', 'Meta Ads', 'Loyer bureau', 'Assurance Beneva', 'Stripe'];

  // Revenus : une facture par mois environ, réparties sur les quatre familles de service.
  const comptesRevenu = ['rev-accompagnement', 'rev-accompagnement', 'rev-formation', 'rev-conferences', 'rev-mentorat'];
  for (let m = 0; m < 12; m++) {
    const jour = 5 + (m % 3) * 8;
    const montant = 900 + ((m * 137) % 600);
    const compteId = comptesRevenu[m % comptesRevenu.length];
    ajoute({
      date: `${annee}-${String(m + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`,
      description: `Facture, ${clientsRecurrents[m % clientsRecurrents.length]}`,
      sens: 'revenu',
      montant: arrondiSous(montant),
      tps: arrondiSous(montant * TAUX_TPS_DEFAUT),
      tvq: arrondiSous(montant * TAUX_TVQ_DEFAUT),
      total: arrondiSous(montant * (1 + TAUX_TPS_DEFAUT + TAUX_TVQ_DEFAUT)),
      compteId,
      tiers: clientsRecurrents[m % clientsRecurrents.length],
      source: m % 4 === 0 ? 'facture' : 'manuel',
      factureId: m % 4 === 0 ? `demo-fact-${m}` : undefined,
      concilie: m < 9,
    });
    // Un deuxième revenu certains mois (mentorat ponctuel).
    if (m % 3 === 1) {
      const montant2 = 250 + (m % 5) * 40;
      ajoute({
        date: `${annee}-${String(m + 1).padStart(2, '0')}-${String(18 + (m % 6)).padStart(2, '0')}`,
        description: 'Séance de mentorat individuel',
        sens: 'revenu',
        montant: arrondiSous(montant2),
        tps: arrondiSous(montant2 * TAUX_TPS_DEFAUT),
        tvq: arrondiSous(montant2 * TAUX_TVQ_DEFAUT),
        total: arrondiSous(montant2 * (1 + TAUX_TPS_DEFAUT + TAUX_TVQ_DEFAUT)),
        compteId: 'rev-mentorat',
        tiers: clientsRecurrents[(m + 2) % clientsRecurrents.length],
        source: 'manuel',
        concilie: m < 9,
      });
    }
  }

  // Dépenses : quelques récurrentes chaque mois, plus des ponctuelles.
  const comptesDepenseRecurrents: Array<{ compteId: string; fournisseur: string; montant: number; deductible: number }> = [
    { compteId: 'dep-telecom', fournisseur: 'Bell Mobilité', montant: 65, deductible: 1 },
    { compteId: 'dep-logiciels', fournisseur: 'Adobe', montant: 32.99, deductible: 1 },
    { compteId: 'dep-logiciels', fournisseur: 'Canva', montant: 15, deductible: 1 },
    { compteId: 'dep-bureau-domicile', fournisseur: 'Loyer bureau', montant: 220, deductible: 1 },
    { compteId: 'dep-frais-bancaires', fournisseur: 'Stripe', montant: 42.5, deductible: 1 },
  ];
  for (let m = 0; m < 12; m++) {
    for (const dep of comptesDepenseRecurrents) {
      const montant = arrondiSous(dep.montant + (m % 3) * 1.5);
      ajoute({
        date: `${annee}-${String(m + 1).padStart(2, '0')}-03`,
        description: dep.fournisseur,
        sens: 'depense',
        montant,
        tps: arrondiSous(montant * TAUX_TPS_DEFAUT),
        tvq: arrondiSous(montant * TAUX_TVQ_DEFAUT),
        total: arrondiSous(montant * (1 + TAUX_TPS_DEFAUT + TAUX_TVQ_DEFAUT)),
        compteId: dep.compteId,
        tiers: dep.fournisseur,
        source: 'import',
        importId: `demo-import-${m}`,
        concilie: m < 9,
        recu: m % 4 === 0 ? { chemin: `recus/exemple-${m}.jpg`, url: '/images/banniere-defaut-960.jpg', nom: `recu-${dep.fournisseur.toLowerCase().replace(/\s+/g, '-')}.jpg`, contentType: 'image/jpeg', taille: 184320 } : undefined,
      });
    }
  }
  // Ponctuelles réparties dans l'année : publicité, repas, déplacements, formation, assurance, fournitures.
  const ponctuelles: Array<{ mois: number; jour: number; compteId: string; fournisseur: string; montant: number }> = [
    { mois: 1, jour: 14, compteId: 'dep-publicite', fournisseur: 'Meta Ads', montant: 180 },
    { mois: 2, jour: 20, compteId: 'dep-repas', fournisseur: 'Restaurant Le Local', montant: 86 },
    { mois: 3, jour: 9, compteId: 'dep-deplacements', fournisseur: 'Via Rail', montant: 145 },
    { mois: 4, jour: 25, compteId: 'dep-perfectionnement', fournisseur: 'Formation en ligne, marque personnelle', montant: 349 },
    { mois: 5, jour: 2, compteId: 'dep-assurances', fournisseur: 'Assurance Beneva', montant: 480 },
    { mois: 6, jour: 17, compteId: 'dep-fournitures', fournisseur: 'Bureau en Gros', montant: 63.4 },
    { mois: 7, jour: 30, compteId: 'dep-publicite', fournisseur: 'Meta Ads', montant: 220 },
    { mois: 8, jour: 11, compteId: 'dep-repas', fournisseur: 'Café Névé', montant: 34 },
    { mois: 9, jour: 22, compteId: 'dep-cotisations', fournisseur: 'Ordre professionnel', montant: 310 },
    { mois: 10, jour: 5, compteId: 'dep-deplacements', fournisseur: 'Essence, déplacement client', montant: 58 },
    { mois: 11, jour: 19, compteId: 'dep-fournitures', fournisseur: 'Postes Canada', montant: 27.15 },
    { mois: 12, jour: 8, compteId: 'dep-amortissement', fournisseur: 'Ordinateur portable (part affaires)', montant: 600 },
  ];
  for (const p of ponctuelles) {
    const montant = arrondiSous(p.montant);
    ajoute({
      date: `${annee}-${String(p.mois).padStart(2, '0')}-${String(p.jour).padStart(2, '0')}`,
      description: p.fournisseur,
      sens: 'depense',
      montant,
      tps: arrondiSous(montant * TAUX_TPS_DEFAUT),
      tvq: arrondiSous(montant * TAUX_TVQ_DEFAUT),
      total: arrondiSous(montant * (1 + TAUX_TPS_DEFAUT + TAUX_TVQ_DEFAUT)),
      compteId: p.compteId,
      tiers: p.fournisseur,
      source: 'manuel',
      concilie: p.mois <= 9,
    });
  }

  // Un modèle récurrent, une dépense à refacturer et une déjà refacturée, pour montrer ces trois états.
  const prochaineRec = new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10);
  const taxes = (m: number) => ({ tps: arrondiSous(m * TAUX_TPS_DEFAUT), tvq: arrondiSous(m * TAUX_TVQ_DEFAUT), total: arrondiSous(m * (1 + TAUX_TPS_DEFAUT + TAUX_TVQ_DEFAUT)) });
  ajoute({ date: `${annee}-01-02`, description: 'Hébergement du site', sens: 'depense', montant: 29, ...taxes(29), compteId: 'dep-logiciels', tiers: 'Hébergeur Nord', source: 'manuel', concilie: false,
    recurrence: { frequence: 'mensuelle', prochaine: prochaineRec, actif: true, generees: [] } });
  ajoute({ date: `${annee}-09-14`, description: 'Billets de train, atelier du client', sens: 'depense', montant: 212, ...taxes(212), compteId: 'dep-deplacements', tiers: 'Via Rail', source: 'manuel', concilie: false,
    refacturable: true, refactureA: 'Studio Ancrage' });
  ajoute({ date: `${annee}-08-21`, description: 'Impression des cahiers de formation', sens: 'depense', montant: 148, ...taxes(148), compteId: 'dep-fournitures', tiers: 'Imprimerie Cartier', source: 'manuel', concilie: false,
    refacturable: true, refactureA: 'Coop des Arts Vivants', refactureeDans: 'FAC-2026-014' });

  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

let EXEMPLE_TRANSACTIONS: Transaction[] | null = null;
function exempleTransactions(): Transaction[] {
  if (!EXEMPLE_TRANSACTIONS) EXEMPLE_TRANSACTIONS = genererExemple();
  return EXEMPLE_TRANSACTIONS;
}

/**
 * Lecture temps réel des transactions. En mode `verif` (boucle de vérification visuelle, aucun compte
 * admin), quand Firestore ne rend rien (les règles refusent la lecture sans authentification), une
 * année d'exemple réaliste prend le relais pour que les captures montrent un vrai grand livre.
 */
export function useTransactions() {
  const { data, loading, error } = useCollection<Transaction>('transactions');
  const modeVerif = import.meta.env.MODE === 'verif';
  const result = useMemo(() => {
    if (data.length > 0 || !modeVerif || loading) return data;
    return exempleTransactions();
  }, [data, modeVerif, loading]);
  return { data: result, loading: modeVerif ? false : loading, error };
}
