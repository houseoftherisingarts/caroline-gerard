// L'éditeur d'un devis, d'une facture ou d'une note de crédit : saisie à gauche (lignes avec rabais,
// remise, dépenses à refacturer, récurrence), paiements et pièces jointes dessous, aperçu du papier
// réel à droite, mis à jour à mesure de la saisie.
import React from 'react';
import { Plus, Check, Trash2, ArrowLeft, Receipt } from 'lucide-react';
import { Panneau, Bouton, Champ, Zone, Selection, type Client, type Language } from '../../../lib/compta/ancrage';
import DocumentFacture from './DocumentFacture';
import Paiements from './Paiements';
import PiecesJointes from './PiecesJointes';
import type { Document, InvoiceItem, Paiement, PieceJointe, Recurrence } from '../../../types';
import type { Transaction } from '../../../lib/compta/types';
import { ligneDepuisDepense } from '../../../lib/compta/refacturation';
import {
  avancer, creditsDe, prochainNumero, soldeFacture, totalDocument, type ParametresFacturation,
} from '../../../lib/factures';

interface Props {
  lang: Language;
  doc: Document;
  setDoc: React.Dispatch<React.SetStateAction<Document | null>>;
  clients: Client[];
  documents: Document[];
  parametres: ParametresFacturation;
  /** Dépenses refacturables à ce client, pas encore portées sur une facture. */
  depenses: Transaction[];
  onSave: () => void;
  onBack: () => void;
  onAjouterPaiement: (p: Paiement) => Promise<void>;
  onPieces: (pieces: PieceJointe[]) => Promise<void>;
}

const RANGEE_INPUT =
  'w-full bg-papier-2 border border-filet rounded-champ px-3 py-2 text-sm text-encre placeholder-gris outline-none transition-colors focus:border-rose';

const T = {
  FR: {
    editor: 'Éditeur', back: 'Retour au tableau de bord', type: 'Type de document', quote: 'Devis', invoice: 'Facture',
    credit: 'Note de crédit', client: 'Client', nomClient: 'Nom du client', courrielClient: 'Courriel du client', selectClient: 'Sélectionner un client...', date: 'Date', dueDate: 'Échéance',
    lines: 'Lignes', description: 'Description', qty: 'Qté', price: 'Prix', rabais: 'Rabais %', taxe: 'Taxes', taxeTout: 'Transport et autres : TPS et TVQ', taxeLivre: 'Livre : TPS seule', taxeAucune: 'Aucune taxe', addLine: 'Ajouter une ligne',
    delete: 'Supprimer', importer: 'Importer les dépenses à refacturer', aucuneDepense: 'Aucune dépense à refacturer pour ce client.',
    remise: 'Remise sur le sous-total ($)', terms: 'Conditions', save: 'Enregistrer', apercu: 'Aperçu du document',
    numeroAuto: 'Le numéro est attribué au premier enregistrement du document.', creditDe: 'Crédit appliqué à la facture',
    recurrence: 'Récurrence', repeter: 'Répéter cette facture', frequence: 'Fréquence', prochaine: 'Prochaine facture',
    fin: 'Dernière date (facultatif)', hebdomadaire: 'Chaque semaine', mensuelle: 'Chaque mois', annuelle: 'Chaque année',
    aideRecurrence: "La facture suivante se crée en brouillon à cette date, dès votre prochaine visite de l'onglet Factures.",
    dejaCreees: (n: number) => (n > 1 ? `${n} factures déjà créées.` : '1 facture déjà créée.'),
  },
  EN: {
    editor: 'Editor', back: 'Back to dashboard', type: 'Document type', quote: 'Quote', invoice: 'Invoice',
    credit: 'Credit note', client: 'Client', nomClient: 'Client name', courrielClient: 'Client email', selectClient: 'Select a client...', date: 'Date', dueDate: 'Due date',
    lines: 'Line items', description: 'Description', qty: 'Qty', price: 'Price', rabais: 'Discount %', taxe: 'Taxes', taxeTout: 'Shipping and other: GST and QST', taxeLivre: 'Book: GST only', taxeAucune: 'No tax', addLine: 'Add line',
    delete: 'Delete', importer: 'Import billable expenses', aucuneDepense: 'No billable expense for this client.',
    remise: 'Discount on subtotal ($)', terms: 'Terms', save: 'Save', apercu: 'Document preview',
    numeroAuto: 'The number is assigned when you first save the document.', creditDe: 'Credit applied to invoice',
    recurrence: 'Recurrence', repeter: 'Repeat this invoice', frequence: 'Frequency', prochaine: 'Next invoice',
    fin: 'Last date (optional)', hebdomadaire: 'Every week', mensuelle: 'Every month', annuelle: 'Every year',
    aideRecurrence: 'On that date, the next invoice is created as a draft when you next open the Invoices tab.',
    dejaCreees: (n: number) => (n > 1 ? `${n} invoices already created.` : '1 invoice already created.'),
  },
};

