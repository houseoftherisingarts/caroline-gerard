// La prévisualisation d'un document : le papier tel que la personne facturée le verra, et les gestes
// d'envoi (Envoyer par courriel, Copier le lien, PDF), de paiement, de signature du devis, de
// conversion du devis en facture et de note de crédit.
import React, { useState } from 'react';
import { Check, ArrowLeft, PenTool, Send, Copy, Printer, Mail, FileOutput, FileMinus } from 'lucide-react';
import { Bouton, Etiquette, type Language } from '../../../lib/compta/ancrage';
import DocumentFacture from './DocumentFacture';
import { libelleStatut, statusTone } from './ListeDocuments';
import type { Document } from '../../../types';
import { creditsDe, lienFacturePublique, totalDocument, type ParametresFacturation } from '../../../lib/factures';

interface Props {
  lang: Language;
  doc: Document;
  documents: Document[];
  parametres: ParametresFacturation;
  onBack: () => void;
  onPublier: () => Promise<void>;
  onEnvoyer: () => Promise<void>;
  onMarquerPayee: () => Promise<void>;
  onSigner: () => Promise<void>;
  onConvertir: () => Promise<void>;
  onNoteCredit: () => void;
}

const T = {
  FR: {
    back: 'Retour au tableau de bord', publier: 'Publier', republier: 'Mettre le lien à jour', envoyer: 'Envoyer',
    envoyeeLe: 'Envoyé le', copierLien: 'Copier le lien', lienCopie: 'Lien copié', marquerPayee: 'Marquer payée',
    convertir: 'Convertir en facture', noteCredit: 'Créer une note de crédit', signature: 'Signature',
    signed: 'Devis accepté et signé', clickSign: 'Cliquer ici pour signer', le: 'Le',
    publierAvant: 'Enregistrez le document avant de le publier.', sansCourriel: "Ce client n'a pas de courriel au dossier.",
    encadreAvecLien: "La personne facturée paie par le lien de paiement des réglages. Vérifiez que son montant correspond avant d'envoyer.",
    encadreSansLien: 'Aucun moyen de paiement configuré. Ajoutez un lien de paiement dans les réglages, ou laissez les modalités du document porter le mode de paiement.',
  },
  EN: {
    back: 'Back to dashboard', publier: 'Publish', republier: 'Update the link', envoyer: 'Send',
    envoyeeLe: 'Sent on', copierLien: 'Copy the link', lienCopie: 'Link copied', marquerPayee: 'Mark as paid',
    convertir: 'Convert to invoice', noteCredit: 'Create a credit note', signature: 'Signature',
    signed: 'Quote accepted and signed', clickSign: 'Click here to sign', le: 'On',
    publierAvant: 'Save the document before publishing it.', sansCourriel: 'This client has no email on file.',
    encadreAvecLien: 'Before you send it, check that the payment link set in your settings carries the amount of this invoice.',
    encadreSansLien: 'No payment method configured. Add a payment link in settings, or let the terms on the document carry the payment method.',
  },
};

