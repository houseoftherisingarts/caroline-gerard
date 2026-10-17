// Aperçu de la comptabilité : les cartes du haut, le sélecteur de période (réutilisé par Rapports.tsx),
// le graphique revenus/dépenses par mois, la répartition des dépenses, les dernières transactions et
// la liste « À faire ». Contrat : lib/compta/types.ts. Canon : CANON-ADMIN.md.
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Receipt, Tag, CalendarClock, ArrowRight, Repeat } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Panneau, Chiffre, Bouton, Vide, Chargement, useCollection, type Language } from '../../../lib/compta/ancrage';
import CartesFiscales from './CartesFiscales';
import { useTransactions, totaux } from '../../../lib/compta/transactions';
import { usePlanComptable, nomCompte } from '../../../lib/compta/plan-defaut';
import { useReglagesCompta } from '../../../lib/compta/periodes';
import { periodesDe, dansPeriode } from '../../../lib/compta/periodes';
import { etatDesResultats, depensesParCompte, ageDesComptesClients, totalDocumentTTC } from '../../../lib/compta/rapports';
import { taxesARemettre, periodeDeclarationCourante } from '../../../lib/compta/fiscal';
import { formatMontant, formatMontantRond } from '../../../lib/compta/format';
import { EXEMPLE_FACTURES } from '../../../lib/compta/exemple';
import type { Document as DocumentFacture } from '../../../types';
import type { Periode, ReglagesCompta } from '../../../lib/compta/types';
import type { OngletFinance } from './Onglets';

interface Props {
  lang: Language;
  onAllerA?: (onglet: OngletFinance) => void;
  /** Dépenses récurrentes créées à l'ouverture de Finances (lib/compta/recurrence.ts). */
  recurrentesAjoutees?: number;
}

// --- Lecture des factures (collection `documents`), avec le même filet de sécurité qu'en verif que
// useTransactions() applique aux transactions : voir lib/compta/transactions.ts. ---
export function useFacturesAvecExemple() {
  const { data, loading } = useCollection<DocumentFacture>('documents');
  const modeVerif = import.meta.env.MODE === 'verif';
  const result = useMemo(() => (data.length > 0 || !modeVerif || loading ? data : EXEMPLE_FACTURES), [data, modeVerif, loading]);
  return { data: result, loading: modeVerif ? false : loading };
}

// --- Sélecteur de période, partagé avec Rapports.tsx ---

export type TypePeriode = 'mois' | 'trimestre' | 'exercice' | 'personnalisee';

export interface EtatPeriode {
  type: TypePeriode;
  indexMois: number;
  indexTrimestre: number;
  customDebut: string;
  customFin: string;
  comparer: boolean;
}

const isoAuj = () => new Date().toISOString().slice(0, 10);

export function etatPeriodeInitial(mois: Periode[], trimestres: Periode[], exercice: Periode): EtatPeriode {
  const dateStr = isoAuj();
  const iM = Math.max(0, mois.findIndex((m) => dansPeriode(dateStr, m)));
  const iT = Math.max(0, trimestres.findIndex((tr) => dansPeriode(dateStr, tr)));
  return { type: 'exercice', indexMois: iM, indexTrimestre: iT, customDebut: exercice.debut, customFin: dateStr, comparer: false };
}

export function usePeriodeChoisie(reglages: ReglagesCompta) {
  const annee = reglages.anneeFiscale || new Date().getFullYear();
  const { exercice, trimestres, mois } = useMemo(() => periodesDe(reglages, annee), [reglages, annee]);
  const [etat, setEtat] = useState<EtatPeriode>(() => etatPeriodeInitial(mois, trimestres, exercice));

  const periode: Periode = useMemo(() => {
    if (etat.type === 'mois') return mois[etat.indexMois] || exercice;
    if (etat.type === 'trimestre') return trimestres[etat.indexTrimestre] || exercice;
    if (etat.type === 'personnalisee') return { debut: etat.customDebut, fin: etat.customFin, libelle: '' };
    return exercice;
  }, [etat, mois, trimestres, exercice]);

  const periodePrecedente: Periode = useMemo(() => {
    if (etat.type === 'exercice') return periodesDe(reglages, annee - 1).exercice;
    if (etat.type === 'mois') {
      return etat.indexMois > 0 ? mois[etat.indexMois - 1] : periodesDe(reglages, annee - 1).mois[11];
    }
    if (etat.type === 'trimestre') {
      return etat.indexTrimestre > 0 ? trimestres[etat.indexTrimestre - 1] : periodesDe(reglages, annee - 1).trimestres[3];
    }
    const debut = new Date(`${periode.debut}T00:00:00Z`);
    const fin = new Date(`${periode.fin}T00:00:00Z`);
    const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000) + 1;
    const finPrec = new Date(debut.getTime() - 86400000);
    const debutPrec = new Date(finPrec.getTime() - (jours - 1) * 86400000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { debut: iso(debutPrec), fin: iso(finPrec), libelle: '' };
  }, [etat, reglages, annee, mois, trimestres, periode]);

  return { etat, setEtat, periode, periodePrecedente, exercice, trimestres, mois, annee };
}

