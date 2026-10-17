// Les rapports comptables : état des résultats, résumé des taxes, dépenses par compte, revenus par
// client, âge des comptes clients. Chaque rapport s'exporte en CSV et s'imprime seul (feuille Lettre
// US, marges sûres : voir le bloc @media print dans index.css). Contrat : lib/compta/types.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Panneau, Bouton, Vide, Chargement, IDENTITE, type Language } from '../../../lib/compta/ancrage';
import { useTransactions } from '../../../lib/compta/transactions';
import { usePlanComptable, nomCompte } from '../../../lib/compta/plan-defaut';
import { useReglagesCompta } from '../../../lib/compta/periodes';
import {
  etatDesResultats, depensesParCompte, revenusParTiers, ageDesComptesClients,
  exportCsv, telechargerCsv,
  type EtatDesResultats, type LigneEtatCompte,
} from '../../../lib/compta/rapports';
import { taxesARemettre } from '../../../lib/compta/fiscal';
import { formatMontant, formatPourcent } from '../../../lib/compta/format';
import { usePeriodeChoisie, SelecteurPeriode, useFacturesAvecExemple } from './Apercu';
import PaquetComptable from './PaquetComptable';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    kicker: 'Comptabilité',
    titre: 'Rapports',
    lede: 'Ce que votre comptable demande, prêt à exporter ou à imprimer.',
    csv: 'Exporter CSV', imprimer: 'Imprimer', entrepriseNom: `${IDENTITE.nom}, ${IDENTITE.nomLegal}`,
    etatTitre: 'État des résultats', granulariteMois: 'Par mois', granulariteTrimestre: 'Par trimestre',
    compte: 'Compte', total: 'Total', totalRevenus: 'Total des revenus', totalDepenses: 'Total des dépenses', profit: 'Profit',
    etatVide: 'Aucune donnée', etatVideTexte: 'Aucune transaction sur cet exercice.',
    taxesTitre: 'Résumé des taxes', tpsPercue: 'TPS perçue', tvqPercue: 'TVQ perçue', cti: 'CTI', rti: 'RTI', netTps: 'Net TPS', netTvq: 'Net TVQ', netTotal: 'Net total',
    depensesTitre: 'Dépenses par compte', part: 'Part', depensesVide: 'Aucune dépense', depensesVideTexte: 'Aucune dépense sur la période choisie.',
    revenusTitre: 'Revenus par client et par service', client: 'Client', service: 'Service', montant: 'Montant', sansClient: 'Sans client assigné',
    revenusVide: 'Aucun revenu', revenusVideTexte: 'Aucun revenu sur la période choisie.',
    ageTitre: 'Âge des comptes clients', tranche: 'Échéance', nombre: 'Nombre', ageVide: 'Aucune facture impayée', ageVideTexte: 'Toutes les factures envoyées sont payées.',
  },
  EN: {
    kicker: 'Accounting',
    titre: 'Reports',
    lede: 'What your accountant asks for, ready to export or print.',
    csv: 'Export CSV', imprimer: 'Print', entrepriseNom: `${IDENTITE.nom}, ${IDENTITE.nomLegal}`,
    etatTitre: 'Income statement', granulariteMois: 'By month', granulariteTrimestre: 'By quarter',
    compte: 'Account', total: 'Total', totalRevenus: 'Total revenue', totalDepenses: 'Total expenses', profit: 'Profit',
    etatVide: 'No data', etatVideTexte: 'No transactions for this fiscal year.',
    taxesTitre: 'Tax summary', tpsPercue: 'GST collected', tvqPercue: 'QST collected', cti: 'ITC', rti: 'ITR', netTps: 'Net GST', netTvq: 'Net QST', netTotal: 'Net total',
    depensesTitre: 'Expenses by account', part: 'Share', depensesVide: 'No expenses', depensesVideTexte: 'No expenses over the chosen period.',
    revenusTitre: 'Revenue by client and service', client: 'Client', service: 'Service', montant: 'Amount', sansClient: 'No client assigned',
    revenusVide: 'No revenue', revenusVideTexte: 'No revenue over the chosen period.',
    ageTitre: 'Accounts receivable aging', tranche: 'Due', nombre: 'Count', ageVide: 'No unpaid invoice', ageVideTexte: 'Every sent invoice is paid.',
  },
};

