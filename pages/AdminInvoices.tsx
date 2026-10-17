// L'onglet Factures : tient les données (documents, clients, dépenses, réglages) et les gestes qui
// écrivent dans Firestore. L'affichage vit dans components/admin/factures/ : ListeDocuments,
// EditeurDocument (avec Paiements et PiecesJointes), ApercuDocument, EtatDeCompte.
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { EnTete, Panneau, Bouton, Vide, Chargement, useCollection, useDocument, createDoc, patchDoc, removeDoc, COLLECTION_CLIENTS, IDENTITE, type Client, type Language } from '../lib/compta/ancrage';
import ReglagesFacturation from '../components/admin/factures/ReglagesFacturation';
import ListeDocuments from '../components/admin/factures/ListeDocuments';
import EditeurDocument from '../components/admin/factures/EditeurDocument';
import ApercuDocument from '../components/admin/factures/ApercuDocument';
import EtatDeCompte from '../components/admin/factures/EtatDeCompte';
import type { Document, DocumentStatus, Paiement, PieceJointe } from '../types';
import type { Transaction } from '../lib/compta/types';
import { depensesRefacturables, marquerRefacturees } from '../lib/compta/refacturation';
import {
  DEFAULT_TERMS, FACTURATION_PAR_DEFAUT, type ParametresFacturation, aujourdhuiLocal, genererRecurrencesDues, joursEntre,
  lienFacturePublique, prochainNumero, publierFacture, soldeFacture, statutSelonSolde, synchroniserMiroir, totalDocument,
} from '../lib/factures';
import { courrielDocument, courrielRelance } from '../lib/factures-courriel';
import { envoyerCourriel } from '../lib/factures-envoi';

interface AdminInvoicesProps {
  lang: Language;
}

const T = {
  FR: { title: 'Facturation', subtitle: 'Gérez vos devis, factures et paiements.', newDoc: 'Nouveau document', reglages: 'Réglages', loading: 'Chargement...', videTitre: 'Aucun document', videTexte: 'Les devis et factures que vous créez apparaissent ici.' },
  EN: { title: 'Invoicing', subtitle: 'Manage quotes, invoices and payments.', newDoc: 'New document', reglages: 'Settings', loading: 'Loading...', videTitre: 'No documents', videTexte: 'Quotes and invoices you create appear here.' },
};

/** Firestore refuse les champs `undefined` : on les retire avant d'écrire. */
const nettoyer = <O extends Record<string, unknown>>(o: O) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as O;

/** Ce qu'un devis transmet à sa facture, ou une facture à sa note de crédit. */
const reprise = (d: Document) => ({
  clientId: d.clientId, clientName: d.clientName, clientEmail: d.clientEmail,
  items: d.items.map((i) => ({ ...i })), terms: d.terms, remise: d.remise || 0,
});

