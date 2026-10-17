// Contrat de la facturation brandée : réglages de l'entreprise, jeton public et miroir Firestore que
// lit la page /facture/{jeton}. Le calcul (numéros, totaux, solde, récurrences) vit dans
// lib/factures-calcul.ts; le rendu dans components/admin/factures/DocumentFacture.tsx; la page
// publique dans pages/FacturePublique.tsx; les courriels dans lib/factures-courriel.ts.
import { doc as refDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Document } from '../types';
import { db, patchDoc, writeDoc, IDENTITE } from './compta/ancrage';
import { miroirPublic, partieVivante, planifierRecurrences, REGLAGES_AUTOMATISMES, type FacturePubliqueDoc, type ParametresFacturation } from './factures-calcul';

export * from './factures-calcul';

export const DEFAULT_TERMS =
  "1. Paiement : un acompte de 50 % est requis à la signature. La balance est due à la livraison finale.\n2. Validité : ce devis est valide pour une période de 30 jours.\n3. Retard : tout retard de paiement de plus de 30 jours entraîne des frais d'intérêt de 2 % par mois.\n4. Propriété : les livrables restent la propriété de " + IDENTITE.nom + " jusqu'au paiement complet.";

export const FACTURATION_PAR_DEFAUT: ParametresFacturation = {
  nomLegal: IDENTITE.nomLegal,
  adresse: '501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0',
  neq: '',
  tps: '781718333 RT0001',
  tvq: '1041635416 TQ0001',
  modalites: DEFAULT_TERMS,
  note: 'Merci de votre confiance.',
  courriel: IDENTITE.courriel,
  lienPaiementStripe: '',
  ...REGLAGES_AUTOMATISMES,
};

/** 32 caractères base64url tirés de l'aléatoire cryptographique du navigateur : imprévisible, jamais séquentiel. */
export function jetonAleatoire(): string {
  const octets = new Uint8Array(24);
  crypto.getRandomValues(octets);
  let binaire = '';
  octets.forEach((o) => { binaire += String.fromCharCode(o); });
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function lienFacturePublique(jeton: string): string {
  return `${window.location.origin}/facture/${jeton}`;
}

/**
 * Publie un document : crée le jeton s'il n'existe pas encore, écrit (ou remplace) le miroir public
 * avec les montants figés au moment de la publication, et renvoie le jeton. `documents` sert aux
 * notes de crédit qui réduisent le solde d'une facture.
 */
export async function publierFacture(doc: Document, parametres: ParametresFacturation, documents: Document[] = []): Promise<string> {
  const jeton = doc.jetonPublic || jetonAleatoire();
  const miroir = miroirPublic(doc, parametres, documents, new Date().toISOString());
  await writeDoc('factures_publiques', jeton, miroir);
  if (!doc.jetonPublic) {
    await patchDoc<Document>('documents', doc.id, { jetonPublic: jeton });
  }
  return jeton;
}

/** Recopie statut, paiements, crédits, solde et pièces jointes sur le miroir public, quand il existe. */
export async function synchroniserMiroir(doc: Document, documents: Document[], parametres: ParametresFacturation): Promise<void> {
  if (!doc.jetonPublic) return;
  await patchDoc('factures_publiques', doc.jetonPublic, partieVivante(doc, documents, parametres));
}

/**
 * Crée en brouillon les factures récurrentes dues (voir planifierRecurrences), en un seul lot :
 * le modèle avance et la facture naît ensemble, ou rien ne bouge. Renvoie le nombre créé.
 * Un serveur (forfait Blaze) pourra un jour les créer et les envoyer seul, sans attendre cette page.
 */
export async function genererRecurrencesDues(documents: Document[]): Promise<number> {
  const { nouvelles, modeles } = planifierRecurrences(documents);
  if (!modeles.length) return 0;
  const lot = writeBatch(db);
  modeles.forEach((m) => lot.update(refDoc(db, 'documents', m.id), { recurrence: m.recurrence }));
  nouvelles.forEach((n) => lot.set(refDoc(collection(db, 'documents')), { ...n, createdAt: serverTimestamp() }));
  await lot.commit();
  return nouvelles.length;
}

/**
 * Tente d'ajouter la référence de la facture au lien de paiement Stripe configuré. Un lien de paiement
 * Stripe à prix fixe ne permet pas de changer le montant par l'adresse : ce que ce lien accepte vraiment,
 * c'est le courriel du client et une référence de suivi. Laurie doit choisir ou créer un lien qui
 * correspond déjà au montant de cette facture; le montant exact ne sera automatique qu'avec la fonction
 * Stripe Checkout (functions/src/factures/paiement.ts), qui attend le passage au forfait Blaze.
 */
export function lienPaiementAvecReference(lien: string, facture: Pick<FacturePubliqueDoc, 'numero' | 'clientEmail'>): string {
  if (!lien) return lien;
  try {
    const url = new URL(lien);
    url.searchParams.set('client_reference_id', facture.numero);
    if (facture.clientEmail) url.searchParams.set('prefilled_email', facture.clientEmail);
    return url.toString();
  } catch {
    return lien;
  }
}
