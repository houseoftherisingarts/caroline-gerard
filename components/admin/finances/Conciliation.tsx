// Conciliation bancaire : solde de départ et de fin saisis, cases à cocher par lot sur les
// transactions du mois choisi, écart affiché en temps réel. Un solde à zéro veut dire que tout
// concorde avec le relevé papier ou en ligne de l'institution.
import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Panneau, Bouton, Champ, Selection, Chiffre, Vide, type Language } from '../../../lib/compta/ancrage';
import { useTransactions, modifierTransaction } from '../../../lib/compta/transactions';
import { useReglagesCompta } from '../../../lib/compta/periodes';
import { periodesDe } from '../../../lib/compta/periodes';
import { formatMontant } from '../../../lib/compta/format';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    titre: 'Conciliation bancaire', sous: 'Cochez les transactions qui apparaissent sur votre relevé, jusqu\'à écart nul.',
    mois: 'Mois', soldeDepart: 'Solde de départ', soldeFin: 'Solde de fin (relevé)',
    ecart: 'Écart', ecartNul: 'Tout concorde.', ecartTexte: 'Différence entre le solde de fin attendu et le solde de fin du relevé.',
    soldeCalcule: 'Solde calculé', date: 'Date', description: 'Description', montant: 'Montant', tout: 'Tout cocher', rien: 'Tout décocher',
    vide: 'Aucune transaction ce mois-ci', videTexte: 'Choisissez un autre mois, ou ajoutez des transactions.',
    dejaConcilie: 'déjà conciliée', marquerN: (n: number) => `Marquer ${n} transaction${n > 1 ? 's' : ''} conciliée${n > 1 ? 's' : ''}`,
  },
  EN: {
    titre: 'Bank reconciliation', sous: 'Check the transactions that appear on your statement, until the gap is zero.',
    mois: 'Month', soldeDepart: 'Opening balance', soldeFin: 'Closing balance (statement)',
    ecart: 'Gap', ecartNul: 'Everything matches.', ecartTexte: 'Difference between the expected closing balance and the statement.',
    soldeCalcule: 'Calculated balance', date: 'Date', description: 'Description', montant: 'Amount', tout: 'Check all', rien: 'Uncheck all',
    vide: 'No transactions this month', videTexte: 'Choose another month, or add transactions.',
    dejaConcilie: 'already reconciled', marquerN: (n: number) => `Mark ${n} transaction${n > 1 ? 's' : ''} reconciled`,
  },
};

const Conciliation: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: transactions } = useTransactions();
  const { reglages } = useReglagesCompta();
  const [annee] = useState(new Date().getFullYear());
  const { mois } = periodesDe(reglages, annee);
  const [moisChoisi, setMoisChoisi] = useState(new Date().getMonth());
  const [soldeDepart, setSoldeDepart] = useState('0');
  const [soldeFin, setSoldeFin] = useState('');
  const [coches, setCoches] = useState<Set<string>>(new Set());

  const periode = mois[moisChoisi];
  const transactionsMois = useMemo(
    () => transactions.filter((tr) => tr.date >= periode.debut && tr.date <= periode.fin).sort((a, b) => a.date.localeCompare(b.date)),
    [transactions, periode]
  );

  const basculer = (id: string) => setCoches((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toutCocher = () => setCoches(new Set(transactionsMois.map((tr) => tr.id)));
  const toutDecocher = () => setCoches(new Set());

  const mouvementCoche = transactionsMois
    .filter((tr) => coches.has(tr.id))
    .reduce((s, tr) => s + (tr.sens === 'revenu' ? tr.total : -tr.total), 0);
  const soldeCalcule = (parseFloat(soldeDepart) || 0) + mouvementCoche;
  const ecart = soldeFin ? soldeCalcule - (parseFloat(soldeFin) || 0) : 0;

  const marquerConcilie = async () => {
    for (const id of coches) await modifierTransaction(id, { concilie: true });
    setCoches(new Set());
  };

  return (
    <div className="space-y-4">
      <Panneau titre={t.titre} className="space-y-6">
        <p className="text-gris text-sm mesure">{t.sous}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Selection label={t.mois} value={moisChoisi} onChange={(e) => setMoisChoisi(Number(e.target.value))}>
            {mois.map((p, i) => <option key={i} value={i}>{p.libelle}</option>)}
          </Selection>
          <Champ label={t.soldeDepart} type="number" step="0.01" value={soldeDepart} onChange={(e) => setSoldeDepart(e.target.value)} />
          <Champ label={t.soldeFin} type="number" step="0.01" value={soldeFin} onChange={(e) => setSoldeFin(e.target.value)} placeholder="0,00" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Chiffre valeur={formatMontant(soldeCalcule)} libelle={t.soldeCalcule} />
          <Chiffre valeur={formatMontant(ecart)} libelle={t.ecart} note={soldeFin ? (Math.abs(ecart) < 0.005 ? t.ecartNul : t.ecartTexte) : undefined} />
        </div>
      </Panneau>

      <Panneau titre={periode.libelle} actions={<><Bouton variante="secondaire" petit onClick={toutCocher}>{t.tout}</Bouton><Bouton variante="discret" petit onClick={toutDecocher}>{t.rien}</Bouton></>}>
        {transactionsMois.length === 0 ? (
          <Vide titre={t.vide} texte={t.videTexte} />
        ) : (
          <>
            <div className="defile-x">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="divide-y divide-filet border-b border-filet">
                    <th className="py-3 pr-3 w-10" />
                    <th className="py-3 pr-3 kicker text-gris">{t.date}</th>
                    <th className="py-3 pr-3 kicker text-gris">{t.description}</th>
                    <th className="py-3 kicker text-gris text-right">{t.montant}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-filet">
                  {transactionsMois.map((tr) => (
                    <tr key={tr.id} className={`cursor-pointer ${coches.has(tr.id) ? 'bg-rose/5' : ''}`} onClick={() => basculer(tr.id)}>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded border ${coches.has(tr.id) ? 'bg-bouton border-bouton text-sur-bouton' : 'border-filet'}`}>
                          {coches.has(tr.id) && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-sm text-gris whitespace-nowrap">{tr.date}</td>
                      <td className="py-3 pr-3 text-sm text-encre">{tr.description} {tr.concilie && <span className="text-[13px] text-gris">({t.dejaConcilie})</span>}</td>
                      <td className="py-3 text-sm text-right tabular-nums text-encre">{tr.sens === 'revenu' ? '+' : '−'}{formatMontant(tr.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <Bouton onClick={marquerConcilie} disabled={coches.size === 0}>{t.marquerN(coches.size)}</Bouton>
            </div>
          </>
        )}
      </Panneau>
    </div>
  );
};

export default Conciliation;