const TEXTES_PERIODE = {
  FR: { mois: 'Mois', trimestre: 'Trimestre', exercice: 'Exercice', personnalisee: 'Personnalisée', comparer: 'Comparer à la période précédente', debut: 'Début', fin: 'Fin' },
  EN: { mois: 'Month', trimestre: 'Quarter', exercice: 'Fiscal year', personnalisee: 'Custom', comparer: 'Compare to previous period', debut: 'Start', fin: 'End' },
};

export const SelecteurPeriode: React.FC<{
  lang: Language;
  etat: EtatPeriode;
  onChange: (etat: EtatPeriode) => void;
  mois: Periode[];
  trimestres: Periode[];
  exercice: Periode;
  masquerComparaison?: boolean;
}> = ({ lang, etat, onChange, mois, trimestres, exercice, masquerComparaison }) => {
  const t = TEXTES_PERIODE[lang];
  const champSelect = 'bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose min-h-[40px]';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label={t.exercice} value={etat.type} onChange={(e) => onChange({ ...etat, type: e.target.value as TypePeriode })} className={`${champSelect} min-w-[9rem]`}>
        <option value="exercice">{t.exercice}</option>
        <option value="trimestre">{t.trimestre}</option>
        <option value="mois">{t.mois}</option>
        <option value="personnalisee">{t.personnalisee}</option>
      </select>
      {etat.type === 'mois' && (
        <select aria-label={t.mois} value={etat.indexMois} onChange={(e) => onChange({ ...etat, indexMois: Number(e.target.value) })} className={champSelect}>
          {mois.map((m, i) => (
            <option key={m.debut} value={i}>{m.libelle}</option>
          ))}
        </select>
      )}
      {etat.type === 'trimestre' && (
        <select aria-label={t.trimestre} value={etat.indexTrimestre} onChange={(e) => onChange({ ...etat, indexTrimestre: Number(e.target.value) })} className={champSelect}>
          {trimestres.map((tr, i) => (
            <option key={tr.debut} value={i}>{tr.libelle}</option>
          ))}
        </select>
      )}
      {etat.type === 'personnalisee' && (
        <>
          <input type="date" aria-label={t.debut} value={etat.customDebut} onChange={(e) => onChange({ ...etat, customDebut: e.target.value })} className="bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose" />
          <input type="date" aria-label={t.fin} value={etat.customFin} onChange={(e) => onChange({ ...etat, customFin: e.target.value })} className="bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose" />
        </>
      )}
      {!masquerComparaison && (
        <Bouton variante={etat.comparer ? 'primaire' : 'secondaire'} petit onClick={() => onChange({ ...etat, comparer: !etat.comparer })}>
          {t.comparer}
        </Bouton>
      )}
    </div>
  );
};

