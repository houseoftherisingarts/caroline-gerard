// Harnais de capture du module de facturation (scripts/qa-factures-2.cjs). Jamais lié depuis le site :
// buildé à part par scripts/vite.qa-factures.config.ts dans dist-verif-factures-2, avec un jeu d'exemple
// en mémoire (aucune connexion, aucune écriture Firestore). ?c= choisit l'écran, ?lang=EN la langue.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ListeDocuments from './components/admin/factures/ListeDocuments';
import EditeurDocument from './components/admin/factures/EditeurDocument';
import ApercuDocument from './components/admin/factures/ApercuDocument';
import EtatDeCompte from './components/admin/factures/EtatDeCompte';
import FacturePublique from './pages/FacturePublique';
import ReglagesFacturation from './components/admin/factures/ReglagesFacturation';
import type { Client, Language } from './lib/compta/ancrage';
import type { Document } from './types';
import type { Transaction } from './lib/compta/types';
import type { ParametresFacturation } from './lib/factures';

const params = new URLSearchParams(window.location.search);
const lang = (params.get('lang') === 'EN' ? 'EN' : 'FR') as Language;
const cle = params.get('c') || 'liste';
const rien = async () => {};

const PARAMETRES: ParametresFacturation = {
  nomLegal: 'Laurie Belhumeur', adresse: 'Montréal (Québec)', neq: '2270000000', tps: '123456789 RT0001',
  tvq: '1234567890 TQ0001', modalites: 'Payable à 30 jours.', note: 'Merci de votre confiance.',
  courriel: 'laurie.belhumeur@gmail.com', lienPaiementStripe: '',
};

const ligne = (id: string, description: string, quantity: number, price: number, rabais?: number) => ({ id, description, quantity, price, ...(rabais ? { rabais } : {}) });

const FACTURE: Document = {
  id: 'f1', number: 'FAC-2026-0014', type: 'Invoice', clientId: 'c1', clientName: 'Galerie Rouge', clientEmail: 'direction@galerierouge.ca',
  date: '2026-09-01', dueDate: '2026-10-01', status: 'Partial', terms: 'Payable à 30 jours.', jetonPublic: 'exemple', envoyeeLe: '2026-09-01',
  items: [ligne('l1', 'Plan de communication, lancement d’exposition', 1, 1200, 10), ligne('l2', 'Atelier de prise de parole (heures)', 3, 95)],
  remise: 50,
  paiements: [{ id: 'p1', date: '2026-09-02', montant: 500, mode: 'virement', note: 'Dépôt de 40 %' }, { id: 'p2', date: '2026-09-20', montant: 200, mode: 'cheque' }],
  relances: [{ date: '2026-10-08' }, { date: '2026-10-15' }],
  recurrence: { frequence: 'mensuelle', prochaine: '2026-11-01', actif: true, generees: ['2026-10-01'] },
  piecesJointes: [
    { nom: 'plan-de-communication.pdf', chemin: 'documents/f1/plan-de-communication.pdf', url: '/images/logo-laurie.png', type: 'application/pdf', taille: 482000, visibleClient: true },
    { nom: 'notes-internes.png', chemin: 'documents/f1/notes-internes.png', url: '/images/logo-laurie.png', type: 'image/png', taille: 91000, visibleClient: false },
  ],
} as Document;

const CREDIT: Document = {
  id: 'n1', number: 'NC-2026-0002', type: 'Credit', clientId: 'c1', clientName: 'Galerie Rouge', clientEmail: 'direction@galerierouge.ca',
  date: '2026-09-15', dueDate: '', status: 'Sent', terms: '', factureId: 'f1', factureNumero: 'FAC-2026-0014',
  items: [ligne('l1', 'Atelier annulé (une heure)', 1, 95)],
} as Document;

