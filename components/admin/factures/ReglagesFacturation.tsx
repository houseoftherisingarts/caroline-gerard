// Les réglages de facturation de Laurie (settings/facturation, admin seulement) : identité légale,
// numéros de taxes, modalités par défaut, lien de paiement et automatismes du serveur. Ouvert depuis l'onglet Factures.
import React, { useEffect, useState } from 'react';
import { Panneau, Bouton, Champ, Zone, writeDoc, type Language } from '../../../lib/compta/ancrage';
import type { ParametresFacturation } from '../../../lib/factures';

interface Props {
  lang: Language;
  parametres: ParametresFacturation;
  onClose: () => void;
}

const T = {
  FR: {
    titre: 'Réglages de facturation',
    nomLegal: 'Nom légal',
    courriel: 'Courriel de contact',
    adresse: 'Adresse',
    neq: 'NEQ',
    tps: 'Numéro de TPS',
    tvq: 'Numéro de TVQ',
    aideTaxe: 'Laissé vide, la taxe correspondante ne paraît sur aucun document.',
    stripe: 'Lien de paiement',
    aideStripe: 'Un lien de paiement Stripe. La personne facturée le voit sur la page publique de la facture.',
    modalites: 'Modalités par défaut',
    note: 'Note de remerciement',
    automatismes: 'Automatismes',
    paiementCarte: 'Paiement par carte au montant exact sur la page de la facture',
    aidePaiementCarte: "Demande le branchement Stripe par Vexel. Sans lui, la page montre le lien de paiement ci-dessus.",
    relances: 'Relancer seul les factures en retard, à 7, 21 et 45 jours',
    recurrences: 'Envoyer seul les factures récurrentes à leur date',
    aideServeur: "Ces deux envois partent du site chaque matin, une fois le courriel du site branché par Vexel. En attendant, les factures récurrentes vous attendent en brouillon.",
    annuler: 'Annuler',
    enregistrer: 'Enregistrer',
  },
  EN: {
    titre: 'Invoicing settings',
    nomLegal: 'Legal name',
    courriel: 'Contact email',
    adresse: 'Address',
    neq: 'Business number',
    tps: 'GST number',
    tvq: 'QST number',
    aideTaxe: 'Left empty, that tax never appears on a document.',
    stripe: 'Payment link',
    aideStripe: 'A Stripe payment link. The billed person sees it on the invoice public page.',
    modalites: 'Default terms',
    note: 'Thank-you note',
    automatismes: 'Automations',
    paiementCarte: 'Card payment for the exact amount on the invoice page',
    aidePaiementCarte: 'Requires the Stripe hookup by Vexel. Without it, the page shows the payment link above.',
    relances: 'Send reminders for overdue invoices on their own, at 7, 21 and 45 days',
    recurrences: 'Send recurring invoices on their own, on their date',
    aideServeur: 'Both go out from the site each morning once Vexel has hooked up its email. Until then, recurring invoices wait for you as drafts.',
    annuler: 'Cancel',
    enregistrer: 'Save',
  },
};

const ReglagesFacturation: React.FC<Props> = ({ lang, parametres, onClose }) => {
  const t = T[lang];
  const [form, setForm] = useState<ParametresFacturation>(parametres);
  const [enregistrement, setEnregistrement] = useState(false);
  useEffect(() => { setForm(parametres); }, [parametres]);

  const champ = (cle: keyof ParametresFacturation) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [cle]: e.target.value });
  const case_ = (cle: 'paiementCarte' | 'relancesAutomatiques' | 'envoiRecurrences', libelle: string) => (
    <label className="flex items-start gap-3 min-h-[44px] py-2 text-sm text-encre cursor-pointer">
      <input type="checkbox" checked={!!form[cle]} onChange={(e) => setForm({ ...form, [cle]: e.target.checked })} className="mt-0.5 w-4 h-4 accent-rose flex-shrink-0" />
      <span>{libelle}</span>
    </label>
  );

  const enregistrer = async () => {
    setEnregistrement(true);
    await writeDoc('settings/facturation', form, { merge: true });
    setEnregistrement(false);
    onClose();
  };

  return (
    <Panneau titre={t.titre} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Champ label={t.nomLegal} value={form.nomLegal} onChange={champ('nomLegal')} />
        <Champ label={t.courriel} type="email" value={form.courriel} onChange={champ('courriel')} />
      </div>
      <Champ label={t.adresse} value={form.adresse} onChange={champ('adresse')} />
      <div className="grid sm:grid-cols-3 gap-4">
        <Champ label={t.neq} value={form.neq} onChange={champ('neq')} />
        <Champ label={t.tps} value={form.tps} onChange={champ('tps')} aide={t.aideTaxe} />
        <Champ label={t.tvq} value={form.tvq} onChange={champ('tvq')} />
      </div>
      <Champ label={t.stripe} value={form.lienPaiementStripe} onChange={champ('lienPaiementStripe')} placeholder="https://buy.stripe.com/..." aide={t.aideStripe} />
      <Zone label={t.modalites} value={form.modalites} onChange={champ('modalites')} className="min-h-[6rem]" />
      <Champ label={t.note} value={form.note} onChange={champ('note')} />
      <div className="border-t border-filet pt-4">
        <p className="text-petit font-semibold text-encre mb-1">{t.automatismes}</p>
        {case_('paiementCarte', t.paiementCarte)}
        <p className="text-[13px] text-gris -mt-1 mb-2 pl-7">{t.aidePaiementCarte}</p>
        {case_('relancesAutomatiques', t.relances)}
        {case_('envoiRecurrences', t.recurrences)}
        <p className="text-[13px] text-gris pl-7">{t.aideServeur}</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Bouton variante="secondaire" onClick={onClose}>{t.annuler}</Bouton>
        <Bouton variante="primaire" onClick={enregistrer} disabled={enregistrement}>{t.enregistrer}</Bouton>
      </div>
    </Panneau>
  );
};

export default ReglagesFacturation;