const BlocRecurrence: React.FC<{ lang: Language; doc: Document; maj: (p: Partial<Document>) => void }> = ({ lang, doc, maj }) => {
  const t = T[lang];
  const r = doc.recurrence;
  const majR = (p: Partial<Recurrence>) => r && maj({ recurrence: { ...r, ...p } });
  const activer = (actif: boolean) =>
    maj({ recurrence: r ? { ...r, actif } : { frequence: 'mensuelle', prochaine: avancer(doc.date, 'mensuelle'), actif, generees: [] } });
  return (
    <div className="border-t border-filet pt-5 space-y-4">
      <p className="text-petit font-semibold text-encre">{t.recurrence}</p>
      <label className="flex items-center gap-3 text-sm text-encre cursor-pointer min-h-[36px]">
        <input type="checkbox" checked={!!r?.actif} onChange={(e) => activer(e.target.checked)} className="w-4 h-4" />
        {t.repeter}
      </label>
      {r?.actif && (
        <>
          <Selection label={t.frequence} id="recurrence-frequence" value={r.frequence} onChange={(e) => majR({ frequence: e.target.value as Recurrence['frequence'] })}>
            <option value="hebdomadaire">{t.hebdomadaire}</option>
            <option value="mensuelle">{t.mensuelle}</option>
            <option value="annuelle">{t.annuelle}</option>
          </Selection>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ label={t.prochaine} id="recurrence-prochaine" type="date" value={r.prochaine} onChange={(e) => majR({ prochaine: e.target.value })} />
            <Champ label={t.fin} id="recurrence-fin" type="date" value={r.fin || ''} onChange={(e) => majR({ fin: e.target.value })} />
          </div>
          <p className="text-[13px] text-gris">{t.aideRecurrence}{r.generees.length > 0 ? ` ${t.dejaCreees(r.generees.length)}` : ''}</p>
        </>
      )}
    </div>
  );
};