const AdminInvoices: React.FC<AdminInvoicesProps> = ({ lang }) => {
  const { data: documents, loading } = useCollection<Document>('documents');
  const { data: clients } = useCollection<Client>(COLLECTION_CLIENTS);
  const { data: transactions } = useCollection<Transaction>('transactions');
  const { data: facturationDoc } = useDocument<ParametresFacturation>('settings/facturation');
  const parametres: ParametresFacturation = { ...FACTURATION_PAR_DEFAUT, ...(facturationDoc || {}) };
  const nom = parametres.nomLegal || IDENTITE.nomLegal;
  const t = T[lang];

  const [view, setView] = useState<'list' | 'edit' | 'preview' | 'etat'>('list');
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [clientEtat, setClientEtat] = useState('');
  const [recurrencesCreees, setRecurrencesCreees] = useState(0);

  // Les factures récurrentes dues se créent à l'ouverture de l'onglet, une fois par visite.
  const recurrencesFaites = useRef(false);
  useEffect(() => {
    if (loading || recurrencesFaites.current) return;
    recurrencesFaites.current = true;
    genererRecurrencesDues(documents).then(setRecurrencesCreees).catch(() => { /* hors ligne : la prochaine visite les créera */ });
  }, [loading, documents]);

  const ouvrir = (doc: Document, vue: 'edit' | 'preview') => {
    setCurrentDoc({ ...doc });
    setView(vue);
  };
  const retourListe = () => {
    setView('list');
    setCurrentDoc(null);
  };

  const handleNew = () => ouvrir({
    id: '', number: '', type: 'Quote', clientId: '', clientName: '', clientEmail: '', date: aujourdhuiLocal(), dueDate: '',
    items: [{ id: Date.now().toString(), description: '', quantity: 1, price: 0 }], status: 'Draft',
    terms: parametres.modalites || DEFAULT_TERMS,
  }, 'edit');

  /** Enregistre et rend le document avec son id et son numéro (attribué au premier enregistrement). */
  const enregistrer = async (doc: Document): Promise<Document> => {
    const number = doc.number || prochainNumero(documents, doc.type, Number(doc.date.slice(0, 4)) || undefined);
    const { id, ...payload } = { ...doc, number };
    let idFinal = id;
    if (id && documents.some((d) => d.id === id)) await patchDoc<Document>('documents', id, nettoyer(payload));
    else idFinal = await createDoc('documents', nettoyer(payload));
    // Les dépenses importées (lignes dep-<id>) sortent de la liste « à refacturer ».
    const importees = doc.items
      .filter((i) => i.id.startsWith('dep-'))
      .map((i) => i.id.slice(4))
      .filter((tid) => transactions.some((tr) => tr.id === tid && !tr.refactureeDans));
    if (importees.length) await marquerRefacturees(importees, idFinal);
    return { ...doc, number, id: idFinal };
  };

  const handleSave = async () => {
    if (!currentDoc) return;
    await enregistrer(currentDoc);
    retourListe();
  };

  /** Recalcule le statut et le miroir de la facture qu'une note de crédit vient de viser. */
  const rafraichirFactureLiee = async (credit: Document) => {
    const facture = documents.find((d) => d.id === credit.factureId);
    if (!facture) return;
    const docsAJour = [...documents.filter((d) => d.id !== credit.id), credit];
    const status = statutSelonSolde(facture, soldeFacture(facture, docsAJour, parametres));
    if (status !== facture.status) await patchDoc<Document>('documents', facture.id, { status });
    await synchroniserMiroir({ ...facture, status }, docsAJour, parametres);
  };

  /** Publie (le brouillon devient envoyé) et rend le document avec son jeton. */
  const publier = async (doc: Document): Promise<Document> => {
    const status: DocumentStatus = doc.status === 'Draft' ? 'Sent' : doc.status;
    const aJour = { ...doc, status };
    const jeton = await publierFacture(aJour, parametres, documents);
    if (status !== doc.status) await patchDoc<Document>('documents', doc.id, { status });
    if (doc.type === 'Credit' && status !== doc.status) await rafraichirFactureLiee(aJour);
    return { ...aJour, jetonPublic: jeton };
  };

  const handlePublier = async () => {
    if (currentDoc?.id) setCurrentDoc(await publier(currentDoc));
  };

  const handleEnvoyer = async () => {
    if (!currentDoc?.id || !currentDoc.clientEmail) return;
    const publie = await publier(currentDoc);
    const envoyeeLe = aujourdhuiLocal();
    await patchDoc<Document>('documents', publie.id, { envoyeeLe });
    setCurrentDoc({ ...publie, envoyeeLe });
    const montant = publie.type === 'Invoice' ? soldeFacture(publie, documents, parametres).solde : totalDocument(publie, parametres);
    await envoyerCourriel(courrielDocument(publie, montant, { lang, nom, lien: lienFacturePublique(publie.jetonPublic!) }));
  };

  const handleRelancer = async (doc: Document) => {
    const publie = doc.jetonPublic ? doc : await publier(doc);
    const relances = [...(doc.relances || []), { date: aujourdhuiLocal() }];
    await patchDoc<Document>('documents', doc.id, { relances });
    const { solde } = soldeFacture(doc, documents, parametres);
    const jours = doc.dueDate ? joursEntre(doc.dueDate, aujourdhuiLocal()) : 0;
    await envoyerCourriel(courrielRelance(publie, solde, jours, { lang, nom, lien: lienFacturePublique(publie.jetonPublic!) }));
  };

  /** Écrit les paiements, fait suivre le statut (Partielle, Payée) et le miroir public. */
  const majPaiements = async (doc: Document, paiements: Paiement[]) => {
    const aJour = { ...doc, paiements };
    const status = statutSelonSolde(aJour, soldeFacture(aJour, documents, parametres));
    await patchDoc<Document>('documents', doc.id, { paiements, status });
    await synchroniserMiroir({ ...aJour, status }, documents, parametres);
    setCurrentDoc((c) => (c && c.id === doc.id ? { ...c, paiements, status } : c));
  };

  const handleAjouterPaiement = async (p: Paiement) => {
    if (currentDoc?.id) await majPaiements(currentDoc, [...(currentDoc.paiements || []), p]);
  };

  // Facture : enregistre un paiement du solde (mode « autre »). Devis : l'ancien geste, le statut seul.
  const handleMarquerPayee = async () => {
    if (!currentDoc?.id) return;
    const { solde } = soldeFacture(currentDoc, documents, parametres);
    if (currentDoc.type === 'Invoice' && solde > 0.005) {
      await majPaiements(currentDoc, [...(currentDoc.paiements || []), { id: `${Date.now()}`, date: aujourdhuiLocal(), montant: solde, mode: 'autre' }]);
      return;
    }
    await patchDoc<Document>('documents', currentDoc.id, { status: 'Paid' });
    await synchroniserMiroir({ ...currentDoc, status: 'Paid' }, documents, parametres);
    setCurrentDoc({ ...currentDoc, status: 'Paid' });
  };

  const handleSigner = async () => {
    if (!currentDoc?.id) return;
    const partiel: Partial<Document> = { signed: true, signatureDate: aujourdhuiLocal(), status: 'Accepted' };
    await patchDoc<Document>('documents', currentDoc.id, partiel);
    setCurrentDoc({ ...currentDoc, ...partiel });
  };

  // Le devis devient une facture neuve (numéro FAC), qui garde le lien vers son devis; le devis est accepté.
  const handleConvertir = async () => {
    if (!currentDoc?.id || currentDoc.type !== 'Quote') return;
    const devis = currentDoc;
    const date = aujourdhuiLocal();
    const facture: Document = {
      ...reprise(devis), id: '', type: 'Invoice', number: prochainNumero(documents, 'Invoice', Number(date.slice(0, 4))),
      status: 'Draft', date, dueDate: '', devisId: devis.id,
    };
    const { id: _vide, ...payload } = facture;
    const id = await createDoc('documents', nettoyer(payload));
    if (devis.status !== 'Accepted') await patchDoc<Document>('documents', devis.id, { status: 'Accepted' });
    ouvrir({ ...facture, id }, 'edit');
  };

  // La note de crédit reprend les lignes de la facture; son numéro NC se donne à l'enregistrement.
  const handleNoteCredit = () => {
    if (!currentDoc?.id) return;
    const f = currentDoc;
    ouvrir({
      ...reprise(f), id: '', number: '', type: 'Credit', status: 'Draft', date: aujourdhuiLocal(), dueDate: '',
      factureId: f.id, factureNumero: f.number, items: f.items.map((i) => ({ ...i, id: `${i.id}-nc` })),
    }, 'edit');
  };

  const handlePieces = async (pieces: PieceJointe[]) => {
    if (!currentDoc?.id) return;
    await patchDoc<Document>('documents', currentDoc.id, { piecesJointes: pieces });
    await synchroniserMiroir({ ...currentDoc, piecesJointes: pieces }, documents, parametres);
    setCurrentDoc((c) => (c ? { ...c, piecesJointes: pieces } : c));
  };

  if (view === 'edit' && currentDoc) {
    return (
      <EditeurDocument
        lang={lang}
        doc={currentDoc}
        setDoc={setCurrentDoc}
        clients={clients}
        documents={documents}
        parametres={parametres}
        depenses={currentDoc.type === 'Invoice' ? depensesRefacturables(transactions, currentDoc.clientName) : []}
        onSave={handleSave}
        onBack={retourListe}
        onAjouterPaiement={handleAjouterPaiement}
        onPieces={handlePieces}
      />
    );
  }

  if (view === 'preview' && currentDoc) {
    return (
      <ApercuDocument
        lang={lang}
        doc={currentDoc}
        documents={documents}
        parametres={parametres}
        onBack={retourListe}
        onPublier={handlePublier}
        onEnvoyer={handleEnvoyer}
        onMarquerPayee={handleMarquerPayee}
        onSigner={handleSigner}
        onConvertir={handleConvertir}
        onNoteCredit={handleNoteCredit}
      />
    );
  }

  if (view === 'etat' && clientEtat) {
    return <EtatDeCompte lang={lang} clientName={clientEtat} documents={documents} parametres={parametres} onBack={retourListe} />;
  }

  return (
    <div className="space-y-8">
      <EnTete
        kicker="Facturation"
        titre={t.title}
        lede={t.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Bouton variante="secondaire" icone={Settings} onClick={() => setReglagesOuverts((v) => !v)}>{t.reglages}</Bouton>
            <Bouton variante="primaire" icone={Plus} onClick={handleNew}>{t.newDoc}</Bouton>
          </div>
        }
      />

      {reglagesOuverts && <ReglagesFacturation lang={lang} parametres={parametres} onClose={() => setReglagesOuverts(false)} />}

      {loading && <Chargement texte={t.loading} />}

      {!loading && documents.length === 0 && (
        <Panneau>
          <Vide titre={t.videTitre} texte={t.videTexte} />
        </Panneau>
      )}

      {!loading && documents.length > 0 && (
        <ListeDocuments
          lang={lang}
          documents={documents}
          parametres={parametres}
          recurrencesCreees={recurrencesCreees}
          onEdit={(d) => ouvrir(d, 'edit')}
          onPreview={(d) => ouvrir(d, 'preview')}
          onDelete={(id) => removeDoc('documents', id)}
          onRelancer={handleRelancer}
          onEtatDeCompte={(c) => { setClientEtat(c); setView('etat'); }}
        />
      )}
    </div>
  );
};

export default AdminInvoices;