const TEXTES = {
  FR: {
    kicker: 'Comptabilité',
    titre: 'Aperçu',
    lede: 'La santé financière en un coup d\'œil : ce qui rentre, ce qui sort, ce qui reste à faire.',
    revenus: 'Revenus', depenses: 'Dépenses', profit: 'Profit', aRecevoir: 'Comptes clients à recevoir',
    facturesEnAttente: (n: number) => `${n} facture${n > 1 ? 's' : ''} en attente`,
    graphTitre: 'Revenus et dépenses par mois',
    graphVide: 'Aucune transaction', graphVideTexte: 'Ajoutez des transactions pour voir le graphique se remplir.',
    repartitionTitre: 'Dépenses par compte', repartitionVideTitre: 'Aucune dépense', repartitionVideTexte: 'Aucune dépense sur la période choisie.',
    recentesTitre: 'Dernières transactions', recentesVideTitre: 'Aucune transaction', recentesVideTexte: 'Le grand livre est vide pour l\'instant.',
    aFaireTitre: 'À faire', aFaireVideTitre: 'Rien à faire', aFaireVideTexte: 'Tout est à jour pour l\'instant.',
    facturesRetard: (n: number, montant: string) => `${n} facture${n > 1 ? 's' : ''} en retard, ${montant}`,
    recurrentes: (n: number) => `${n} dépense${n > 1 ? 's' : ''} récurrente${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`,
    sansCompte: (n: number) => `${n} transaction${n > 1 ? 's' : ''} sans compte`,
    recusManquants: (n: number) => `${n} reçu${n > 1 ? 's' : ''} manquant${n > 1 ? 's' : ''} sur des dépenses de plus de 100 $`,
    echeanceTaxes: (jours: number, date: string) => jours <= 0 ? `Déclaration de taxes due le ${date}` : `Déclaration de taxes dans ${jours} jour${jours > 1 ? 's' : ''} (${date})`,
    voirTransactions: 'Voir les transactions', voirTaxes: 'Voir Taxes et impôt',
    chargement: 'Chargement…',
    revenu: 'Revenu', depense: 'Dépense', sansTiers: 'Sans tiers',
    versusPrecedente: 'vs période précédente',
  },
  EN: {
    kicker: 'Accounting',
    titre: 'Overview',
    lede: 'Financial health at a glance: what comes in, what goes out, what is left to do.',
    revenus: 'Revenue', depenses: 'Expenses', profit: 'Profit', aRecevoir: 'Accounts receivable',
    facturesEnAttente: (n: number) => `${n} invoice${n > 1 ? 's' : ''} outstanding`,
    graphTitre: 'Revenue and expenses by month',
    graphVide: 'No transactions', graphVideTexte: 'Add transactions to fill in the chart.',
    repartitionTitre: 'Expenses by account', repartitionVideTitre: 'No expenses', repartitionVideTexte: 'No expenses over the chosen period.',
    recentesTitre: 'Latest transactions', recentesVideTitre: 'No transactions', recentesVideTexte: 'The ledger is empty for now.',
    aFaireTitre: 'To do', aFaireVideTitre: 'Nothing to do', aFaireVideTexte: 'Everything is up to date for now.',
    facturesRetard: (n: number, montant: string) => `${n} overdue invoice${n > 1 ? 's' : ''}, ${montant}`,
    recurrentes: (n: number) => `${n} recurring expense${n > 1 ? 's' : ''} added`,
    sansCompte: (n: number) => `${n} transaction${n > 1 ? 's' : ''} without an account`,
    recusManquants: (n: number) => `${n} missing receipt${n > 1 ? 's' : ''} on expenses over $100`,
    echeanceTaxes: (jours: number, date: string) => jours <= 0 ? `Tax filing due on ${date}` : `Tax filing in ${jours} day${jours > 1 ? 's' : ''} (${date})`,
    voirTransactions: 'View transactions', voirTaxes: 'View Taxes and income tax',
    chargement: 'Loading…',
    revenu: 'Revenue', depense: 'Expense', sansTiers: 'No party',
    versusPrecedente: 'vs previous period',
  },
};

const delta = (actuel: number, precedent: number): string => {
  if (precedent === 0) return '';
  const pct = ((actuel - precedent) / Math.abs(precedent)) * 100;
  const signe = pct >= 0 ? '+' : '';
  return `${signe}${pct.toFixed(0)} %`;
};

