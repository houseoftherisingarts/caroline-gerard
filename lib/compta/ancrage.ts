// Les points d'ancrage du module compta (_vexel-base/modules/compta). Tout ce que les factures et les
// finances prennent au site qui les reçoit passe par ce fichier, et par lui seul : le reste du module se
// copie tel quel d'un site à l'autre. Chaque site remplit sa propre version, que le portage n'écrase jamais.
//
// Ce gabarit tient debout seul : il pointe vers les primitives livrées avec le module (firebase-defaut,
// ui-defaut, firestore-defaut, zip-defaut). Un site qui a déjà les siennes (lib/firestore.ts, components/admin/ui.tsx)
// peut rediriger les exports vers elles, comme le fait Xena Horizon.
//
// Ce que le module demande aussi au site, hors du code client :
// - isAdmin() dans firestore.rules et storage.rules (les blocs rules/ du module l'appellent);
// - assertAdmin dans functions/src/infolettre/send.ts et REGION, REPLY_TO, RESEND_API_KEY,
//   createTransporter dans functions/src/infolettre/mail.ts (les fonctions de functions/src/factures/);
// - les routes /admin/factures, /admin/finances et /facture/{jeton};
// - les entrées Factures et Finances de la barre d'admin;
// - une entrée au journal des changements quand le module arrive ou change.

export { app, db } from './firebase-defaut';
export {
  useCollection, useDocument, createDoc, patchDoc, writeDoc, removeDoc, uploadFile, deleteFile, makeStoragePath,
} from './firestore-defaut';
export { Bouton, Champ, Chargement, Chiffre, EnTete, Etiquette, Panneau, Selection, Vide, Zone } from './ui-defaut';
export { zipper, octets, octetsTexte, type FichierZip } from './zip-defaut';

/** Langue de l'admin : le type vit dans types.ts du site (le portage l'y ajoute s'il manque). */
export type { Language } from '../../types';

/** Ce que les factures lisent d'une fiche client du CRM. Le type du site peut le remplacer s'il en a un. */
export interface Client {
  id: string;
  name: string;
  email: string;
  organization?: string;
}

/** La collection des clients du site (le CRM), que les factures lisent sans la posséder. */
export const COLLECTION_CLIENTS = 'clients';

/** Qui facture : repli quand les réglages de facturation sont vides, et en-tête des documents. */
export const IDENTITE = {
  nom: 'Caroline Gérard',
  nomLegal: 'Caroline Gérard',
  courriel: 'caroline@carolinegerard.ca',
  logo: '/logo-caroline.svg',
};
