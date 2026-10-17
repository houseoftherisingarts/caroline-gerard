// État des résultats, répartitions et export : fonctions pures pour la page Finances (Aperçu et
// Rapports), sans accès Firestore. Contrat du bâtisseur L, voir lib/compta/types.ts.
import type { Compte, Transaction, Periode, Sens } from './types';
import type { Document } from '../../types';
import { dansPeriode } from './periodes';

// Taux combiné TPS+TVQ appliqué au sous-total des items d'une facture (voir l'ancien AdminFinance.tsx :
// la collection `documents` ne porte pas de TPS/TVQ détaillées, contrairement aux transactions comptables).
const TAUX_TAXES_FACTURES = 0.14975;

/** Total taxes incluses d'une facture ou d'un devis (collection `documents`). */
export function totalDocumentTTC(doc: Pick<Document, 'items'>): number {
  const sousTotal = doc.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  return sousTotal * (1 + TAUX_TAXES_FACTURES);
}

// --- État des résultats ---

export interface ColonnePeriode extends Periode {
  cle: string;
}

export interface LigneEtatCompte {
  compte: Compte;
  parColonne: number[];
  total: number;
}

export interface EtatDesResultats {
  colonnes: ColonnePeriode[];
  revenus: LigneEtatCompte[];
  depenses: LigneEtatCompte[];
  totalRevenusParColonne: number[];
  totalDepensesParColonne: number[];
  profitParColonne: number[];
  totalRevenus: number;
  totalDepenses: number;
  profit: number;
}

const MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Découpe une période arbitraire (bornes ISO) en colonnes calendaires, mois par mois ou trimestre par
// trimestre, sans dépendre de la date de début d'exercice (lib/compta/periodes.ts s'en charge pour
// construire la période elle-même ; ici on ne fait que l'afficher en colonnes).
function colonnesDePeriode(periode: Periode, granularite: 'mois' | 'trimestre'): ColonnePeriode[] {
  const debut = new Date(`${periode.debut}T00:00:00Z`);
  const fin = new Date(`${periode.fin}T00:00:00Z`);
  const pas = granularite === 'mois' ? 1 : 3;
  const colonnes: ColonnePeriode[] = [];
  let curseur = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), 1));
  while (curseur <= fin) {
    const finColonne = new Date(Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() + pas, 0));
    const colDebut = curseur < debut ? debut : curseur;
    const colFin = finColonne > fin ? fin : finColonne;
    const libelle =
      granularite === 'mois'
        ? `${MOIS_FR[curseur.getUTCMonth()]} ${curseur.getUTCFullYear()}`
        : `T${Math.floor(curseur.getUTCMonth() / 3) + 1} ${curseur.getUTCFullYear()}`;
    colonnes.push({ cle: iso(curseur), libelle, debut: iso(colDebut), fin: iso(colFin) });
    curseur = new Date(Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() + pas, 1));
  }
  return colonnes;
}

/** État des résultats : revenus et dépenses par compte, en colonnes mensuelles ou trimestrielles. */
export function etatDesResultats(
  transactions: Transaction[],
  comptes: Compte[],
  periode: Periode,
  granularite: 'mois' | 'trimestre' = 'mois'
): EtatDesResultats {
  const colonnes = colonnesDePeriode(periode, granularite);
  const enPeriode = transactions.filter((tr) => dansPeriode(tr.date, periode));

  const ligneCompte = (compte: Compte): LigneEtatCompte => {
    const parColonne = colonnes.map((col) =>
      enPeriode
        .filter((tr) => tr.compteId === compte.id && dansPeriode(tr.date, col))
        .reduce((s, tr) => s + tr.montant, 0)
    );
    return { compte, parColonne, total: parColonne.reduce((a, b) => a + b, 0) };
  };

  const comptesActifs = (sens: Sens) => comptes.filter((c) => c.sens === sens && c.actif).sort((a, b) => a.ordre - b.ordre);
  const revenus = comptesActifs('revenu').map(ligneCompte);
  const depenses = comptesActifs('depense').map(ligneCompte);

  const totalRevenusParColonne = colonnes.map((_, i) => revenus.reduce((s, l) => s + l.parColonne[i], 0));
  const totalDepensesParColonne = colonnes.map((_, i) => depenses.reduce((s, l) => s + l.parColonne[i], 0));
  const profitParColonne = colonnes.map((_, i) => totalRevenusParColonne[i] - totalDepensesParColonne[i]);
  const totalRevenus = totalRevenusParColonne.reduce((a, b) => a + b, 0);
  const totalDepenses = totalDepensesParColonne.reduce((a, b) => a + b, 0);

  return {
    colonnes,
    revenus,
    depenses,
    totalRevenusParColonne,
    totalDepensesParColonne,
    profitParColonne,
    totalRevenus,
    totalDepenses,
    profit: totalRevenus - totalDepenses,
  };
}

// --- Répartitions ---

export interface RepartitionCompte {
  compte: Compte;
  montant: number;
  part: number; // 0 à 1
}

