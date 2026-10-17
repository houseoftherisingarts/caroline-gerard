// La page publique d'une facture ou d'un devis : /facture/{jeton}. Lit le miroir public
// factures_publiques/{jeton} (jamais la collection admin `documents`), affiche le même document que
// l'admin (components/admin/factures/DocumentFacture.tsx) et propose le paiement par carte quand
// Laurie a configuré un lien (voir lib/factures.ts et CLAUDE.md, section paiement).
import React, { useEffect, useState } from 'react';
import { CreditCard, Paperclip } from 'lucide-react';
import DocumentFacture from '../components/admin/factures/DocumentFacture';
import { Chargement, Vide, useDocument, IDENTITE, type Language } from '../lib/compta/ancrage';
import { lienPaiementAvecReference, type FacturePubliqueDoc } from '../lib/factures';
import { payerParCarte } from '../lib/factures-envoi';

interface FacturePubliqueProps {
  jeton: string;
  lang: Language;
}

const T = {
  FR: {
    payer: 'Payer par carte',
    carteIndisponible: "Le paiement par carte n'est pas disponible pour le moment. Écrivez à l'adresse indiquée sur la facture.",
    payee: 'Facture payée. Merci.',
    confirmation: 'Paiement reçu, merci.',
    introuvableTitre: 'Facture introuvable',
    introuvableTexte: "Ce lien n'est plus valide, ou la facture a été retirée.",
    pieces: 'Documents joints',
  },
  EN: {
    payer: 'Pay by card',
    carteIndisponible: 'Card payment is not available right now. Please write to the address shown on the invoice.',
    payee: 'Invoice paid. Thank you.',
    confirmation: 'Payment received, thank you.',
    introuvableTitre: 'Invoice not found',
    introuvableTexte: 'This link is no longer valid, or the invoice was removed.',
    pieces: 'Attached files',
  },
};

// Exemple en mémoire pour la boucle de vérification visuelle : un build lancé avec --mode verif n'a
// aucune donnée Firestore réelle derrière un jeton de test. Jamais utilisé en production (voir plus bas).
const EXEMPLE_VERIF: FacturePubliqueDoc = {
  documentId: 'exemple',
  numero: 'FAC-2026-042',
  type: 'Invoice',
  date: '2026-09-01',
  dueDate: '2026-09-15',
  clientName: 'Compagnie de danse Fil Rouge',
  clientEmail: 'direction@filrouge.example',
  items: [
    { id: '1', description: 'Accompagnement stratégique, forfait mensuel', quantity: 1, price: 850 },
    { id: '2', description: 'Révision du plan de communication', quantity: 3, price: 90 },
  ],
  totaux: { sousTotal: 1120, remise: 0, tps: 56, tvq: 111.72, total: 1287.72 },
  statut: 'Partial',
  paiements: [{ date: '2026-09-02', montant: 500, mode: 'virement' }],
  credits: [],
  solde: 787.72,
  piecesJointes: [{ nom: 'plan-de-communication.pdf', url: '/images/logo-laurie.png' }],
  modalites: "1. Paiement : la balance est due dans les 15 jours suivant la réception.\n2. Retard : un retard de plus de 30 jours entraîne des frais d'intérêt de 2 % par mois.",
  note: 'Merci de votre confiance.',
  vendeur: { nomLegal: IDENTITE.nomLegal, adresse: 'Montréal, Québec', neq: '1234567890', tps: '123456789RT0001', tvq: '1234567890TQ0001', courriel: IDENTITE.courriel },
  lienPaiementStripe: 'https://buy.stripe.com/exemple',
  paiementCarte: new URLSearchParams(window.location.search).get('carte') === '1',
  publieLe: '2026-09-01T12:00:00.000Z',
};