const ApercuDocument: React.FC<Props> = ({
  lang, doc, documents, parametres, onBack, onPublier, onEnvoyer, onMarquerPayee, onSigner, onConvertir, onNoteCredit,
}) => {
  const t = T[lang];
  const [lienCopie, setLienCopie] = useState(false);
  const lien = doc.jetonPublic ? lienFacturePublique(doc.jetonPublic) : '';
  const credits = doc.type === 'Invoice' && doc.id
    ? creditsDe(doc, documents).map((c) => ({ numero: c.number, montant: totalDocument(c, parametres) }))
    : [];
  const peutCrediter = doc.type === 'Invoice' && ['Sent', 'Partial', 'Paid'].includes(doc.status);

  const copierLien = async () => {
    if (!lien) return;
    try {
      await navigator.clipboard.writeText(lien);
    } catch {
      // Le lien reste affiché à l'écran : Laurie le copie à la main si le presse-papier est bloqué.
    }
    setLienCopie(true);
    setTimeout(() => setLienCopie(false), 2000);
  };

  return (
    <div className="min-h-screen bg-papier flex flex-col items-center pt-10 pb-20 px-4 print:p-0 print:min-h-0">
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 min-h-[44px] text-gris hover:text-encre transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t.back}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Etiquette tone={statusTone(doc)}>{libelleStatut(doc, lang)}</Etiquette>
          {doc.envoyeeLe && <span className="text-[13px] text-gris">{t.envoyeeLe} {doc.envoyeeLe}</span>}
          <Bouton variante="primaire" icone={Mail} petit onClick={onEnvoyer} disabled={!doc.id || !doc.clientEmail}
            title={!doc.id ? t.publierAvant : !doc.clientEmail ? t.sansCourriel : undefined}>
            {t.envoyer}
          </Bouton>
          {lien ? (
            <Bouton variante="secondaire" icone={Copy} petit onClick={copierLien}>{lienCopie ? t.lienCopie : t.copierLien}</Bouton>
          ) : (
            <Bouton variante="secondaire" icone={Send} petit onClick={onPublier} disabled={!doc.id} title={!doc.id ? t.publierAvant : undefined}>
              {t.publier}
            </Bouton>
          )}
          <Bouton variante="secondaire" icone={Printer} petit onClick={() => window.print()}>PDF</Bouton>
          {doc.type === 'Quote' && <Bouton variante="secondaire" icone={FileOutput} petit onClick={onConvertir} disabled={!doc.id}>{t.convertir}</Bouton>}
          {peutCrediter && <Bouton variante="secondaire" icone={FileMinus} petit onClick={onNoteCredit}>{t.noteCredit}</Bouton>}
          {doc.type !== 'Credit' && doc.status !== 'Paid' && (
            <Bouton variante="secondaire" icone={Check} petit onClick={onMarquerPayee} disabled={!doc.id}>{t.marquerPayee}</Bouton>
          )}
        </div>
      </div>

      {lien && (
        <div className="w-full max-w-4xl mb-6 bg-papier-2 border border-filet rounded-champ p-4 text-sm text-gris print:hidden">
          <p>{parametres.lienPaiementStripe ? t.encadreAvecLien : t.encadreSansLien}</p>
          <a href={lien} target="_blank" rel="noreferrer" className="block mt-2 text-rose break-all">{lien}</a>
          <button onClick={onPublier} className="mt-2 min-h-[36px] text-sm text-gris hover:text-encre underline-offset-4 hover:underline">{t.republier}</button>
        </div>
      )}

      <div className="w-full max-w-4xl print:max-w-none">
        <DocumentFacture
          lang={lang}
          numero={doc.number}
          type={doc.type}
          date={doc.date}
          dueDate={doc.dueDate}
          clientName={doc.clientName}
          clientEmail={doc.clientEmail}
          items={doc.items}
          modalites={doc.terms}
          note={parametres.note}
          vendeur={parametres}
          remise={doc.remise}
          paiements={doc.paiements}
          credits={credits}
          factureNumero={doc.factureNumero}
        >
          {doc.type === 'Quote' && (
            <div>
              <h4 className="font-sans font-semibold text-encre mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5" aria-hidden="true" /> {t.signature}
              </h4>
              {doc.signed ? (
                <div className="border border-rose/30 bg-rose/10 rounded-champ p-6 flex items-center gap-4 text-rose">
                  <div className="w-10 h-10 rounded-pilule bg-rose/10 flex items-center justify-center">
                    <Check className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium">{t.signed}</p>
                    <p className="text-sm text-gris">{t.le} {doc.signatureDate}</p>
                  </div>
                </div>
              ) : (
                <button onClick={onSigner} className="w-full border border-dashed border-filet rounded-champ p-8 text-center bg-papier hover:border-rose transition-colors group">
                  <span className="font-serif text-h3 text-gris group-hover:text-rose transition-colors">{t.clickSign}</span>
                </button>
              )}
            </div>
          )}
        </DocumentFacture>
      </div>
    </div>
  );
};

export default ApercuDocument;
