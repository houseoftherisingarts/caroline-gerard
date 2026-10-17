// Le document imprimé : devis ou facture, dans la charte de Laurie (papier, encre, un seul accent,
// Playfair pour le numéro et le total, Figtree pour le reste). Une seule source de vérité pour trois
// écrans : l'aperçu de l'éditeur, la prévisualisation admin et la page publique /facture/{jeton}
// (pages/FacturePublique.tsx). La feuille @page en tête donne un PDF Lettre US propre par « Imprimer »;
// tout ce qui n'a pas sa place sur le papier (signature, bouton de paiement) passe par `children`,
// masqué à l'impression.
import React from 'react';
import { IDENTITE, type Language } from '../../../lib/compta/ancrage';
import type { DocumentType, InvoiceItem, ModePaiement } from '../../../types';
import { calculerTotaux, montantLigne, type ParametresFacturation } from '../../../lib/factures';
import { argent } from '../../../lib/factures-courriel';

export type Vendeur = Pick<ParametresFacturation, 'nomLegal' | 'adresse' | 'neq' | 'tps' | 'tvq' | 'courriel'>;

interface DocumentFactureProps {
  lang: Language;
  numero: string;
  type: DocumentType;
  date: string;
  dueDate?: string | null;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  modalites: string;
  note: string;
  vendeur: Vendeur;
  /** Remise en dollars sur le sous-total. */
  remise?: number;
  paiements?: { date: string; montant: number; mode: ModePaiement }[];
  /** Notes de crédit envoyées qui réduisent le solde de la facture. */
  credits?: { numero: string; montant: number }[];
  /** Note de crédit : le numéro de la facture créditée. */
  factureNumero?: string;
  className?: string;
  children?: React.ReactNode;
}

export const LIBELLES_MODE: Record<Language, Record<ModePaiement, string>> = {
  FR: { stripe: 'carte', virement: 'virement', cheque: 'chèque', comptant: 'comptant', autre: 'autre' },
  EN: { stripe: 'card', virement: 'transfer', cheque: 'cheque', comptant: 'cash', autre: 'other' },
};

const T = {
  FR: {
    quote: 'Devis', invoice: 'Facture', credit: 'Note de crédit', billedTo: 'Facturé à', date: 'Date', dueDate: 'Échéance',
    description: 'Description', qty: 'Qté', price: 'Prix unitaire', lineTotal: 'Montant',
    subtotal: 'Sous-total', tps: 'TPS', tvq: 'TVQ', total: 'Total', terms: 'Modalités',
    site: 'Site créé par Vexel Webstudio', remise: 'Remise', rabais: 'Rabais',
    creditApplique: 'Crédit appliqué à la facture', creditNo: 'Note de crédit',
    paiement: 'Paiement reçu le', remboursement: 'Remboursement le', solde: 'Solde dû',
  },
  EN: {
    quote: 'Quote', invoice: 'Invoice', credit: 'Credit note', billedTo: 'Billed to', date: 'Date', dueDate: 'Due date',
    description: 'Description', qty: 'Qty', price: 'Unit price', lineTotal: 'Amount',
    subtotal: 'Subtotal', tps: 'GST', tvq: 'QST', total: 'Total', terms: 'Terms',
    site: 'Site by Vexel Webstudio', remise: 'Discount', rabais: 'Discount',
    creditApplique: 'Credit applied to invoice', creditNo: 'Credit note',
    paiement: 'Payment received on', remboursement: 'Refund on', solde: 'Balance due',
  },
};

const Rangee: React.FC<{ libelle: React.ReactNode; montant: number }> = ({ libelle, montant }) => (
  <div className="flex justify-between gap-4 text-gris text-sm">
    <span>{libelle}</span><span className="tabular-nums whitespace-nowrap">{argent(montant)}</span>
  </div>
);

