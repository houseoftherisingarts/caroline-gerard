// Formatage des montants pour tout le module comptable : fr-CA, espace insécable avant le $, virgule
// décimale. Réutilisé par Transactions, Import, Conciliation, PlanComptable, Tiers, Recus et les
// rapports/fiscal des autres bâtisseurs de la vague. Un seul endroit, jamais de deuxième formatteur.
const MONNAIE = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
const MONNAIE_RONDE = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const NOMBRE = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const POURCENT = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 3 });

/** 1234.5 → "1 234,50 $" */
export function formatMontant(v: number | undefined | null): string {
  return MONNAIE.format(v || 0);
}

/**
 * 1234.5 → "1 235 $" (arrondi, sans décimale). Pour un gros chiffre en Playfair (Chiffre, ui.tsx) :
 * ",00 $" en plus alourdit une police déjà large et déborde de sa carte dans une grille à quatre
 * colonnes (bogue trouvé le 8 septembre sur Apercu.tsx, même convention que pages/AdminDashboard.tsx).
 */
export function formatMontantRond(v: number | undefined | null): string {
  return MONNAIE_RONDE.format(v || 0);
}

/** 1234.5 → "1 234,50" (sans symbole, pour une cellule de tableau dense). */
export function formatNombre(v: number | undefined | null): string {
  return NOMBRE.format(v || 0);
}

/** 9.975 → "9,975 %" */
export function formatPourcent(v: number | undefined | null): string {
  return `${POURCENT.format(v || 0)} %`;
}

/**
 * Arrondi bancaire à deux décimales. Convention du module : chaque composante (montant, TPS, TVQ) est
 * arrondie indépendamment au cent près; leur somme peut donc s'écarter d'un cent du total d'origine
 * (celui inscrit sur le relevé bancaire ou la facture). C'est la convention usuelle des logiciels
 * comptables : le total connu prime, l'écart d'arrondi ne se répercute jamais sur lui.
 */
export function arrondiSous(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
