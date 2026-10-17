// Le calcul de la facturation, sans Firestore : numéros en séquence, totaux avec rabais et remise,
// paiements, notes de crédit, solde et planification des factures récurrentes. Fonctions pures,
// vérifiées par scripts/verif-factures.ts; lib/factures.ts les réexporte et fait les écritures.
import type { Document, DocumentStatus, DocumentType, InvoiceItem, ModePaiement, Recurrence } from '../types';

export interface Totaux {
  sousTotal: number;
  remise: number;
  tps: number;
  tvq: number;
  total: number;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** AAAA-MM-JJ à l'heure locale (toISOString passerait au lendemain le soir, en UTC). */
export const aujourdhuiLocal = (): string => new Date().toLocaleDateString('en-CA');

/** Montant d'une ligne après son rabais en pourcentage. */
export function montantLigne(item: InvoiceItem): number {
  const rabais = Math.min(Math.max(Number(item.rabais) || 0, 0), 100);
  return item.quantity * item.price * (1 - rabais / 100);
}

/**
 * Pas de numéro de taxe inscrit dans les réglages, pas de ligne de taxe : la taxe suit ce que Laurie
 * a vraiment déclaré. La remise (en dollars) se retire du sous-total avant les taxes.
 */
export function calculerTotaux(
  items: InvoiceItem[],
  parametres: { tps: string; tvq: string },
  remise = 0,
): Totaux {
  const sousTotal = items.reduce((acc, item) => acc + montantLigne(item), 0);
  const remiseAppliquee = Math.min(Math.max(Number(remise) || 0, 0), Math.max(sousTotal, 0));
  const base = sousTotal - remiseAppliquee;
  // Ajout propre à Caroline : une ligne de livre ne porte que la TPS, une ligne « aucune » ne porte rien,
  // le reste (transport, œuvres) porte les deux. La remise se répartit au prorata des lignes.
  const facteur = sousTotal > 0 ? base / sousTotal : 0;
  const baseTps = items.reduce((a, i) => a + (i.taxe === 'aucune' ? 0 : montantLigne(i)), 0) * facteur;
  const baseTvq = items.reduce((a, i) => a + (i.taxe === 'tps' || i.taxe === 'aucune' ? 0 : montantLigne(i)), 0) * facteur;
  const tps = parametres.tps ? baseTps * 0.05 : 0;
  const tvq = parametres.tvq ? baseTvq * 0.09975 : 0;
  return { sousTotal, remise: remiseAppliquee, tps, tvq, total: base + tps + tvq };
}

export const PREFIXES: Record<DocumentType, string> = { Invoice: 'FAC', Quote: 'DEV', Credit: 'NC' };

/**
 * FAC-2026-0007 : le plus grand numéro de l'année pour ce type, plus un. Jamais au hasard.
 * ponytail: calculé sur la liste en direct; deux enregistrements à la même seconde depuis deux onglets
 * pourraient tomber sur le même numéro. Un compteur en transaction Firestore règle ça le jour où une
 * deuxième personne facture.
 */
export function prochainNumero(
  documents: Pick<Document, 'number'>[],
  type: DocumentType,
  annee = new Date().getFullYear(),
): string {
  const prefixe = `${PREFIXES[type]}-${annee}-`;
  const max = documents.reduce(
    (m, d) => (d.number?.startsWith(prefixe) ? Math.max(m, Number(d.number.slice(prefixe.length)) || 0) : m),
    0,
  );
  return `${prefixe}${String(max + 1).padStart(4, '0')}`;
}

export const totalDocument = (doc: Pick<Document, 'items' | 'remise'>, parametres: { tps: string; tvq: string }) =>
  calculerTotaux(doc.items, parametres, doc.remise).total;

export const montantPaye = (doc: Pick<Document, 'paiements'>) =>
  (doc.paiements || []).reduce((s, p) => s + (Number(p.montant) || 0), 0);

/** Les notes de crédit envoyées qui visent cette facture : elles seules réduisent le solde. */
export const creditsDe = (facture: Pick<Document, 'id'>, documents: Document[]) =>
  documents.filter((d) => d.type === 'Credit' && d.factureId === facture.id && d.status === 'Sent');

export interface Solde {
  total: number;
  paye: number;
  credits: number;
  solde: number;
}

export function soldeFacture(doc: Document, documents: Document[], parametres: { tps: string; tvq: string }): Solde {
  const total = totalDocument(doc, parametres);
  const paye = montantPaye(doc);
  const credits = doc.id ? creditsDe(doc, documents).reduce((s, c) => s + totalDocument(c, parametres), 0) : 0;
  return { total, paye, credits, solde: arrondi(total - paye - credits) };
}

/** Payée au solde nul, partielle dès un premier paiement, sinon le statut d'envoi d'avant. */
export function statutSelonSolde(doc: Document, s: Solde): DocumentStatus {
  if (doc.type !== 'Invoice') return doc.status;
  if (s.solde <= 0.005 && (s.paye > 0.005 || s.credits > 0.005)) return 'Paid';
  if (s.paye > 0.005) return 'Partial';
  return doc.status === 'Paid' || doc.status === 'Partial' ? 'Sent' : doc.status;
}

/** Publiée, acceptée ou en partie payée, et l'échéance est passée. */
export function enRetard(doc: Document, aujourdhui = aujourdhuiLocal()): boolean {
  return (doc.status === 'Sent' || doc.status === 'Accepted' || doc.status === 'Partial') && !!doc.dueDate && doc.dueDate < aujourdhui;
}

const MIDI = (iso: string) => new Date(`${iso}T12:00:00`);
const versIso = (d: Date) => d.toLocaleDateString('en-CA');

export const joursEntre = (de: string, a: string) => Math.round((MIDI(a).getTime() - MIDI(de).getTime()) / 86400000);

export function ajouterJours(iso: string, n: number): string {
  const d = MIDI(iso);
  d.setDate(d.getDate() + n);
  return versIso(d);
}

/** Une période plus loin. Un 31 du mois tombe au dernier jour d'un mois plus court. */
// ponytail: le 31 janvier passe au 28 février puis reste au 28; garder le jour d'origine dans Recurrence
// le jour où Laurie facture en fin de mois.
export function avancer(iso: string, frequence: Recurrence['frequence']): string {
  const d = MIDI(iso);
  if (frequence === 'hebdomadaire') return ajouterJours(iso, 7);
  const jour = d.getDate();
  d.setDate(1);
  if (frequence === 'mensuelle') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return versIso(d);
}

export type NouvelleFacture = Omit<Document, 'id'>;

/**
 * Les factures récurrentes dues aujourd'hui. Pour chaque modèle actif, tant que `prochaine` est passée
 * (et au plus tard à `fin`, incluse), une facture en brouillon datée du jour, avec le même délai de
 * paiement que le modèle. Chaque date créée s'ajoute à `generees` : une date déjà créée ne se recrée
 * jamais, même si la page s'ouvre deux fois.
 */
export function planifierRecurrences(
  documents: Document[],
  aujourdhui = aujourdhuiLocal(),
): { nouvelles: NouvelleFacture[]; modeles: { id: string; recurrence: Recurrence }[] } {
  const numeros: Pick<Document, 'number'>[] = [...documents];
  const nouvelles: NouvelleFacture[] = [];
  const modeles: { id: string; recurrence: Recurrence }[] = [];
  for (const modele of documents) {
    const r = modele.recurrence;
    if (modele.type !== 'Invoice' || !r?.actif || !r.prochaine) continue;
    const rec: Recurrence = { ...r, generees: [...(r.generees || [])] };
    let change = false;
    for (let garde = 0; rec.prochaine <= aujourdhui && (!rec.fin || rec.prochaine <= rec.fin) && garde < 400; garde++) {
      if (!rec.generees.includes(rec.prochaine)) {
        const number = prochainNumero(numeros, 'Invoice', Number(aujourdhui.slice(0, 4)));
        numeros.push({ number });
        const delai = modele.dueDate && modele.date ? joursEntre(modele.date, modele.dueDate) : null;
        nouvelles.push({
          number,
          type: 'Invoice',
          clientId: modele.clientId,
          clientName: modele.clientName,
          clientEmail: modele.clientEmail,
          date: aujourdhui,
          dueDate: delai !== null ? ajouterJours(aujourdhui, delai) : '',
          items: modele.items.map((i) => ({ ...i })),
          status: 'Draft',
          terms: modele.terms,
          remise: modele.remise || 0,
          modeleId: modele.id,
        });
        rec.generees.push(rec.prochaine);
      }
      rec.prochaine = avancer(rec.prochaine, rec.frequence);
      change = true;
    }
    if (change) modeles.push({ id: modele.id, recurrence: rec });
  }
  return { nouvelles, modeles };
}

// ─── Réglages et miroir public, sans Firestore (partagés avec functions/src/factures/) ─────────────

export interface ParametresFacturation {
  nomLegal: string;
  adresse: string;
  neq: string;
  tps: string;
  tvq: string;
  modalites: string;
  note: string;
  courriel: string;
  lienPaiementStripe: string;
  /** Bouton « Payer par carte » au montant exact sur la page publique (Stripe Checkout, côté serveur). */
  paiementCarte?: boolean;
  /** Le serveur relance seul une facture en retard à J+7, J+21 et J+45. */
  relancesAutomatiques?: boolean;
  /** Le serveur publie et envoie seul les factures récurrentes à leur date. */
  envoiRecurrences?: boolean;
}

export const REGLAGES_AUTOMATISMES = { paiementCarte: false, relancesAutomatiques: true, envoiRecurrences: true };

/** Le miroir public : tout ce qu'il faut pour afficher et payer la facture, rien de privé au-delà. */
export interface FacturePubliqueDoc {
  documentId: string;
  numero: string;
  type: DocumentType;
  date: string;
  dueDate: string | null;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  totaux: Totaux;
  statut: string;
  modalites: string;
  note: string;
  vendeur: { nomLegal: string; adresse: string; neq: string; tps: string; tvq: string; courriel: string };
  lienPaiementStripe: string;
  paiementCarte?: boolean;
  publieLe: string;
  remise?: number;
  /** Paiements reçus, sans la note privée de Laurie. */
  paiements?: { date: string; montant: number; mode: ModePaiement }[];
  /** Notes de crédit envoyées qui visent la facture. */
  credits?: { numero: string; montant: number }[];
  solde?: number;
  /** Note de crédit : le numéro de la facture créditée. */
  factureNumero?: string;
  /** Pièces jointes cochées « visible par le client ». */
  piecesJointes?: { nom: string; url: string }[];
}

/** La partie du miroir qui bouge après la publication : paiements, crédits, solde, pièces jointes. */
export function partieVivante(doc: Document, documents: Document[], parametres: ParametresFacturation) {
  return {
    statut: doc.status,
    paiements: (doc.paiements || []).map(({ date, montant, mode }) => ({ date, montant, mode })),
    credits: doc.id ? creditsDe(doc, documents).map((c) => ({ numero: c.number, montant: totalDocument(c, parametres) })) : [],
    solde: soldeFacture(doc, documents, parametres).solde,
    piecesJointes: (doc.piecesJointes || []).filter((p) => p.visibleClient).map(({ nom, url }) => ({ nom, url })),
  };
}

/** Le miroir complet d'un document, montants figés à `publieLe`. */
export function miroirPublic(doc: Document, parametres: ParametresFacturation, documents: Document[], publieLe: string): FacturePubliqueDoc {
  return {
    documentId: doc.id,
    numero: doc.number,
    type: doc.type,
    date: doc.date,
    dueDate: doc.dueDate || null,
    clientName: doc.clientName,
    clientEmail: doc.clientEmail,
    items: doc.items,
    totaux: calculerTotaux(doc.items, parametres, doc.remise),
    modalites: doc.terms,
    note: parametres.note,
    vendeur: {
      nomLegal: parametres.nomLegal,
      adresse: parametres.adresse,
      neq: parametres.neq,
      tps: parametres.tps,
      tvq: parametres.tvq,
      courriel: parametres.courriel,
    },
    lienPaiementStripe: parametres.lienPaiementStripe,
    paiementCarte: !!parametres.paiementCarte,
    publieLe,
    remise: doc.remise || 0,
    factureNumero: doc.factureNumero || '',
    ...partieVivante(doc, documents, parametres),
  };
}

/** Les relances du matin : J+7, J+21 et J+45 après l'échéance, jamais deux dans la même semaine. */
export const JOURS_RELANCE = [7, 21, 45];
export function relancesDues(documents: Document[], parametres: ParametresFacturation, aujourdhui: string): { doc: Document; solde: number; jours: number }[] {
  const dues: { doc: Document; solde: number; jours: number }[] = [];
  for (const doc of documents) {
    if (doc.type !== 'Invoice' || !doc.dueDate || !doc.clientEmail || !doc.jetonPublic) continue;
    if (doc.status !== 'Sent' && doc.status !== 'Partial') continue;
    const jours = joursEntre(doc.dueDate, aujourdhui);
    if (!JOURS_RELANCE.includes(jours)) continue;
    if ((doc.relances || []).some((r) => joursEntre(r.date, aujourdhui) < 7)) continue;
    const { solde } = soldeFacture(doc, documents, parametres);
    if (solde > 0.005) dues.push({ doc, solde, jours });
  }
  return dues;
}
