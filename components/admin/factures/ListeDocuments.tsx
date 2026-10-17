// La liste des devis, factures et notes de crédit (onglet Factures). Filtre « En retard », filtre par
// client et porte de l'état de compte, relance par courriel, bandeau des factures récurrentes créées.
import React, { useMemo, useState } from 'react';
import { FileText, Trash2, Eye, Edit2, BellRing, ScrollText } from 'lucide-react';
import { Panneau, Bouton, Selection, Etiquette, Vide, type Language } from '../../../lib/compta/ancrage';
import type { Document, DocumentStatus } from '../../../types';
import { enRetard, soldeFacture, totalDocument, type ParametresFacturation } from '../../../lib/factures';
import { argent } from '../../../lib/factures-courriel';

interface Props {
  lang: Language;
  documents: Document[];
  parametres: ParametresFacturation;
  recurrencesCreees: number;
  onEdit: (doc: Document) => void;
  onPreview: (doc: Document) => void;
  onDelete: (id: string) => void;
  onRelancer: (doc: Document) => void;
  onEtatDeCompte: (clientName: string) => void;
}

const T = {
  FR: {
    numero: 'Numéro', client: 'Client', date: 'Date', status: 'Statut', total: 'Total', solde: 'Solde',
    edit: 'Modifier', preview: 'Prévisualiser', delete: 'Supprimer', relancer: 'Relancer',
    tous: 'Tous', retard: 'En retard', tousClients: 'Tous les clients', filtreClient: 'Client',
    etat: 'État de compte', etatAvant: "Choisissez un client pour voir son état de compte.",
    relanceeLe: 'Relancée le', relances: (n: number) => (n > 1 ? `${n} relances` : '1 relance'),
    videTitre: 'Aucun document', videTexte: 'Les devis et factures que vous créez apparaissent ici.',
    videRetard: 'Aucune facture en retard.',
    recurrentes: (n: number) => (n > 1 ? `${n} factures récurrentes créées en brouillon.` : '1 facture récurrente créée en brouillon.'),
  },
  EN: {
    numero: 'Number', client: 'Client', date: 'Date', status: 'Status', total: 'Total', solde: 'Balance',
    edit: 'Edit', preview: 'Preview', delete: 'Delete', relancer: 'Remind',
    tous: 'All', retard: 'Overdue', tousClients: 'All clients', filtreClient: 'Client',
    etat: 'Statement', etatAvant: 'Choose a client to see their statement.',
    relanceeLe: 'Reminded on', relances: (n: number) => (n > 1 ? `${n} reminders` : '1 reminder'),
    videTitre: 'No documents', videTexte: 'Quotes and invoices you create appear here.',
    videRetard: 'No overdue invoices.',
    recurrentes: (n: number) => (n > 1 ? `${n} recurring invoices created as drafts.` : '1 recurring invoice created as a draft.'),
  },
};

const LIBELLES: Record<DocumentStatus, { FR: string; EN: string }> = {
  Draft: { FR: 'Brouillon', EN: 'Draft' },
  Sent: { FR: 'Publiée', EN: 'Published' },
  Partial: { FR: 'Partielle', EN: 'Partially paid' },
  Paid: { FR: 'Payée', EN: 'Paid' },
  Accepted: { FR: 'Acceptée', EN: 'Accepted' },
  Declined: { FR: 'Refusée', EN: 'Declined' },
};

/** Publiée ou acceptée, et l'échéance est passée : c'est le seul cas où le libellé s'écarte du statut brut. */
export function libelleStatut(doc: Document, lang: Language): string {
  if (enRetard(doc)) return lang === 'FR' ? 'En retard' : 'Overdue';
  return LIBELLES[doc.status]?.[lang] ?? doc.status;
}

export function statusTone(doc: Document): 'neutre' | 'accent' | 'encre' {
  if (enRetard(doc) || doc.status === 'Paid' || doc.status === 'Accepted') return 'accent';
  if (doc.status === 'Sent' || doc.status === 'Partial') return 'encre';
  return 'neutre';
}

const BOUTON_ICONE = 'w-11 h-11 flex items-center justify-center text-gris hover:text-encre transition-colors';