// Isole un seul rapport à l'impression : le bloc est cloné dans une racine dédiée (#impression-racine)
// et tout le reste de la page passe en display:none (voir @media print dans index.css). Le clone porte
// sa propre règle @page (paysage pour l'état des résultats), parce que les pages nommées CSS ne sont
// pas honorées par tous les moteurs d'impression. Tout se retire à afterprint.
function imprimerBloc(id: string) {
  const bloc = document.getElementById(id);
  if (!bloc) return;
  document.querySelectorAll('#impression-racine, #impression-page').forEach((el) => el.remove());

  const clone = bloc.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.setAttribute('data-impression-active', '1');

  // Un tableau plus large que la page (l'état des résultats, douze colonnes mensuelles) déborde hors
  // impression sans le signaler : le débordement horizontal ne se pagine jamais. .impression-compacte
  // resserre d'abord les cellules (mesure faite sur l'original, le clone n'a pas encore de boîte) ; s'il
  // en reste, une échelle réduit le reste, jamais sous 65 % (au-delà, illisible sur papier).
  const paysage = bloc.classList.contains('imprime-paysage');
  const tableOrig = bloc.querySelector('table');
  const tableClone = clone.querySelector('table');
  if (tableOrig && tableClone) {
    tableOrig.classList.add('impression-compacte');
    const disponible = paysage ? 960 : 680;
    const echelle = Math.max(0.65, Math.min(1, disponible / tableOrig.scrollWidth));
    tableOrig.classList.remove('impression-compacte');
    tableClone.classList.add('impression-compacte');
    tableClone.style.setProperty('--echelle-impression', String(echelle));
  }

  const racine = document.createElement('div');
  racine.id = 'impression-racine';
  racine.appendChild(clone);
  const style = document.createElement('style');
  style.id = 'impression-page';
  style.textContent = paysage ? '@page { size: letter landscape; margin: 0.5in; }' : '@page { size: letter; margin: 0.5in; }';
  document.head.appendChild(style);
  document.body.appendChild(racine);
  document.body.setAttribute('data-mode-impression', '1');

  window.print();
}

const EnteteImpression: React.FC<{ titre: string; periodeLibelle: string }> = ({ titre, periodeLibelle }) => (
  <div className="hidden print:block mb-6">
    <p className="font-serif text-h3 text-encre">{TEXTES.FR.entrepriseNom}</p>
    <p className="text-sm text-gris">{titre}, {periodeLibelle}</p>
  </div>
);