const EditeurDocument: React.FC<Props> = ({
  lang, doc, setDoc, clients, documents, parametres, depenses, onSave, onBack, onAjouterPaiement, onPieces,
}) => {
  const t = T[lang];
  const maj = (p: Partial<Document>) => setDoc((d) => (d ? { ...d, ...p } : d));
  const majLigne = (id: string, champ: keyof InvoiceItem, valeur: string | number) =>
    setDoc((d) => (d ? { ...d, items: d.items.map((i) => (i.id === id ? { ...i, [champ]: valeur } : i)) } : d));
  const ajouterLigne = () => maj({ items: [...doc.items, { id: Date.now().toString(), description: '', quantity: 1, price: 0 }] });
  const retirerLigne = (id: string) => maj({ items: doc.items.filter((i) => i.id !== id) });

  const aImporter = depenses.filter((d) => !doc.items.some((i) => i.id === `dep-${d.id}`));
  const importer = () => maj({ items: [...doc.items.filter((i) => i.description || i.price), ...aImporter.map(ligneDepuisDepense)] });

  const enregistre = !!doc.id && documents.some((d) => d.id === doc.id);
  const numero = doc.number || prochainNumero(documents, doc.type, Number(doc.date.slice(0, 4)) || undefined);
  const credits = doc.type === 'Invoice' && doc.id
    ? creditsDe(doc, documents).map((c) => ({ numero: c.number, montant: totalDocument(c, parametres) }))
    : [];

  return (
    <div className="px-6 md:px-10 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 min-h-[44px] text-gris hover:text-encre transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t.back}
        </button>
        <h2 className="font-serif text-h3 text-encre">{t.editor}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 min-w-0">
          <Panneau className="space-y-5">
            {doc.type === 'Credit' ? (
              <div>
                <p className="text-petit font-semibold text-encre">{t.credit}</p>
                <p className="text-sm text-gris mt-1">{t.creditDe} {doc.factureNumero}</p>
              </div>
            ) : !enregistre ? (
              <div>
                <p className="text-petit font-semibold text-encre mb-1.5">{t.type}</p>
                <div className="flex bg-papier rounded-champ p-1 border border-filet">
                  {(['Quote', 'Invoice'] as const).map((ty) => (
                    <button
                      key={ty}
                      onClick={() => maj({ type: ty })}
                      aria-pressed={doc.type === ty}
                      className={`flex-1 py-2 text-sm font-medium rounded-champ transition-colors ${doc.type === ty ? 'bg-bouton text-sur-bouton' : 'text-gris hover:text-encre'}`}
                    >{ty === 'Quote' ? t.quote : t.invoice}</button>
                  ))}
                </div>
                <p className="text-[13px] text-gris mt-2">{t.numeroAuto}</p>
              </div>
            ) : null}

            <Selection
              label={t.client}
              value={doc.clientId}
              onChange={(e) => {
                const client = clients.find((c) => c.id === e.target.value);
                if (client) maj({ clientId: client.id, clientName: client.name, clientEmail: client.email });
              }}
            >
              <option value="">{doc.clientId ? doc.clientName : t.selectClient}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Selection>
            {/* Ajout propre à Caroline : pas de fichier clients au site, le nom et le courriel se saisissent à la main. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Champ label={t.nomClient} value={doc.clientName} onChange={(e) => maj({ clientName: e.target.value })} />
              <Champ label={t.courrielClient} type="email" value={doc.clientEmail} onChange={(e) => maj({ clientEmail: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Champ label={t.date} type="date" value={doc.date} onChange={(e) => maj({ date: e.target.value })} />
              <Champ label={t.dueDate} type="date" value={doc.dueDate || ''} onChange={(e) => maj({ dueDate: e.target.value })} />
            </div>

            <div>
              <p className="text-petit font-semibold text-encre mb-1.5">{t.lines}</p>
              <div className="space-y-2">
                {doc.items.map((item) => (
                  <div key={item.id} className="bg-papier border border-filet p-2 rounded-champ space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" aria-label={t.description} className={RANGEE_INPUT} placeholder={t.description} value={item.description}
                        onChange={(e) => majLigne(item.id, 'description', e.target.value)} />
                      <button onClick={() => retirerLigne(item.id)} aria-label={t.delete} className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-gris hover:text-rose transition-colors">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="block text-[13px] text-gris mb-1">{t.qty}</span>
                        <input type="number" className={`${RANGEE_INPUT} text-center`} value={item.quantity}
                          onChange={(e) => majLigne(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                      </label>
                      <label className="block">
                        <span className="block text-[13px] text-gris mb-1">{t.price}</span>
                        <input type="number" step="0.01" className={`${RANGEE_INPUT} text-right`} value={item.price}
                          onChange={(e) => majLigne(item.id, 'price', parseFloat(e.target.value) || 0)} />
                      </label>
                      <label className="block">
                        <span className="block text-[13px] text-gris mb-1">{t.rabais}</span>
                        <input type="number" min={0} max={100} className={`${RANGEE_INPUT} text-right`} value={item.rabais || 0}
                          onChange={(e) => majLigne(item.id, 'rabais', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                      </label>
                    </div>
                    <label className="block">
                      <span className="block text-[13px] text-gris mb-1">{t.taxe}</span>
                      <select className={RANGEE_INPUT} value={item.taxe || 'tout'}
                        onChange={(e) => maj({ items: doc.items.map((i) => i.id === item.id ? { ...i, taxe: e.target.value === 'tout' ? undefined : (e.target.value as 'tps' | 'aucune') } : i) })}>
                        <option value="tout">{t.taxeTout}</option>
                        <option value="tps">{t.taxeLivre}</option>
                        <option value="aucune">{t.taxeAucune}</option>
                      </select>
                    </label>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Bouton variante="discret" icone={Plus} petit onClick={ajouterLigne}>{t.addLine}</Bouton>
                  {doc.type === 'Invoice' && (
                    <Bouton variante="secondaire" icone={Receipt} petit onClick={importer} disabled={aImporter.length === 0}>
                      {t.importer}{aImporter.length > 0 ? ` (${aImporter.length})` : ''}
                    </Bouton>
                  )}
                </div>
                {doc.type === 'Invoice' && aImporter.length === 0 && <p className="text-[13px] text-gris">{t.aucuneDepense}</p>}
              </div>
            </div>

            <Champ label={t.remise} id="document-remise" type="number" min={0} step="0.01" value={doc.remise || 0}
              onChange={(e) => maj({ remise: Math.max(0, parseFloat(e.target.value) || 0) })} />

            <Zone label={t.terms} value={doc.terms} onChange={(e) => maj({ terms: e.target.value })} className="min-h-[6rem]" />

            {doc.type === 'Invoice' && <BlocRecurrence lang={lang} doc={doc} maj={maj} />}

            <Bouton variante="primaire" icone={Check} onClick={onSave} className="w-full justify-center">{t.save}</Bouton>
          </Panneau>

          {enregistre && doc.type === 'Invoice' && (
            <Paiements lang={lang} paiements={doc.paiements || []} solde={soldeFacture(doc, documents, parametres)} onAjouter={onAjouterPaiement} />
          )}
          {enregistre && <PiecesJointes lang={lang} docId={doc.id} pieces={doc.piecesJointes || []} onChange={onPieces} />}
        </div>

        <div className="lg:col-span-2 min-w-0">
          <p className="kicker text-gris mb-3">{t.apercu}</p>
          <DocumentFacture
            lang={lang}
            numero={numero}
            type={doc.type}
            date={doc.date}
            dueDate={doc.dueDate}
            clientName={doc.clientName || t.selectClient}
            clientEmail={doc.clientEmail}
            items={doc.items}
            modalites={doc.terms}
            note={parametres.note}
            vendeur={parametres}
            remise={doc.remise}
            paiements={doc.paiements}
            credits={credits}
            factureNumero={doc.factureNumero}
          />
        </div>
      </div>
    </div>
  );
};

export default EditeurDocument;
