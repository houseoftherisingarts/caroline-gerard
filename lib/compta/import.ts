// Import d'un relevé bancaire : CSV (Desjardins, RBC, BNC, ou tout export à colonnes) et OFX/QFX.
// Détection des colonnes, aperçu avant import, empreinte de dédoublonnage, split automatique des
// taxes, règles de catégorisation apprises. Fonctions pures : aucune écriture Firestore ici, les
// composants (Import.tsx) appellent lib/firestore.ts avec le résultat.
import type { RegleCategorisation } from './types';
import { arrondiSous } from './format';

export interface LigneImport {
  date: string; // AAAA-MM-JJ
  description: string;
  /** Positif = crédit (revenu), négatif = débit (dépense). */
  montant: number;
}

export interface Apercu {
  colonnes: string[];
  lignes: string[][];
  /** Index détecté (ou -1) dans `colonnes` pour chaque champ. */
  detection: { date: number; description: number; debit: number; credit: number; montant: number };
}

// --- CSV ---

/** Sépare une ligne CSV en tenant compte des guillemets, avec le délimiteur détecté (`,` ou `;`). */
function decouperLigneCsv(ligne: string, delim: string): string[] {
  const cellules: string[] = [];
  let courant = '';
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      dansGuillemets = !dansGuillemets;
    } else if (c === delim && !dansGuillemets) {
      cellules.push(courant.trim());
      courant = '';
    } else {
      courant += c;
    }
  }
  cellules.push(courant.trim());
  return cellules;
}

const MOTS_DATE = ['date', 'transaction date', 'date de transaction', 'posted'];
const MOTS_DESC = ['description', 'description 1', 'memo', 'détail', 'libellé', 'name'];
const MOTS_DEBIT = ['débit', 'debit', 'retrait', 'withdrawal'];
const MOTS_CREDIT = ['crédit', 'credit', 'dépôt', 'deposit'];
const MOTS_MONTANT = ['montant', 'amount', 'cad$', 'usd$'];