const FacturePublique: React.FC<FacturePubliqueProps> = ({ jeton, lang }) => {
  const t = T[lang];
  const modeVerif = import.meta.env.MODE === 'verif';
  const { data: reel, loading } = useDocument<FacturePubliqueDoc>(`factures_publiques/${jeton}`);
  const facture = reel ?? (modeVerif && !loading ? EXEMPLE_VERIF : null);

  // Adresse hors du site indexé : jamais dans les résultats de recherche, le jeton suffit comme sécurité.
  useEffect(() => {
    const balise = document.createElement('meta');
    balise.name = 'robots';
    balise.content = 'noindex, nofollow';
    document.head.appendChild(balise);
    document.title = facture ? `${facture.numero} · ${IDENTITE.nom}` : IDENTITE.nom;
    return () => { document.head.removeChild(balise); };
  }, [facture]);

  const [carte, setCarte] = useState<'repos' | 'attente' | 'indisponible'>('repos');
  const payer = async () => {
    setCarte('attente');
    if (!(await payerParCarte(jeton))) setCarte('indisponible');
  };

  const paramsUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const viensDePayer = paramsUrl?.get('paye') === '1';

  if (loading && !modeVerif) {
    return (
      <div className="min-h-screen bg-papier flex items-center justify-center">
        <Chargement />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="min-h-screen bg-papier flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-papier-2 border border-filet rounded-champ p-10">
          <Vide titre={t.introuvableTitre} texte={t.introuvableTexte} />
        </div>
      </div>
    );
  }

  const dejaPayee = facture.statut === 'Paid' || (facture.solde !== undefined && facture.solde <= 0.005 && facture.type === 'Invoice');
  const lienPaiement = facture.lienPaiementStripe
    ? lienPaiementAvecReference(facture.lienPaiementStripe, facture)
    : '';

  return (
    <div className="min-h-screen bg-papier flex flex-col items-center py-10 sm:py-16 px-4 print:p-0 print:min-h-0">
      <div className="w-full max-w-4xl print:max-w-none">
        {(viensDePayer || dejaPayee) && (
          <div className="mb-6 bg-rose/10 border border-rose/30 rounded-champ px-5 py-4 text-sm text-rose">
            {dejaPayee ? t.payee : t.confirmation}
          </div>
        )}

        <DocumentFacture
          lang={lang}
          numero={facture.numero}
          type={facture.type}
          date={facture.date}
          dueDate={facture.dueDate}
          clientName={facture.clientName}
          clientEmail={facture.clientEmail}
          items={facture.items}
          modalites={facture.modalites}
          note={facture.note}
          vendeur={facture.vendeur}
          remise={facture.remise}
          paiements={facture.paiements}
          credits={facture.credits}
          factureNumero={facture.factureNumero}
        >
          {!!facture.piecesJointes?.length && (
            <div className="mb-8">
              <p className="kicker text-gris mb-3">{t.pieces}</p>
              <ul className="space-y-2">
                {facture.piecesJointes.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-rose hover:underline break-all">
                      <Paperclip className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      {p.nom}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!dejaPayee && facture.type === 'Invoice' && facture.paiementCarte && (
            <div className="flex flex-col items-end gap-3">
              <button
                type="button"
                onClick={payer}
                disabled={carte === 'attente'}
                className="inline-flex items-center gap-3 min-h-[44px] px-8 rounded-pilule bg-bouton text-sur-bouton hover:bg-bouton-2 text-base font-medium transition-colors disabled:opacity-60"
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                {t.payer}
              </button>
              {carte === 'indisponible' && <p className="text-sm text-gris text-right max-w-md">{t.carteIndisponible}</p>}
            </div>
          )}
          {!dejaPayee && facture.type !== 'Credit' && !facture.paiementCarte && lienPaiement && (
            <div className="flex justify-end">
              <a
                href={lienPaiement}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 min-h-[44px] px-8 rounded-pilule bg-bouton text-sur-bouton hover:bg-bouton-2 text-base font-medium transition-colors"
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                {t.payer}
              </a>
            </div>
          )}
        </DocumentFacture>
      </div>
    </div>
  );
};

export default FacturePublique;