const ListeDocuments: React.FC<Props> = ({
  lang, documents, parametres, recurrencesCreees, onEdit, onPreview, onDelete, onRelancer, onEtatDeCompte,
}) => {
  const t = T[lang];
  const [filtre, setFiltre] = useState<'tous' | 'retard'>('tous');
  const [client, setClient] = useState('');

  const clientsConnus = useMemo(
    () => [...new Set<string>(documents.map((d) => d.clientName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [documents],
  );
  const visibles = documents
    .filter((d) => (filtre === 'retard' ? d.type === 'Invoice' && enRetard(d) : true))
    .filter((d) => (client ? d.clientName === client : true))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.number || '').localeCompare(a.number || ''));

  const actions = (doc: Document) => (
    <div className="flex items-center justify-end gap-1">
      {doc.type === 'Invoice' && enRetard(doc) && doc.clientEmail && (
        <Bouton variante="secondaire" petit icone={BellRing} onClick={() => onRelancer(doc)} className="mr-1">
          {t.relancer}
        </Bouton>
      )}
      <button onClick={() => onEdit(doc)} aria-label={t.edit} className={BOUTON_ICONE}>
        <Edit2 className="w-4 h-4" aria-hidden="true" />
      </button>
      <button onClick={() => onPreview(doc)} aria-label={t.preview} className={BOUTON_ICONE}>
        <Eye className="w-4 h-4" aria-hidden="true" />
      </button>
      <button onClick={() => onDelete(doc.id)} aria-label={t.delete} className={`${BOUTON_ICONE} hover:text-rose`}>
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
  const relance = (doc: Document) => {
    const relances = doc.relances || [];
    return relances.length > 0 ? (
      <p className="text-[13px] text-gris mt-1 whitespace-nowrap">
        {t.relanceeLe} {relances[relances.length - 1].date} · {t.relances(relances.length)}
      </p>
    ) : null;
  };
  const montants = (doc: Document) => {
    const total = totalDocument(doc, parametres);
    const solde = doc.type === 'Invoice' && doc.status !== 'Draft' ? soldeFacture(doc, documents, parametres).solde : null;
    return { total: argent(doc.type === 'Credit' ? -total : total), solde: solde !== null ? argent(solde) : '' };
  };

  return (
    <div className="space-y-6">
      {recurrencesCreees > 0 && (
        <div role="status" className="bg-rose/10 border border-rose/30 rounded-champ px-5 py-4 text-sm text-rose">
          {t.recurrentes(recurrencesCreees)}
        </div>
      )}

      <Panneau>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
          <div className="flex bg-papier rounded-champ p-1 border border-filet w-full md:w-auto" role="group">
            {(['tous', 'retard'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                aria-pressed={filtre === f}
                className={`flex-1 md:flex-none px-5 py-2 text-sm font-medium rounded-champ transition-colors ${filtre === f ? 'bg-bouton text-sur-bouton' : 'text-gris hover:text-encre'}`}
              >
                {f === 'tous' ? t.tous : t.retard}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Selection label={t.filtreClient} value={client} onChange={(e) => setClient(e.target.value)} className="sm:min-w-[16rem]">
              <option value="">{t.tousClients}</option>
              {clientsConnus.map((c) => <option key={c} value={c}>{c}</option>)}
            </Selection>
            <Bouton variante="secondaire" icone={ScrollText} disabled={!client} title={!client ? t.etatAvant : undefined} onClick={() => onEtatDeCompte(client)}>
              {t.etat}
            </Bouton>
          </div>
        </div>

        {visibles.length === 0 ? (
          <Vide titre={filtre === 'retard' ? t.videRetard : t.videTitre} texte={filtre === 'retard' ? undefined : t.videTexte} />
        ) : (
          <>
          {/* Sous 768 px, une carte par document : sept colonnes ne tiennent pas sur un téléphone. */}
          <ul className="md:hidden divide-y divide-filet">
            {visibles.map((doc) => {
              const m = montants(doc);
              return (
                <li key={doc.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-encre">{doc.number}</p>
                      <p className="text-sm text-gris break-words">{doc.clientName} · <span className="whitespace-nowrap">{doc.date}</span></p>
                    </div>
                    <Etiquette tone={statusTone(doc)}>{libelleStatut(doc, lang)}</Etiquette>
                  </div>
                  {relance(doc)}
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2">
                    <p className="text-sm text-encre tabular-nums whitespace-nowrap">
                      {m.total}{m.solde && <span className="text-gris"> · {t.solde} {m.solde}</span>}
                    </p>
                    {actions(doc)}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-filet">
                  <th className="kicker text-gris text-left py-3 pr-4">{t.numero}</th>
                  <th className="kicker text-gris text-left py-3 pr-4">{t.client}</th>
                  <th className="kicker text-gris text-left py-3 pr-4">{t.date}</th>
                  <th className="kicker text-gris text-left py-3 pr-4">{t.status}</th>
                  <th className="kicker text-gris text-right py-3 pr-4">{t.total}</th>
                  <th className="kicker text-gris text-right py-3 pr-4">{t.solde}</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-filet">
                {visibles.map((doc) => {
                  const m = montants(doc);
                  return (
                    <tr key={doc.id}>
                      <td className="py-3 pr-4 text-sm text-encre whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${doc.type === 'Invoice' ? 'text-encre' : 'text-rose'}`} aria-hidden="true" />
                          <span className="font-medium">{doc.number}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-encre">{doc.clientName}</td>
                      <td className="py-3 pr-4 text-sm text-gris whitespace-nowrap">{doc.date}</td>
                      <td className="py-3 pr-4 text-sm">
                        <Etiquette tone={statusTone(doc)}>{libelleStatut(doc, lang)}</Etiquette>
                        {relance(doc)}
                      </td>
                      <td className="py-3 pr-4 text-sm text-encre text-right tabular-nums whitespace-nowrap">{m.total}</td>
                      <td className="py-3 pr-4 text-sm text-encre text-right tabular-nums whitespace-nowrap">{m.solde}</td>
                      <td className="py-3">{actions(doc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Panneau>
    </div>
  );
};

export default ListeDocuments;
