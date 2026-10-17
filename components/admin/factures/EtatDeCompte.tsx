// L'état de compte d'un client, au même papier que les factures (DocumentFacture) : montants payés,
// en attente et en retard, le tableau des factures, puis les notes de crédit et le total dû.
// S'imprime en PDF et part par courriel (par le site, sinon mailto) comme une facture.
import React from 'react';
import { ArrowLeft, Mail, Printer } from 'lucide-react';
import { Bouton, IDENTITE, type Language } from '../../../lib/compta/ancrage';
import type { Document } from '../../../types';
import {
  aujourdhuiLocal, enRetard, lienFacturePublique, soldeFacture, totalDocument, type ParametresFacturation,
} from '../../../lib/factures';
import { argent, courrielEtatDeCompte } from '../../../lib/factures-courriel';
import { envoyerCourriel } from '../../../lib/factures-envoi';

interface Props {
  lang: Language;
  clientName: string;
  documents: Document[];
  parametres: ParametresFacturation;
  onBack: () => void;
}

const T = {
  FR: {
    back: 'Retour aux factures', envoyer: 'Envoyer', titre: 'État de compte', au: 'Au', client: 'Client',
    paye: 'Payé', attente: 'En attente', retard: 'En retard', factures: 'Factures', numero: 'Numéro', date: 'Date',
    echeance: 'Échéance', total: 'Total', payeCol: 'Payé', solde: 'Solde', notes: 'Notes de crédit', facture: 'Facture',
    montant: 'Montant', totalDu: 'Total dû', aucune: 'Aucune facture envoyée à ce client.', sansCourriel: "Ce client n'a pas de courriel au dossier.",
    site: 'Site créé par Vexel Webstudio',
  },
  EN: {
    back: 'Back to invoices', envoyer: 'Send', titre: 'Statement of account', au: 'As of', client: 'Client',
    paye: 'Paid', attente: 'Pending', retard: 'Overdue', factures: 'Invoices', numero: 'Number', date: 'Date',
    echeance: 'Due', total: 'Total', payeCol: 'Paid', solde: 'Balance', notes: 'Credit notes', facture: 'Invoice',
    montant: 'Amount', totalDu: 'Total due', aucune: 'No invoice sent to this client.', sansCourriel: 'This client has no email on file.',
    site: 'Site by Vexel Webstudio',
  },
};

const TH = 'py-3 kicker text-gris';
const TD = 'py-3 text-sm tabular-nums';