/** Dépenses de la période groupées par compte, triées de la plus grosse à la plus petite. */
export function depensesParCompte(transactions: Transaction[], comptes: Compte[], periode: Periode): RepartitionCompte[] {
  const enPeriode = transactions.filter((tr) => tr.sens === 'depense' && dansPeriode(tr.date, periode));
  const total = enPeriode.reduce((s, tr) => s + tr.montant, 0);
  const parCompte = new Map<string, number>();
  for (const tr of enPeriode) parCompte.set(tr.compteId, (parCompte.get(tr.compteId) || 0) + tr.montant);
  const lignes: RepartitionCompte[] = [];
  for (const [compteId, montant] of parCompte) {
    const compte = comptes.find((c) => c.id === compteId);
    if (!compte) continue; // sans catégorie : voir le « À faire » de l'aperçu, pas cette répartition
    lignes.push({ compte, montant, part: total > 0 ? montant / total : 0 });
  }
  return lignes.sort((a, b) => b.montant - a.montant);
}

export interface RevenuTiers {
  tiers: string; // '' = sans client assigné
  parCompte: { compte: Compte; montant: number }[];
  total: number;
}

/** Revenus de la période groupés par tiers (client), puis par compte (service). */
export function revenusParTiers(transactions: Transaction[], comptes: Compte[], periode: Periode): RevenuTiers[] {
  const enPeriode = transactions.filter((tr) => tr.sens === 'revenu' && dansPeriode(tr.date, periode));
  const parTiers = new Map<string, Map<string, number>>();
  for (const tr of enPeriode) {
    const cle = tr.tiers?.trim() || '';
    if (!parTiers.has(cle)) parTiers.set(cle, new Map());
    const m = parTiers.get(cle)!;
    m.set(tr.compteId, (m.get(tr.compteId) || 0) + tr.montant);
  }
  const lignes: RevenuTiers[] = [];
  for (const [tiers, m] of parTiers) {
    const parCompte = [...m.entries()]
      .map(([compteId, montant]) => ({ compte: comptes.find((c) => c.id === compteId), montant }))
      .filter((l): l is { compte: Compte; montant: number } => !!l.compte);
    lignes.push({ tiers, parCompte, total: parCompte.reduce((s, l) => s + l.montant, 0) });
  }
  return lignes.sort((a, b) => b.total - a.total);
}

// --- Âge des comptes clients ---

export interface TrancheAge {
  libelle: '0-30' | '31-60' | '61-90' | '90+';
  montant: number;
  nombre: number;
}

export interface AgeComptesClients {
  tranches: TrancheAge[];
  total: number;
  nombreTotal: number;
}

/** Factures envoyées et impayées (`documents`, statut Sent), classées par jours écoulés depuis l'échéance. */
export function ageDesComptesClients(documents: Document[], aujourdhui: Date): AgeComptesClients {
  const tranches: TrancheAge[] = [
    { libelle: '0-30', montant: 0, nombre: 0 },
    { libelle: '31-60', montant: 0, nombre: 0 },
    { libelle: '61-90', montant: 0, nombre: 0 },
    { libelle: '90+', montant: 0, nombre: 0 },
  ];
  const impayees = documents.filter((d) => d.type === 'Invoice' && d.status === 'Sent');
  for (const doc of impayees) {
    const reference = doc.dueDate || doc.date;
    if (!reference) continue;
    const jours = Math.max(0, Math.floor((aujourdhui.getTime() - new Date(reference).getTime()) / 86400000));
    const idx = jours <= 30 ? 0 : jours <= 60 ? 1 : jours <= 90 ? 2 : 3;
    tranches[idx].montant += totalDocumentTTC(doc);
    tranches[idx].nombre += 1;
  }
  return {
    tranches,
    total: tranches.reduce((s, t) => s + t.montant, 0),
    nombreTotal: tranches.reduce((s, t) => s + t.nombre, 0),
  };
}

// --- Export CSV ---

function echapperCsv(v: string | number): string {
  // Une cellule texte qui commence par = + - @ tabulation ou retour chariot serait lue comme une
  // formule par Excel (injection CSV) : on la préfixe d'une apostrophe et on la cite.
  const formule = typeof v === 'string' && /^[=+\-@\t\r]/.test(v);
  const s = formule ? `'${v}` : String(v);
  return formule || /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Sérialise des lignes (objets à plat) en CSV ; les clés du premier objet donnent l'en-tête. */
export function exportCsv(lignes: Record<string, string | number>[]): string {
  if (lignes.length === 0) return '';
  const entetes = Object.keys(lignes[0]);
  const corps = lignes.map((l) => entetes.map((e) => echapperCsv(l[e])).join(','));
  return [entetes.join(','), ...corps].join('\n');
}

/** Déclenche le téléchargement d'un CSV côté navigateur (même mécanisme que l'ancien grand livre). */
export function telechargerCsv(nomFichier: string, contenu: string): void {
  const lien = window.document.createElement('a');
  lien.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(contenu);
  lien.download = nomFichier;
  window.document.body.appendChild(lien);
  lien.click();
  window.document.body.removeChild(lien);
}
