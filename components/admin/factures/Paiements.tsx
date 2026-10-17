// Les paiements d'une facture : acomptes, paiements partiels et remboursements (montant négatif).
// Le statut suit le solde (lib/factures-calcul.ts, statutSelonSolde) : Partielle, puis Payée.
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Panneau, Bouton, Champ, Selection, type Language } from '../../../lib/compta/ancrage';
import { LIBELLES_MODE } from './DocumentFacture';
import type { ModePaiement, Paiement } from '../../../types';
import { aujourdhuiLocal, type Solde } from '../../../lib/factures';
import { argent } from '../../../lib/factures-courriel';

interface Props {
  lang: Language;
  paiements: Paiement[];
  solde: Solde;
  onAjouter: (paiement: Paiement) => Promise<void> | void;
}

const T = {
  FR: {
    titre: 'Paiements', total: 'Total', paye: 'Payé', credits: 'Crédits', solde: 'Solde',
    date: 'Date', montant: 'Montant', mode: 'Mode', note: 'Note (privée)',
    ajouter: 'Ajouter le paiement', aide: 'Un montant négatif enregistre un remboursement.',
    aucun: 'Aucun paiement reçu pour le moment.',
  },
  EN: {
    titre: 'Payments', total: 'Total', paye: 'Paid', credits: 'Credits', solde: 'Balance',
    date: 'Date', montant: 'Amount', mode: 'Method', note: 'Note (private)',
    ajouter: 'Add the payment', aide: 'A negative amount records a refund.',
    aucun: 'No payment received yet.',
  },
};

const MODES: ModePaiement[] = ['virement', 'cheque', 'comptant', 'stripe', 'autre'];

const Paiements: React.FC<Props> = ({ lang, paiements, solde, onAjouter }) => {
  const t = T[lang];
  const [date, setDate] = useState(aujourdhuiLocal());
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<ModePaiement>('virement');
  const [note, setNote] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const valeur = parseFloat(montant.replace(',', '.'));

  const ajouter = async () => {
    if (!Number.isFinite(valeur) || valeur === 0 || !date) return;
    setEnvoi(true);
    const p: Paiement = { id: `${Date.now()}`, date, montant: Math.round(valeur * 100) / 100, mode };
    if (note.trim()) p.note = note.trim().slice(0, 300);
    await onAjouter(p);
    setMontant('');
    setNote('');
    setEnvoi(false);
  };

  return (
    <Panneau titre={t.titre} className="space-y-5">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-gris">{t.total}</dt><dd className="text-encre tabular-nums">{argent(solde.total)}</dd></div>
        <div><dt className="text-gris">{solde.credits > 0 ? `${t.paye} + ${t.credits}` : t.paye}</dt><dd className="text-encre tabular-nums">{argent(solde.paye + solde.credits)}</dd></div>
        <div><dt className="text-gris">{t.solde}</dt><dd className="text-encre font-semibold tabular-nums">{argent(solde.solde)}</dd></div>
      </dl>

      {paiements.length === 0 ? (
        <p className="text-sm text-gris">{t.aucun}</p>
      ) : (
        <ul className="divide-y divide-filet border-y border-filet">
          {paiements.map((p) => (
            <li key={p.id} className="py-3 flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-encre">{p.date} · {LIBELLES_MODE[lang][p.mode] || p.mode}</p>
                {p.note && <p className="text-[13px] text-gris break-words">{p.note}</p>}
              </div>
              <span className="text-encre tabular-nums whitespace-nowrap">{argent(p.montant)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Champ label={t.date} id="paiement-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Champ label={t.montant} id="paiement-montant" type="number" step="0.01" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} />
        <Selection label={t.mode} id="paiement-mode" value={mode} onChange={(e) => setMode(e.target.value as ModePaiement)}>
          {MODES.map((m) => <option key={m} value={m}>{LIBELLES_MODE[lang][m]}</option>)}
        </Selection>
        <Champ label={t.note} id="paiement-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      </div>
      <p className="text-[13px] text-gris">{t.aide}</p>
      <Bouton variante="secondaire" icone={Plus} onClick={ajouter} disabled={envoi || !Number.isFinite(valeur) || valeur === 0} className="w-full">
        {t.ajouter}
      </Bouton>
    </Panneau>
  );
};

export default Paiements;