const EtatDeCompte: React.FC<Props> = ({ lang, clientName, documents, parametres, onBack }) => {
  const t = T[lang];
  const date = aujourdhuiLocal();
  const duClient = documents.filter((d) => d.clientName === clientName);
  const courriel = duClient.find((d) => d.clientEmail)?.clientEmail || '';
  const lignes = duClient
    .filter((d) => d.type === 'Invoice' && d.status !== 'Draft' && d.status !== 'Declined')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((d) => ({ doc: d, s: soldeFacture(d, documents, parametres), retard: enRetard(d, date) }));
  const notes = duClient.filter((d) => d.type === 'Credit' && d.status === 'Sent');
  const paye = lignes.reduce((s, l) => s + l.s.paye, 0);
  const retard = lignes.filter((l) => l.retard).reduce((s, l) => s + Math.max(l.s.solde, 0), 0);
  const attente = lignes.filter((l) => !l.retard).reduce((s, l) => s + Math.max(l.s.solde, 0), 0);
  const totalDu = lignes.reduce((s, l) => s + l.s.solde, 0);

  const envoyer = () => {
    const ouvertes = lignes
      .filter((l) => l.s.solde > 0.005)
      .map((l) => ({ numero: l.doc.number, dueDate: l.doc.dueDate, solde: l.s.solde, lien: l.doc.jetonPublic ? lienFacturePublique(l.doc.jetonPublic) : '' }));
    const nom = parametres.nomLegal || IDENTITE.nomLegal;
    void envoyerCourriel(courrielEtatDeCompte({ nom: clientName, courriel }, totalDu, ouvertes, date, { lang, nom }));
  };

  return (
    <div className="min-h-screen bg-papier flex flex-col items-center pt-10 pb-20 px-4 print:p-0 print:min-h-0">
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 min-h-[44px] text-gris hover:text-encre transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t.back}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="primaire" icone={Mail} petit onClick={envoyer} disabled={!courriel} title={!courriel ? t.sansCourriel : undefined}>{t.envoyer}</Bouton>
          <Bouton variante="secondaire" icone={Printer} petit onClick={() => window.print()}>PDF</Bouton>
        </div>
      </div>

      <div className="w-full max-w-4xl print:max-w-none bg-papier-2 border border-filet rounded-champ shadow-panneau print:shadow-none print:border-0 print:rounded-none p-5 sm:p-12 md:p-16 print:p-8">
        <style>{'@page { size: letter; margin: 0.65in; }'}</style>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 print:pb-4 border-b border-filet">
          <img src={IDENTITE.logo} alt={IDENTITE.nom} className="h-12 w-auto object-contain" />
          <div className="sm:text-right">
            <h1 className="font-serif text-h3 text-encre">{t.titre}</h1>
            <p className="font-serif text-lg text-rose mt-1">{t.au} {date}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 mt-8 print:mt-5">
          <div>
            <p className="kicker text-gris mb-2">{parametres.nomLegal || IDENTITE.nom}</p>
            <div className="text-sm text-gris leading-relaxed">
              {parametres.adresse && <p>{parametres.adresse}</p>}
              {parametres.courriel && <p>{parametres.courriel}</p>}
              {parametres.neq && <p>NEQ {parametres.neq}</p>}
            </div>
          </div>
          <div className="bg-papier p-5 print:p-4 rounded-champ border border-filet">
            <p className="kicker text-gris mb-1">{t.client}</p>
            <p className="font-sans font-semibold text-encre">{clientName}</p>
            {courriel && <p className="text-sm text-gris break-all">{courriel}</p>}
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mt-8 print:mt-5 border-y border-filet py-5">
          {[[t.paye, paye], [t.attente, attente], [t.retard, retard]].map(([libelle, valeur]) => (
            <div key={libelle as string}>
              <dt className="kicker text-gris">{libelle}</dt>
              <dd className="font-serif text-h3 text-encre tabular-nums mt-2 whitespace-nowrap">{argent(valeur as number)}</dd>
            </div>
          ))}
        </dl>

        <p className="kicker text-gris mt-10 print:mt-6 mb-2">{t.factures}</p>
        {lignes.length === 0 ? (
          <p className="text-sm text-gris">{t.aucune}</p>
        ) : (
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b-2 border-encre">
                <th className={`${TH} text-left`}>{t.numero}</th>
                <th className={`${TH} text-left hidden sm:table-cell w-28`}>{t.date}</th>
                <th className={`${TH} text-left w-[6.5rem] sm:w-28`}>{t.echeance}</th>
                <th className={`${TH} text-right hidden sm:table-cell w-28`}>{t.total}</th>
                <th className={`${TH} text-right hidden sm:table-cell w-28`}>{t.payeCol}</th>
                <th className={`${TH} text-right w-24 sm:w-28`}>{t.solde}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-filet">
              {lignes.map(({ doc, s, retard: enRetardLigne }) => (
                <tr key={doc.id}>
                  <td className={`${TD} text-encre font-medium whitespace-nowrap pr-2`}>{doc.number}</td>
                  <td className={`${TD} text-gris hidden sm:table-cell`}>{doc.date}</td>
                  <td className={`${TD} ${enRetardLigne ? 'text-rose' : 'text-gris'}`}>{doc.dueDate || ''}</td>
                  <td className={`${TD} text-encre text-right hidden sm:table-cell`}>{argent(s.total)}</td>
                  <td className={`${TD} text-gris text-right hidden sm:table-cell`}>{argent(s.paye + s.credits)}</td>
                  <td className={`${TD} text-encre text-right font-medium`}>{argent(s.solde)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {notes.length > 0 && (
          <>
            <p className="kicker text-gris mt-10 print:mt-6 mb-2">{t.notes}</p>
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-filet">
                  <th className={`${TH} text-left`}>{t.numero}</th>
                  <th className={`${TH} text-left hidden sm:table-cell w-28`}>{t.date}</th>
                  <th className={`${TH} text-left hidden sm:table-cell w-32`}>{t.facture}</th>
                  <th className={`${TH} text-right w-24 sm:w-28`}>{t.montant}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-filet">
                {notes.map((n) => (
                  <tr key={n.id}>
                    <td className={`${TD} text-encre whitespace-nowrap pr-2`}>{n.number}<span className="block sm:hidden text-gris">{n.factureNumero}</span></td>
                    <td className={`${TD} text-gris hidden sm:table-cell`}>{n.date}</td>
                    <td className={`${TD} text-gris whitespace-nowrap hidden sm:table-cell`}>{n.factureNumero}</td>
                    <td className={`${TD} text-encre text-right`}>{argent(-totalDocument(n, parametres))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="flex justify-end mt-8 print:mt-5">
          <div className="w-full sm:w-72 flex justify-between font-serif text-h3 text-encre pt-3 border-t-2 border-encre">
            <span>{t.totalDu}</span><span className="tabular-nums">{argent(totalDu)}</span>
          </div>
        </div>

        <p className="mt-12 pt-6 print:mt-2 print:pt-2 border-t border-filet text-[13px] text-gris text-center max-w-none">
          <a href="https://vexelwebstudio.com" target="_blank" rel="noreferrer" className="hover:text-rose transition-colors">{t.site}</a>
        </p>
      </div>
    </div>
  );
};

export default EtatDeCompte;