const DocumentFacture: React.FC<DocumentFactureProps> = ({
  lang, numero, type, date, dueDate, clientName, clientEmail, items, modalites, note, vendeur,
  remise = 0, paiements = [], credits = [], factureNumero, className = '', children,
}) => {
  const t = T[lang];
  const deuxPoints = lang === 'FR' ? ' :' : ':';
  const totaux = calculerTotaux(items, vendeur, remise);
  // Une note de crédit garde des lignes positives dans les données et se lit en négatif sur le papier.
  const signe = type === 'Credit' ? -1 : 1;
  const ajustements = credits.length > 0 || paiements.length > 0;
  const solde = totaux.total - credits.reduce((s, c) => s + c.montant, 0) - paiements.reduce((s, p) => s + p.montant, 0);

  return (
    <div className={`bg-papier-2 border border-filet rounded-champ shadow-panneau print:shadow-none print:border-0 print:rounded-none p-5 sm:p-12 md:p-16 print:p-8 ${className}`}>
      <style>{'@page { size: letter; margin: 0.65in; }'}</style>

      {/* En-tête : logo, type de document et numéro */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 print:pb-4 border-b border-filet">
        <img src={IDENTITE.logo} alt={IDENTITE.nom} className="h-12 w-auto object-contain" />
        <div className="sm:text-right">
          <h1 className="font-serif text-h3 text-encre">{type === 'Quote' ? t.quote : type === 'Credit' ? t.credit : t.invoice}</h1>
          <p className="font-serif text-lg text-rose mt-1">#{numero}</p>
        </div>
      </div>

      {/* Vendeur et échéances */}
      <div className="grid sm:grid-cols-2 gap-8 mt-8 print:mt-5">
        <div>
          <p className="kicker text-gris mb-2">{vendeur.nomLegal ? vendeur.nomLegal : IDENTITE.nom}</p>
          <div className="text-sm text-gris leading-relaxed">
            {vendeur.adresse && <p>{vendeur.adresse}</p>}
            {vendeur.courriel && <p>{vendeur.courriel}</p>}
            {vendeur.neq && <p>NEQ {vendeur.neq}</p>}
            {vendeur.tps && <p>{t.tps} {vendeur.tps}</p>}
            {vendeur.tvq && <p>{t.tvq} {vendeur.tvq}</p>}
          </div>
        </div>
        <div className="sm:text-right text-sm text-gris">
          <p><span className="text-encre font-medium">{t.date}{deuxPoints}</span> {date}</p>
          {dueDate && <p className="mt-1"><span className="text-encre font-medium">{t.dueDate}{deuxPoints}</span> {dueDate}</p>}
        </div>
      </div>

      {/* Client */}
      <div className="mt-6 print:mt-4 bg-papier p-5 print:p-4 rounded-champ border border-filet">
        <p className="kicker text-gris mb-1">{t.billedTo}</p>
        <p className="font-sans font-semibold text-encre">{clientName}</p>
        {clientEmail && <p className="text-sm text-gris">{clientEmail}</p>}
      </div>
      {type === 'Credit' && factureNumero && (
        <p className="mt-4 text-sm text-encre">{t.creditApplique} <span className="font-medium">{factureNumero}</span>.</p>
      )}

      {/* Lignes : le prix unitaire se cache sous 640 px, la description a besoin de la place */}
      <div className="mt-10 print:mt-6">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b-2 border-encre">
              <th className="text-left py-3 pr-3 kicker text-gris">{t.description}</th>
              <th className="text-center py-3 kicker text-gris w-14 sm:w-20 px-2">{t.qty}</th>
              <th className="hidden sm:table-cell text-right py-3 kicker text-gris w-28 px-2">{t.price}</th>
              <th className="text-right py-3 kicker text-gris w-24 sm:w-28 px-2">{t.lineTotal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filet">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-2 sm:pr-4 text-sm text-encre break-words">
                  {item.description}
                  {!!item.rabais && <span className="block text-[13px] text-gris">{t.rabais} {item.rabais} %</span>}
                </td>
                <td className="py-3 text-sm text-encre text-center">{item.quantity}</td>
                <td className="hidden sm:table-cell py-3 text-sm text-gris text-right">{argent(signe * item.price)}</td>
                <td className="py-3 text-sm text-encre text-right font-medium tabular-nums">{argent(signe * montantLigne(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="flex justify-end mt-8 print:mt-5">
        <div className="w-full sm:w-72 space-y-2">
          <Rangee libelle={t.subtotal} montant={signe * totaux.sousTotal} />
          {totaux.remise > 0 && <Rangee libelle={t.remise} montant={-signe * totaux.remise} />}
          {totaux.tps > 0 && <Rangee libelle={`${t.tps} (${vendeur.tps})`} montant={signe * totaux.tps} />}
          {totaux.tvq > 0 && <Rangee libelle={`${t.tvq} (${vendeur.tvq})`} montant={signe * totaux.tvq} />}
          <div className="flex justify-between font-serif text-h3 text-encre pt-3 border-t-2 border-encre">
            <span>{t.total}</span><span className="tabular-nums">{argent(signe * totaux.total)}</span>
          </div>
          {ajustements && (
            <div className="pt-3 space-y-2">
              {credits.map((c) => <Rangee key={c.numero} libelle={`${t.creditNo} ${c.numero}`} montant={-c.montant} />)}
              {paiements.map((p, i) => (
                <Rangee
                  key={`${p.date}-${i}`}
                  libelle={<>{p.montant < 0 ? t.remboursement : t.paiement} <span className="whitespace-nowrap">{p.date}</span> ({LIBELLES_MODE[lang][p.mode] || p.mode})</>}
                  montant={-p.montant}
                />
              ))}
              <div className="flex justify-between font-sans font-semibold text-encre pt-2 border-t border-filet">
                <span>{t.solde}</span><span className="tabular-nums">{argent(solde)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modalités et remerciement */}
      {modalites && (
        <div className="mt-10 pt-8 print:mt-5 print:pt-4 border-t border-filet">
          <p className="kicker text-gris mb-2">{t.terms}</p>
          <p className="text-gris text-sm whitespace-pre-line">{modalites}</p>
        </div>
      )}
      {note && <p className="mt-6 print:mt-4 text-sm text-encre">{note}</p>}

      {/* Zone d'action (signature, paiement) : jamais sur le papier */}
      {children && <div className="mt-10 print:hidden">{children}</div>}

      <p className="mt-12 pt-6 print:mt-2 print:pt-2 border-t border-filet text-[13px] text-gris text-center max-w-none">
        <a href="https://vexelwebstudio.com" target="_blank" rel="noreferrer" className="hover:text-rose transition-colors">{t.site}</a>
      </p>
    </div>
  );
};

export default DocumentFacture;