const DOCUMENTS: Document[] = [
  FACTURE,
  CREDIT,
  { id: 'f2', number: 'FAC-2026-0015', type: 'Invoice', clientId: 'c1', clientName: 'Galerie Rouge', clientEmail: 'direction@galerierouge.ca', date: '2026-10-01', dueDate: '2026-10-31', status: 'Sent', terms: '', items: [ligne('l1', 'Accompagnement mensuel', 1, 650)], modeleId: 'f1' } as Document,
  { id: 'f3', number: 'FAC-2026-0012', type: 'Invoice', clientId: 'c1', clientName: 'Galerie Rouge', clientEmail: 'direction@galerierouge.ca', date: '2026-08-01', dueDate: '2026-08-31', status: 'Paid', terms: '', items: [ligne('l1', 'Communiqué de presse', 1, 400)], paiements: [{ id: 'p', date: '2026-08-20', montant: 459.9, mode: 'stripe' }] } as Document,
  { id: 'f4', number: 'FAC-2026-0016', type: 'Invoice', clientId: 'c2', clientName: 'Théâtre des Fonds de Tiroirs', clientEmail: 'info@fondsdetiroirs.ca', date: '2026-10-10', dueDate: '2026-11-09', status: 'Draft', terms: '', items: [ligne('l1', 'Stratégie de diffusion', 1, 900)] } as Document,
  { id: 'd1', number: 'DEV-2026-0005', type: 'Quote', clientId: 'c2', clientName: 'Théâtre des Fonds de Tiroirs', clientEmail: 'info@fondsdetiroirs.ca', date: '2026-10-05', dueDate: '2026-11-04', status: 'Sent', terms: '', items: [ligne('l1', 'Tournée de presse', 1, 1800)] } as Document,
];

const CLIENTS = [
  { id: 'c1', name: 'Galerie Rouge', organization: 'Galerie Rouge', email: 'direction@galerierouge.ca', status: 'Active', paymentStatus: 'Pending', paymentType: 'Once', notes: '', serviceType: 'Organism' },
  { id: 'c2', name: 'Théâtre des Fonds de Tiroirs', organization: '', email: 'info@fondsdetiroirs.ca', status: 'Active', paymentStatus: 'Pending', paymentType: 'Once', notes: '', serviceType: 'Organism' },
] as unknown as Client[];

const DEPENSES = [
  { id: 't1', date: '2026-09-12', description: 'Impression des cartons d’invitation', sens: 'depense', montant: 180, tps: 9, tvq: 17.96, total: 206.96, compteId: 'dep-fournitures', source: 'manuel', concilie: false, refacturable: true, refactureA: 'Galerie Rouge' },
] as unknown as Transaction[];

function Editeur({ depart }: { depart: Document }) {
  const [doc, setDoc] = useState<Document | null>(depart);
  if (!doc) return null;
  return (
    <EditeurDocument lang={lang} doc={doc} setDoc={setDoc} clients={CLIENTS} documents={DOCUMENTS} parametres={PARAMETRES}
      depenses={params.get('dep') === 'aucune' ? [] : DEPENSES} onSave={() => {}} onBack={() => {}} onAjouterPaiement={rien} onPieces={rien} />
  );
}

function Page() {
  const enveloppe = (enfant: React.ReactNode) => <div className="bg-papier min-h-screen px-4 md:px-10 py-10">{enfant}</div>;
  if (cle === 'editeur') return enveloppe(<Editeur depart={FACTURE} />);
  if (cle === 'editeur-credit') return enveloppe(<Editeur depart={CREDIT} />);
  if (cle === 'apercu' || cle === 'apercu-credit') {
    return (
      <ApercuDocument lang={lang} doc={cle === 'apercu' ? FACTURE : CREDIT} documents={DOCUMENTS} parametres={PARAMETRES} onBack={() => {}}
        onPublier={rien} onEnvoyer={rien} onMarquerPayee={rien} onSigner={rien} onConvertir={rien} onNoteCredit={() => {}} />
    );
  }
  if (cle === 'etat') return <EtatDeCompte lang={lang} clientName="Galerie Rouge" documents={DOCUMENTS} parametres={PARAMETRES} onBack={() => {}} />;
  if (cle === 'publique') return <FacturePublique jeton="exemple" lang={lang} />;
  if (cle === 'reglages') return enveloppe(<ReglagesFacturation lang={lang} parametres={{ ...PARAMETRES, relancesAutomatiques: true, envoiRecurrences: true }} onClose={() => {}} />);
  return enveloppe(
    <ListeDocuments lang={lang} documents={DOCUMENTS} parametres={PARAMETRES} recurrencesCreees={1}
      onEdit={() => {}} onPreview={() => {}} onDelete={() => {}} onRelancer={() => {}} onEtatDeCompte={() => {}} />,
  );
}

createRoot(document.getElementById('root')!).render(<Page />);