const Apercu: React.FC<Props> = ({ lang, onAllerA, recurrentesAjoutees = 0 }) => {
  const t = TEXTES[lang];
  const { data: transactions, loading: chargeTx } = useTransactions();
  const { comptes, loading: chargeComptes } = usePlanComptable();
  const { reglages, loading: chargeReglages } = useReglagesCompta();
  const { data: documents, loading: chargeDocs } = useFacturesAvecExemple();

  const { etat, setEtat, periode, periodePrecedente, exercice, trimestres, mois } = usePeriodeChoisie(reglages);

  const aujourdhui = new Date();
  const dateAuj = aujourdhui.toISOString().slice(0, 10);
  const chargement = chargeTx || chargeComptes || chargeReglages || chargeDocs;

  const totauxPeriode = useMemo(() => totaux(transactions, periode), [transactions, periode]);
  const totauxPrecedents = useMemo(() => totaux(transactions, periodePrecedente), [transactions, periodePrecedente]);
  const ageComptes = useMemo(() => ageDesComptesClients(documents, aujourdhui), [documents]);

  // Graphique : toujours l'exercice complet, mois par mois (indépendant du sélecteur ci-dessus).
  const etatMensuel = useMemo(() => etatDesResultats(transactions, comptes, exercice, 'mois'), [transactions, comptes, exercice]);
  const donneesGraph = useMemo(
    () => etatMensuel.colonnes.map((c, i) => ({
      nom: c.libelle.split(' ')[0],
      revenus: Math.round(etatMensuel.totalRevenusParColonne[i]),
      depenses: Math.round(etatMensuel.totalDepensesParColonne[i]),
    })),
    [etatMensuel]
  );

  const repartition = useMemo(() => depensesParCompte(transactions, comptes, periode), [transactions, comptes, periode]);
  const repartitionMax = repartition[0]?.montant || 1;

  const recentes = useMemo(() => [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8), [transactions]);

  // --- À faire ---
  const facturesEnRetard = useMemo(
    () => documents.filter((d) => d.type === 'Invoice' && d.status === 'Sent' && d.dueDate && d.dueDate < dateAuj),
    [documents, dateAuj]
  );
  const montantEnRetard = facturesEnRetard.reduce((s, d) => s + totalDocumentTTC(d), 0);
  const idsComptes = useMemo(() => new Set(comptes.map((c) => c.id)), [comptes]);
  const transactionsSansCompte = useMemo(() => transactions.filter((tr) => !idsComptes.has(tr.compteId)), [transactions, idsComptes]);
  const recusManquants = useMemo(
    () => transactions.filter((tr) => tr.sens === 'depense' && tr.montant > 100 && !tr.recu),
    [transactions]
  );
  const echeance = useMemo(() => taxesARemettre(transactions, reglages, periodeDeclarationCourante(reglages, aujourdhui)).prochaineEcheance, [transactions, reglages]);
  const joursEcheance = Math.round((new Date(`${echeance.date}T00:00:00Z`).getTime() - new Date(`${dateAuj}T00:00:00Z`).getTime()) / 86400000);
  const echeanceProche = joursEcheance <= 30;

  const aFaire = [
    recurrentesAjoutees > 0 && {
      icone: Repeat,
      texte: t.recurrentes(recurrentesAjoutees),
      aller: 'transactions' as OngletFinance,
    },
    facturesEnRetard.length > 0 && {
      icone: AlertTriangle,
      texte: t.facturesRetard(facturesEnRetard.length, formatMontant(montantEnRetard)),
      aller: 'transactions' as OngletFinance,
    },
    transactionsSansCompte.length > 0 && {
      icone: Tag,
      texte: t.sansCompte(transactionsSansCompte.length),
      aller: 'transactions' as OngletFinance,
    },
    recusManquants.length > 0 && {
      icone: Receipt,
      texte: t.recusManquants(recusManquants.length),
      aller: 'transactions' as OngletFinance,
    },
    echeanceProche && {
      icone: CalendarClock,
      texte: t.echeanceTaxes(joursEcheance, echeance.date),
      aller: 'taxes' as OngletFinance,
    },
  ].filter(Boolean) as { icone: typeof AlertTriangle; texte: string; aller: OngletFinance }[];

  if (chargement) return <Chargement texte={t.chargement} />;

  return (
    <div className="space-y-6">
      <SelecteurPeriode lang={lang} etat={etat} onChange={setEtat} mois={mois} trimestres={trimestres} exercice={exercice} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-start">
        <Panneau>
          <Chiffre valeur={formatMontantRond(totauxPeriode.revenus)} libelle={t.revenus} note={etat.comparer ? `${delta(totauxPeriode.revenus, totauxPrecedents.revenus)} ${t.versusPrecedente}` : undefined} />
        </Panneau>
        <Panneau>
          <Chiffre valeur={formatMontantRond(totauxPeriode.depenses)} libelle={t.depenses} note={etat.comparer ? `${delta(totauxPeriode.depenses, totauxPrecedents.depenses)} ${t.versusPrecedente}` : undefined} />
        </Panneau>
        <Panneau>
          <Chiffre valeur={formatMontantRond(totauxPeriode.profit)} libelle={t.profit} note={etat.comparer ? `${delta(totauxPeriode.profit, totauxPrecedents.profit)} ${t.versusPrecedente}` : undefined} />
        </Panneau>
        <Panneau>
          <Chiffre valeur={formatMontantRond(ageComptes.total)} libelle={t.aRecevoir} note={t.facturesEnAttente(ageComptes.nombreTotal)} />
        </Panneau>
      </div>

      <CartesFiscales lang={lang} />

      <div className="grid grid-cols-1 gap-6">
        <Panneau titre={t.graphTitre}>
          <div className="h-[300px] w-full">
            {donneesGraph.every((d) => d.revenus === 0 && d.depenses === 0) ? (
              <Vide titre={t.graphVide} texte={t.graphVideTexte} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donneesGraph}>
                  <defs>
                    <linearGradient id="apercuRevenus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="nom" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={13} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={13} tickFormatter={(v) => (v >= 1000 ? `${String(v / 1000).replace('.', ',')}k` : String(v))} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', color: '#f8fafc' }} formatter={(v: number) => formatMontant(v)} />
                  <Area type="monotone" dataKey="revenus" name={t.revenu} stroke="#d4af37" fill="url(#apercuRevenus)" strokeWidth={2} />
                  <Area type="monotone" dataKey="depenses" name={t.depense} stroke="#94a3b8" fill="none" strokeWidth={2} strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panneau>

        <Panneau titre={t.repartitionTitre}>
          {repartition.length === 0 ? (
            <Vide titre={t.repartitionVideTitre} texte={t.repartitionVideTexte} />
          ) : (
            <div className="space-y-3">
              {repartition.slice(0, 6).map((r) => (
                <div key={r.compte.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-encre font-medium truncate pr-2">{nomCompte(r.compte, lang)}</span>
                    <span className="text-gris tabular-nums flex-shrink-0">{formatMontant(r.montant)}</span>
                  </div>
                  <div className="h-1.5 bg-filet rounded-pilule overflow-hidden">
                    <div className="h-full bg-rose rounded-pilule" style={{ width: `${Math.max(4, (r.montant / repartitionMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panneau>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Panneau
          titre={t.recentesTitre}
          actions={<button type="button" onClick={() => onAllerA?.('transactions')} className="text-sm text-rose hover:text-encre transition-colors font-medium inline-flex items-center gap-1">{t.voirTransactions} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></button>}
        >
          {recentes.length === 0 ? (
            <Vide titre={t.recentesVideTitre} texte={t.recentesVideTexte} />
          ) : (
            <div className="defile-x">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-filet">
                  {recentes.map((tr) => (
                    <tr key={tr.id}>
                      <td className="py-3 pr-3 text-sm text-gris whitespace-nowrap">{tr.date}</td>
                      <td className="py-3 text-sm font-medium text-encre">{tr.description}</td>
                      <td className="py-3 text-sm text-gris hidden sm:table-cell">{tr.tiers || t.sansTiers}</td>
                      <td className={`py-3 text-sm text-right tabular-nums font-medium ${tr.sens === 'revenu' ? 'text-encre' : 'text-gris'}`}>
                        {tr.sens === 'revenu' ? '+' : '-'}{formatMontant(tr.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panneau>

        <Panneau titre={t.aFaireTitre}>
          {aFaire.length === 0 ? (
            <Vide titre={t.aFaireVideTitre} texte={t.aFaireVideTexte} />
          ) : (
            <ul className="space-y-3">
              {aFaire.map((item, i) => {
                const Icone = item.icone;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onAllerA?.(item.aller)}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <Icone className="w-4 h-4 text-rose flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-sm text-encre group-hover:text-rose transition-colors">{item.texte}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panneau>
      </div>
    </div>
  );
};

export default Apercu;