const Rapports: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: transactions, loading: chargeTx } = useTransactions();
  const { comptes, loading: chargeComptes } = usePlanComptable();
  const { reglages, loading: chargeReglages } = useReglagesCompta();
  const { data: documents, loading: chargeDocs } = useFacturesAvecExemple();
  const { etat, setEtat, periode, exercice, trimestres, mois } = usePeriodeChoisie(reglages);
  const [granularite, setGranularite] = useState<'mois' | 'trimestre'>('mois');

  useEffect(() => {
    const nettoyer = () => {
      document.body.removeAttribute('data-mode-impression');
      document.querySelectorAll('#impression-racine, #impression-page').forEach((el) => el.remove());
      document.querySelectorAll('[data-rapport-bloc]').forEach((el) => el.removeAttribute('data-impression-active'));
      document.querySelectorAll('table.impression-compacte').forEach((el) => el.classList.remove('impression-compacte'));
    };
    window.addEventListener('afterprint', nettoyer);
    return () => window.removeEventListener('afterprint', nettoyer);
  }, []);

  const chargement = chargeTx || chargeComptes || chargeReglages || chargeDocs;

  const etatResultats = useMemo(() => etatDesResultats(transactions, comptes, exercice, granularite), [transactions, comptes, exercice, granularite]);
  const taxes = useMemo(() => taxesARemettre(transactions, reglages, periode), [transactions, reglages, periode]);
  const repartitionDepenses = useMemo(() => depensesParCompte(transactions, comptes, periode), [transactions, comptes, periode]);
  const parTiers = useMemo(() => revenusParTiers(transactions, comptes, periode), [transactions, comptes, periode]);
  const aujourdhui = new Date();
  const age = useMemo(() => ageDesComptesClients(documents, aujourdhui), [documents]);

  const libellePeriode = periode.libelle || (lang === 'FR' ? `${periode.debut} au ${periode.fin}` : `${periode.debut} to ${periode.fin}`);

  const ligneEtatCsv = (l: LigneEtatCompte, e: EtatDesResultats) => {
    const row: Record<string, string | number> = { [t.compte]: nomCompte(l.compte, lang) };
    e.colonnes.forEach((c, i) => { row[c.libelle] = l.parColonne[i]; });
    row[t.total] = l.total;
    return row;
  };

  const exporterEtat = () => {
    const lignes = [...etatResultats.revenus, ...etatResultats.depenses].map((l) => ligneEtatCsv(l, etatResultats));
    telechargerCsv(`etat-resultats-${exercice.debut.slice(0, 4)}.csv`, exportCsv(lignes));
  };

  const exporterTaxes = () => {
    const lignes = [
      { [t.tranche]: t.tpsPercue, [t.montant]: taxes.percu.tps },
      { [t.tranche]: t.tvqPercue, [t.montant]: taxes.percu.tvq },
      { [t.tranche]: t.cti, [t.montant]: -taxes.credits.cti },
      { [t.tranche]: t.rti, [t.montant]: -taxes.credits.rti },
      { [t.tranche]: t.netTps, [t.montant]: taxes.net.tps },
      { [t.tranche]: t.netTvq, [t.montant]: taxes.net.tvq },
      { [t.tranche]: t.netTotal, [t.montant]: taxes.net.total },
    ];
    telechargerCsv(`resume-taxes-${periode.debut}.csv`, exportCsv(lignes));
  };

  const exporterDepenses = () => {
    const lignes = repartitionDepenses.map((r) => ({ [t.compte]: nomCompte(r.compte, lang), [t.montant]: r.montant, [t.part]: `${(r.part * 100).toFixed(1)} %` }));
    telechargerCsv(`depenses-par-compte-${periode.debut}.csv`, exportCsv(lignes));
  };

  const exporterRevenus = () => {
    const lignes = parTiers.flatMap((r) =>
      r.parCompte.map((pc) => ({ [t.client]: r.tiers || t.sansClient, [t.service]: nomCompte(pc.compte, lang), [t.montant]: pc.montant }))
    );
    telechargerCsv(`revenus-par-client-${periode.debut}.csv`, exportCsv(lignes));
  };

  const exporterAge = () => {
    const lignes = age.tranches.map((tr) => ({ [t.tranche]: tr.libelle, [t.montant]: tr.montant, [t.nombre]: tr.nombre }));
    telechargerCsv(`age-comptes-clients-${aujourdhui.toISOString().slice(0, 10)}.csv`, exportCsv(lignes));
  };

  if (chargement) return <Chargement />;

  return (
    <div className="space-y-6">
      <p className="text-gris text-sm mesure no-imprime">{t.lede}</p>

      <PaquetComptable lang={lang} transactions={transactions} comptes={comptes} reglages={reglages} exercice={exercice} />

      {/* --- État des résultats : toujours l'exercice complet, en colonnes mois ou trimestre --- */}
      <div id="rapport-etat" data-rapport-bloc className="imprime-paysage">
        <Panneau
          titre={`${t.etatTitre}, ${exercice.libelle}`}
          actions={
            <div className="flex flex-wrap items-center gap-2 no-imprime">
              <select
                aria-label={t.etatTitre}
                value={granularite}
                onChange={(e) => setGranularite(e.target.value as 'mois' | 'trimestre')}
                className="bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose"
              >
                <option value="mois">{t.granulariteMois}</option>
                <option value="trimestre">{t.granulariteTrimestre}</option>
              </select>
              <Bouton variante="secondaire" petit icone={Download} onClick={exporterEtat}>{t.csv}</Bouton>
              <Bouton variante="secondaire" petit icone={Printer} onClick={() => imprimerBloc('rapport-etat')}>{t.imprimer}</Bouton>
            </div>
          }
        >
          <EnteteImpression titre={t.etatTitre} periodeLibelle={exercice.libelle} />
          {etatResultats.totalRevenus === 0 && etatResultats.totalDepenses === 0 ? (
            <Vide titre={t.etatVide} texte={t.etatVideTexte} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-filet">
                    <th className="py-2 pr-4 kicker text-gris whitespace-nowrap">{t.compte}</th>
                    {etatResultats.colonnes.map((c) => (
                      <th key={c.cle} className="py-2 px-3 kicker text-gris text-right whitespace-nowrap">{c.libelle}</th>
                    ))}
                    <th className="py-2 pl-3 kicker text-gris text-right whitespace-nowrap">{t.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-filet">
                  {etatResultats.revenus.map((l) => (
                    <tr key={l.compte.id}>
                      <td className="py-2 pr-4 text-sm text-encre whitespace-nowrap">{nomCompte(l.compte, lang)}</td>
                      {l.parColonne.map((v, i) => <td key={i} className="py-2 px-3 text-sm text-gris text-right tabular-nums">{formatMontant(v)}</td>)}
                      <td className="py-2 pl-3 text-sm text-encre text-right tabular-nums font-medium">{formatMontant(l.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-encre whitespace-nowrap">{t.totalRevenus}</td>
                    {etatResultats.totalRevenusParColonne.map((v, i) => <td key={i} className="py-2 px-3 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(v)}</td>)}
                    <td className="py-2 pl-3 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(etatResultats.totalRevenus)}</td>
                  </tr>
                  {etatResultats.depenses.map((l) => (
                    <tr key={l.compte.id}>
                      <td className="py-2 pr-4 text-sm text-encre whitespace-nowrap">{nomCompte(l.compte, lang)}</td>
                      {l.parColonne.map((v, i) => <td key={i} className="py-2 px-3 text-sm text-gris text-right tabular-nums">{formatMontant(v)}</td>)}
                      <td className="py-2 pl-3 text-sm text-encre text-right tabular-nums font-medium">{formatMontant(l.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 pr-4 text-sm font-semibold text-encre whitespace-nowrap">{t.totalDepenses}</td>
                    {etatResultats.totalDepensesParColonne.map((v, i) => <td key={i} className="py-2 px-3 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(v)}</td>)}
                    <td className="py-2 pl-3 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(etatResultats.totalDepenses)}</td>
                  </tr>
                  <tr className="border-t-2 border-filet">
                    <td className="py-2 pr-4 text-sm font-semibold text-rose whitespace-nowrap">{t.profit}</td>
                    {etatResultats.profitParColonne.map((v, i) => <td key={i} className="py-2 px-3 text-sm font-semibold text-rose text-right tabular-nums">{formatMontant(v)}</td>)}
                    <td className="py-2 pl-3 text-sm font-semibold text-rose text-right tabular-nums">{formatMontant(etatResultats.profit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Panneau>
      </div>

      {/* --- Sélecteur de période pour les quatre rapports suivants --- */}
      <div className="no-imprime">
        <SelecteurPeriode lang={lang} etat={etat} onChange={setEtat} mois={mois} trimestres={trimestres} exercice={exercice} masquerComparaison />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- Résumé des taxes --- */}
        <div id="rapport-taxes" data-rapport-bloc>
          <Panneau
            titre={t.taxesTitre}
            actions={
              <div className="flex flex-wrap items-center gap-2 no-imprime">
                <Bouton variante="secondaire" petit icone={Download} onClick={exporterTaxes}>{t.csv}</Bouton>
                <Bouton variante="secondaire" petit icone={Printer} onClick={() => imprimerBloc('rapport-taxes')}>{t.imprimer}</Bouton>
              </div>
            }
          >
            <EnteteImpression titre={t.taxesTitre} periodeLibelle={libellePeriode} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-filet">
                  <tr><td className="py-2 text-sm text-gris">{t.tpsPercue}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(taxes.percu.tps)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.tvqPercue}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(taxes.percu.tvq)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.cti}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(-taxes.credits.cti)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.rti}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(-taxes.credits.rti)}</td></tr>
                  <tr className="border-t border-filet"><td className="py-2 text-sm font-medium text-encre">{t.netTps}</td><td className="py-2 text-sm font-medium text-encre text-right tabular-nums">{formatMontant(taxes.net.tps)}</td></tr>
                  <tr><td className="py-2 text-sm font-medium text-encre">{t.netTvq}</td><td className="py-2 text-sm font-medium text-encre text-right tabular-nums">{formatMontant(taxes.net.tvq)}</td></tr>
                  <tr><td className="py-2 text-sm font-semibold text-rose">{t.netTotal}</td><td className="py-2 text-sm font-semibold text-rose text-right tabular-nums">{formatMontant(taxes.net.total)}</td></tr>
                </tbody>
              </table>
            </div>
          </Panneau>
        </div>

        {/* --- Dépenses par compte --- */}
        <div id="rapport-depenses" data-rapport-bloc>
          <Panneau
            titre={t.depensesTitre}
            actions={
              <div className="flex flex-wrap items-center gap-2 no-imprime">
                <Bouton variante="secondaire" petit icone={Download} onClick={exporterDepenses}>{t.csv}</Bouton>
                <Bouton variante="secondaire" petit icone={Printer} onClick={() => imprimerBloc('rapport-depenses')}>{t.imprimer}</Bouton>
              </div>
            }
          >
            <EnteteImpression titre={t.depensesTitre} periodeLibelle={libellePeriode} />
            {repartitionDepenses.length === 0 ? (
              <Vide titre={t.depensesVide} texte={t.depensesVideTexte} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-filet"><th className="py-2 kicker text-gris">{t.compte}</th><th className="py-2 kicker text-gris text-right">{t.montant}</th><th className="py-2 kicker text-gris text-right">{t.part}</th></tr></thead>
                  <tbody className="divide-y divide-filet">
                    {repartitionDepenses.map((r) => (
                      <tr key={r.compte.id}>
                        <td className="py-2 text-sm text-encre">{nomCompte(r.compte, lang)}</td>
                        <td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(r.montant)}</td>
                        <td className="py-2 text-sm text-gris text-right tabular-nums whitespace-nowrap">{formatPourcent(r.part * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>
        </div>

        {/* --- Revenus par client et par service --- */}
        <div id="rapport-revenus" data-rapport-bloc>
          <Panneau
            titre={t.revenusTitre}
            actions={
              <div className="flex flex-wrap items-center gap-2 no-imprime">
                <Bouton variante="secondaire" petit icone={Download} onClick={exporterRevenus}>{t.csv}</Bouton>
                <Bouton variante="secondaire" petit icone={Printer} onClick={() => imprimerBloc('rapport-revenus')}>{t.imprimer}</Bouton>
              </div>
            }
          >
            <EnteteImpression titre={t.revenusTitre} periodeLibelle={libellePeriode} />
            {parTiers.length === 0 ? (
              <Vide titre={t.revenusVide} texte={t.revenusVideTexte} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-filet">
                    {parTiers.map((r) => (
                      <React.Fragment key={r.tiers || 'sans-client'}>
                        <tr>
                          <td className="py-2 text-sm font-semibold text-encre" colSpan={1}>{r.tiers || t.sansClient}</td>
                          <td />
                          <td className="py-2 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(r.total)}</td>
                        </tr>
                        {r.parCompte.map((pc) => (
                          <tr key={pc.compte.id}>
                            <td className="py-1 pl-4 text-sm text-gris" colSpan={1}></td>
                            <td className="py-1 text-sm text-gris">{nomCompte(pc.compte, lang)}</td>
                            <td className="py-1 text-sm text-gris text-right tabular-nums">{formatMontant(pc.montant)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>
        </div>

        {/* --- Âge des comptes clients --- */}
        <div id="rapport-age" data-rapport-bloc>
          <Panneau
            titre={t.ageTitre}
            actions={
              <div className="flex flex-wrap items-center gap-2 no-imprime">
                <Bouton variante="secondaire" petit icone={Download} onClick={exporterAge}>{t.csv}</Bouton>
                <Bouton variante="secondaire" petit icone={Printer} onClick={() => imprimerBloc('rapport-age')}>{t.imprimer}</Bouton>
              </div>
            }
          >
            <EnteteImpression titre={t.ageTitre} periodeLibelle={aujourdhui.toISOString().slice(0, 10)} />
            {age.nombreTotal === 0 ? (
              <Vide titre={t.ageVide} texte={t.ageVideTexte} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-filet"><th className="py-2 kicker text-gris">{t.tranche}</th><th className="py-2 kicker text-gris text-right">{t.nombre}</th><th className="py-2 kicker text-gris text-right">{t.montant}</th></tr></thead>
                  <tbody className="divide-y divide-filet">
                    {age.tranches.map((tr) => (
                      <tr key={tr.libelle}>
                        <td className="py-2 text-sm text-encre">{tr.libelle}</td>
                        <td className="py-2 text-sm text-gris text-right tabular-nums">{tr.nombre}</td>
                        <td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(tr.montant)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-filet">
                      <td className="py-2 text-sm font-semibold text-encre">{t.total}</td>
                      <td className="py-2 text-sm font-semibold text-encre text-right tabular-nums">{age.nombreTotal}</td>
                      <td className="py-2 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(age.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>
        </div>
      </div>
    </div>
  );
};

export default Rapports;