function trouveColonne(entetes: string[], mots: string[]): number {
  const bas = entetes.map((e) => e.toLowerCase().trim());
  for (const mot of mots) {
    const i = bas.findIndex((e) => e === mot || e.includes(mot));
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Aperçu d'un CSV : détecte le délimiteur, sépare les cellules, propose des colonnes par défaut.
 * L'export réel d'une institution varie (Desjardins et BNC n'ont parfois pas d'en-tête) : la détection
 * n'est qu'une proposition, l'écran d'aperçu (Import.tsx) laisse Laurie corriger avant d'importer.
 */
export function apercuCsv(texte: string): Apercu {
  const lignesBrutes = texte.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delim = (lignesBrutes[0]?.split(';').length || 0) > (lignesBrutes[0]?.split(',').length || 0) ? ';' : ',';
  const toutesLignes = lignesBrutes.map((l) => decouperLigneCsv(l, delim));

  // En-tête réelle si la première ligne contient au moins un mot connu; sinon on nomme les colonnes.
  const premiere = toutesLignes[0] || [];
  const aUneEntete = premiere.some((cell) =>
    [...MOTS_DATE, ...MOTS_DESC, ...MOTS_DEBIT, ...MOTS_CREDIT, ...MOTS_MONTANT].includes(cell.toLowerCase())
  );
  const colonnes = aUneEntete ? premiere : premiere.map((_, i) => `Colonne ${i + 1}`);
  const lignes = aUneEntete ? toutesLignes.slice(1) : toutesLignes;

  return {
    colonnes,
    lignes,
    detection: {
      date: trouveColonne(colonnes, MOTS_DATE),
      description: trouveColonne(colonnes, MOTS_DESC),
      debit: trouveColonne(colonnes, MOTS_DEBIT),
      credit: trouveColonne(colonnes, MOTS_CREDIT),
      montant: trouveColonne(colonnes, MOTS_MONTANT),
    },
  };
}

/** Formats de date courants dans les exports bancaires québécois : ISO, et JJ/MM/AAAA ou MM/JJ/AAAA. */
export function parseDateSouple(brut: string): string | null {
  const s = brut.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Format nord-américain courant des exports RBC/BNC : MM/JJ/AAAA. Le mois > 12 révèle un JJ/MM/AAAA.
  const barres = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (barres) {
    let [, a, b, annee] = barres;
    let mois = Number(a);
    let jour = Number(b);
    if (mois > 12) { [mois, jour] = [jour, mois]; }
    return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
  }
  return null;
}

function parseMontant(brut: string): number {
  const nettoye = brut.replace(/[^0-9,.\-]/g, '').replace(',', '.');
  const v = parseFloat(nettoye);
  return Number.isFinite(v) ? v : 0;
}

/** Construit les lignes normalisées à partir d'un aperçu et des index de colonnes choisis (par Laurie ou détectés). */
export function lignesDepuisApercu(
  apercu: Apercu,
  colonnesChoisies: { date: number; description: number; debit: number; credit: number; montant: number }
): LigneImport[] {
  const resultat: LigneImport[] = [];
  for (const ligne of apercu.lignes) {
    const dateBrute = ligne[colonnesChoisies.date];
    const date = dateBrute ? parseDateSouple(dateBrute) : null;
    if (!date) continue;
    const description = (ligne[colonnesChoisies.description] || '').trim();
    let montant: number;
    if (colonnesChoisies.montant >= 0) {
      montant = parseMontant(ligne[colonnesChoisies.montant] || '0');
    } else {
      const debit = parseMontant(ligne[colonnesChoisies.debit] || '0');
      const credit = parseMontant(ligne[colonnesChoisies.credit] || '0');
      montant = credit - Math.abs(debit);
    }
    resultat.push({ date, description, montant });
  }
  return resultat;
}

// --- OFX / QFX ---
// L'OFX est du SGML, pas du XML strict : la plupart des champs n'ont pas de balise fermante
// (`<TRNAMT>12.50` finit à la fin de la ligne). Extraction par expression régulière, pas de parseur XML.

function champOfx(bloc: string, balise: string): string {
  const m = bloc.match(new RegExp(`<${balise}>\\s*([^<\\r\\n]*)`, 'i'));
  return m ? m[1].trim() : '';
}

/** AAAAMMJJ[HHMMSS][.mmm][fuseau] → AAAA-MM-JJ */
function dateOfxVersIso(brut: string): string | null {
  const m = brut.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseOfx(texte: string): LigneImport[] {
  const blocs = texte.split(/<STMTTRN>/i).slice(1);
  const resultat: LigneImport[] = [];
  for (const bloc of blocs) {
    const fin = bloc.search(/<\/STMTTRN>/i);
    const segment = fin >= 0 ? bloc.slice(0, fin) : bloc;
    const date = dateOfxVersIso(champOfx(segment, 'DTPOSTED'));
    const montantBrut = champOfx(segment, 'TRNAMT');
    if (!date || !montantBrut) continue;
    const description = champOfx(segment, 'NAME') || champOfx(segment, 'MEMO') || 'Transaction';
    resultat.push({ date, description, montant: parseFloat(montantBrut) || 0 });
  }
  return resultat;
}

// --- Dédoublonnage ---

/** Empreinte stable date+montant+description, pour ne jamais importer deux fois la même ligne. */
export function empreinte(ligne: LigneImport): string {
  const desc = ligne.description.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${ligne.date}|${ligne.montant.toFixed(2)}|${desc}`;
}

// --- Règles de catégorisation ---

/** Cherche la première règle dont le motif apparaît dans la description (insensible à la casse). */
export function appliquerRegles(
  description: string,
  regles: RegleCategorisation[]
): { compteId: string; tiers?: string } | null {
  const bas = description.toLowerCase();
  const trouvee = regles.find((r) => r.motif && bas.includes(r.motif.toLowerCase()));
  return trouvee ? { compteId: trouvee.compteId, tiers: trouvee.tiers } : null;
}

/**
 * Motif appris d'une description réelle, pour la prochaine importation. ponytail : heuristique simple
 * (préfixe avant le premier bloc de chiffres, ex. « TIM HORTONS #4821 » → « tim hortons »), pas de NLP.
 * À corriger à la main dans PlanComptable si une description commence directement par des chiffres.
 */
export function motifAppris(description: string): string {
  const sansChiffres = description.toLowerCase().replace(/[0-9#*].*$/, '').trim();
  const motif = (sansChiffres || description.toLowerCase()).replace(/\s+/g, ' ').trim();
  return motif.slice(0, 40);
}

// --- Split des taxes ---

export interface SplitTaxes {
  montant: number;
  tps: number;
  tvq: number;
  total: number;
}

/**
 * Calcule TPS (5 %) et TVQ (9,975 %) à partir d'un montant. Deux sens :
 * - `depuisTotal: true` : `montant` est le total taxes incluses (cas courant d'un relevé bancaire).
 *   Le montant avant taxes est déduit, puis TPS et TVQ arrondis indépendamment; `total` reste la
 *   valeur d'origine (voir arrondiSous, la convention d'arrondi est documentée là).
 * - `depuisTotal: false` (par défaut) : `montant` est déjà avant taxes, `total` est calculé.
 * `sansTaxes: true` retourne montant tel quel, TPS et TVQ à zéro.
 */
export function calculerTaxes(
  montant: number,
  opts: { depuisTotal?: boolean; sansTaxes?: boolean; tauxTPS?: number; tauxTVQ?: number } = {}
): SplitTaxes {
  const tauxTPS = (opts.tauxTPS ?? 5) / 100;
  const tauxTVQ = (opts.tauxTVQ ?? 9.975) / 100;

  if (opts.sansTaxes) {
    const v = arrondiSous(montant);
    return { montant: v, tps: 0, tvq: 0, total: v };
  }

  if (opts.depuisTotal) {
    const total = arrondiSous(montant);
    const avantTaxes = arrondiSous(total / (1 + tauxTPS + tauxTVQ));
    const tps = arrondiSous(avantTaxes * tauxTPS);
    const tvq = arrondiSous(avantTaxes * tauxTVQ);
    return { montant: avantTaxes, tps, tvq, total };
  }

  const avantTaxes = arrondiSous(montant);
  const tps = arrondiSous(avantTaxes * tauxTPS);
  const tvq = arrondiSous(avantTaxes * tauxTVQ);
  return { montant: avantTaxes, tps, tvq, total: arrondiSous(avantTaxes + tps + tvq) };
}
