// Prédicteur de taxes et d'impôt : « à chaque fois qu'elle charge les taxes, à chaque fois qu'elle
// reçoit des trucs, qu'elle ait un petit montant qui lui dise combien elle va devoir verser » (Alex).
// Deux grandes cartes (taxes à remettre, impôt estimé), une ligne d'explication en mots simples sous
// chacune, le détail dépliable, un rappel calme que le comptable tranche, et le panneau de réglages.
// Calculs purs dans lib/compta/fiscal.ts et lib/compta/fiscal-2026.ts (sources dans docs/FISCAL-2026.md).
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Panneau, Chiffre, Etiquette, Selection, Champ, Zone, Bouton, type Language } from '../../../lib/compta/ancrage';
import { useTransactions } from '../../../lib/compta/transactions';
import { useReglagesCompta, enregistrerReglagesCompta } from '../../../lib/compta/periodes';
import { useParametresFiscaux, enregistrerSurchargeFiscale, type ParametresFiscaux } from '../../../lib/compta/fiscal-2026';
import { taxesARemettre, projectionTaxes, projectionImpot, periodeDeclarationCourante } from '../../../lib/compta/fiscal';
import { formatMontant, formatPourcent } from '../../../lib/compta/format';

interface Props {
  lang: Language;
}

const dateLongue = (iso: string, lang: Language): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const TEXTES = {
  FR: {
    kicker: 'Comptabilité',
    titre: 'Taxes et impôt',
    lede: 'Ce que tu vas devoir verser, estimé à ton rythme actuel. Une aide pour prévoir, pas une déclaration.',
    taxes: 'Taxes à remettre',
    taxesProjete: 'Projeté, fin d’exercice',
    taxesADate: 'À date',
    prochaineEcheance: 'Prochaine échéance',
    taxesExplication: (net: string, echeance: string) =>
      `Au rythme actuel, tu devrais devoir remettre environ ${net} d’ici la fin de ton exercice. La prochaine échéance tombe le ${echeance}.`,
    taxesJeune: 'Ton exercice vient de commencer : reviens dans quelques semaines pour une projection fiable.',
    voirDetail: 'Voir le détail',
    cacherDetail: 'Cacher le détail',
    tpsPercue: 'TPS perçue', tvqPercue: 'TVQ perçue',
    cti: 'CTI (crédit sur la TPS payée)', rti: 'RTI (crédit sur la TVQ payée)',
    netTps: 'Net TPS', netTvq: 'Net TVQ', netTotal: 'Net total',
    impot: 'Impôt estimé',
    impotProjete: 'Impôt projeté à ton rythme actuel',
    federal: 'Fédéral', quebec: 'Québec', rrq: 'RRQ', rqap: 'RQAP', total: 'Total',
    tauxEffectif: 'Taux effectif', parMois: 'À mettre de côté chaque mois',
    impotExplication: (total: string, parMois: string) =>
      `Si le reste de l’année ressemble aux derniers mois, tu devrais environ ${total} d’impôt et de cotisations, tout confondu. Ça fait à peu près ${parMois} par mois à garder de côté.`,
    acomptes: 'Acomptes provisionnels suggérés',
    acomptesAucun: 'Aucun acompte à verser au rythme actuel : les seuils ne sont pas atteints.',
    voirPaliers: 'Voir le détail par paliers',
    cacherPaliers: 'Cacher le détail par paliers',
    rappel: 'Ceci est une estimation, calculée à partir de tes transactions. Ton comptable tranche le montant final au moment de produire tes déclarations.',
    reglages: 'Réglages fiscaux',
    frequence: 'Fréquence des déclarations de taxes',
    frequenceMensuelle: 'Mensuelle', frequenceTrimestrielle: 'Trimestrielle', frequenceAnnuelle: 'Annuelle',
    inscrit: 'Inscrite aux fichiers de la TPS et de la TVQ',
    inscritOui: 'Oui', inscritNon: 'Non, pas encore',
    annee: 'Année d’imposition',
    surcharge: 'Surcharge avancée (JSON, settings/fiscal)',
    surchargeAide: 'Réservé aux ajustements que ton comptable te transmet (nouveaux paliers, nouveaux taux). Un objet JSON partiel : seuls les champs présents remplacent les valeurs par défaut. Laisse vide pour rester sur les valeurs 2026.',
    surchargeActive: 'Des valeurs personnalisées sont actives dans settings/fiscal.',
    surchargeInvalide: 'Ce texte n’est pas un JSON valide : rien n’a été enregistré.',
    enregistrer: 'Enregistrer les réglages',
  },
  EN: {
    kicker: 'Accounting',
    titre: 'Taxes and income tax',
    lede: 'What you should expect to owe, estimated at your current pace. A planning aid, not a filing.',
    taxes: 'Taxes owing',
    taxesProjete: 'Projected, year end',
    taxesADate: 'To date',
    prochaineEcheance: 'Next deadline',
    taxesExplication: (net: string, echeance: string) =>
      `At the current pace, you should owe about ${net} by the end of your fiscal year. The next deadline is ${echeance}.`,
    taxesJeune: 'Your fiscal year just started: check back in a few weeks for a reliable projection.',
    voirDetail: 'See the detail',
    cacherDetail: 'Hide the detail',
    tpsPercue: 'GST collected', tvqPercue: 'QST collected',
    cti: 'ITC (credit on GST paid)', rti: 'ITR (credit on QST paid)',
    netTps: 'Net GST', netTvq: 'Net QST', netTotal: 'Net total',
    impot: 'Estimated income tax',
    impotProjete: 'Projected at your current pace',
    federal: 'Federal', quebec: 'Quebec', rrq: 'QPP', rqap: 'QPIP', total: 'Total',
    tauxEffectif: 'Effective rate', parMois: 'To set aside each month',
    impotExplication: (total: string, parMois: string) =>
      `If the rest of the year looks like the last few months, you should owe about ${total} in income tax and contributions combined. That is roughly ${parMois} a month to keep aside.`,
    acomptes: 'Suggested tax instalments',
    acomptesAucun: 'No instalment owed at the current pace: the thresholds are not reached.',
    voirPaliers: 'See the bracket detail',
    cacherPaliers: 'Hide the bracket detail',
    rappel: 'This is an estimate, computed from your transactions. Your accountant sets the final amount when your returns are filed.',
    reglages: 'Tax settings',
    frequence: 'Tax filing frequency',
    frequenceMensuelle: 'Monthly', frequenceTrimestrielle: 'Quarterly', frequenceAnnuelle: 'Annual',
    inscrit: 'Registered for GST and QST',
    inscritOui: 'Yes', inscritNon: 'Not yet',
    annee: 'Tax year',
    surcharge: 'Advanced override (JSON, settings/fiscal)',
    surchargeAide: 'For adjustments your accountant gives you (new brackets, new rates). A partial JSON object: only the fields present replace the defaults. Leave empty to stay on the 2026 values.',
    surchargeActive: 'Custom values are active in settings/fiscal.',
    surchargeInvalide: 'This text is not valid JSON: nothing was saved.',
    enregistrer: 'Save settings',
  },
};

const TaxesImpot: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: transactions } = useTransactions();
  const { reglages } = useReglagesCompta();
  const { params, surchargee } = useParametresFiscaux();
  const aujourdhui = new Date();

  const periodeDeclaration = periodeDeclarationCourante(reglages, aujourdhui);
  const taxesADate = taxesARemettre(transactions, reglages, periodeDeclaration);
  const projTaxes = projectionTaxes(transactions, reglages, aujourdhui);
  const projImpot = projectionImpot(transactions, reglages, params, aujourdhui);

  const [detailTaxes, setDetailTaxes] = useState(false);
  const [detailImpot, setDetailImpot] = useState(false);

  // Champs des réglages : copie locale le temps de l'édition, comme PlanComptable.tsx.
  const [frequence, setFrequence] = useState<typeof reglages.frequenceTaxes | null>(null);
  const [inscrit, setInscrit] = useState<boolean | null>(null);
  const [annee, setAnnee] = useState<string | null>(null);
  const [surchargeTexte, setSurchargeTexte] = useState<string | null>(null);
  const [erreurSurcharge, setErreurSurcharge] = useState(false);
  const [busy, setBusy] = useState(false);

  const enregistrerReglages = async () => {
    setBusy(true);
    setErreurSurcharge(false);
    try {
      const patchReglages: Record<string, unknown> = {};
      if (frequence !== null) patchReglages.frequenceTaxes = frequence;
      if (inscrit !== null) patchReglages.inscritTaxes = inscrit;
      if (annee !== null && annee !== '') patchReglages.anneeFiscale = Number(annee);
      if (Object.keys(patchReglages).length > 0) await enregistrerReglagesCompta(patchReglages);

      if (surchargeTexte !== null) {
        const texte = surchargeTexte.trim();
        if (texte === '') {
          await enregistrerSurchargeFiscale({});
        } else {
          try {
            const patch = JSON.parse(texte) as Partial<ParametresFiscaux>;
            await enregistrerSurchargeFiscale(patch);
          } catch {
            setErreurSurcharge(true);
            return;
          }
        }
      }
      setFrequence(null);
      setInscrit(null);
      setAnnee(null);
      setSurchargeTexte(null);
    } finally {
      setBusy(false);
    }
  };

  const aChange = frequence !== null || inscrit !== null || annee !== null || surchargeTexte !== null;

  const montantParMois = formatMontant(projImpot.impotProjete.total / 12);

  return (
    <div className="space-y-8">
      <p className="text-gris text-sm mesure">{t.lede}</p>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* --- Taxes à remettre --- */}
        <Panneau titre={t.taxes}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Chiffre
              valeur={projTaxes.trojeune ? '·' : formatMontant(projTaxes.netProjete.total)}
              libelle={t.taxesProjete}
            />
            <div className="space-y-1">
              <p className="kicker text-gris">{t.taxesADate}</p>
              <p className="font-serif text-h3 text-encre tabular-nums">{formatMontant(taxesADate.net.total)}</p>
              <p className="text-[13px] text-gris">
                {t.prochaineEcheance} : {dateLongue(projTaxes.prochaineEcheance.date, lang)}
              </p>
            </div>
          </div>

          <p className="text-sm text-gris mt-5 mesure">
            {projTaxes.trojeune
              ? t.taxesJeune
              : t.taxesExplication(formatMontant(projTaxes.netProjete.total), dateLongue(projTaxes.prochaineEcheance.date, lang))}
          </p>

          <button
            type="button"
            onClick={() => setDetailTaxes((v) => !v)}
            aria-expanded={detailTaxes}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose"
          >
            {detailTaxes ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            {detailTaxes ? t.cacherDetail : t.voirDetail}
          </button>

          {detailTaxes && (
            <div className="defile-x mt-4">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-filet">
                  <tr><td className="py-2 text-sm text-gris">{t.tpsPercue}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(taxesADate.percu.tps)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.tvqPercue}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(taxesADate.percu.tvq)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.cti}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(-taxesADate.credits.cti)}</td></tr>
                  <tr><td className="py-2 text-sm text-gris">{t.rti}</td><td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(-taxesADate.credits.rti)}</td></tr>
                  <tr><td className="py-2 text-sm font-medium text-encre">{t.netTps}</td><td className="py-2 text-sm font-medium text-encre text-right tabular-nums">{formatMontant(taxesADate.net.tps)}</td></tr>
                  <tr><td className="py-2 text-sm font-medium text-encre">{t.netTvq}</td><td className="py-2 text-sm font-medium text-encre text-right tabular-nums">{formatMontant(taxesADate.net.tvq)}</td></tr>
                  <tr><td className="py-2 text-sm font-semibold text-encre">{t.netTotal}</td><td className="py-2 text-sm font-semibold text-encre text-right tabular-nums">{formatMontant(taxesADate.net.total)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </Panneau>

        {/* --- Impôt estimé --- */}
        <Panneau titre={t.impot}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Chiffre
              valeur={projImpot.trojeune ? '·' : formatMontant(projImpot.impotProjete.total)}
              libelle={t.impotProjete}
            />
            <div className="space-y-1">
              <p className="kicker text-gris">{t.parMois}</p>
              <p className="font-serif text-h3 text-encre tabular-nums">{projImpot.trojeune ? '·' : montantParMois}</p>
              <p className="text-[13px] text-gris">
                {t.tauxEffectif} : {formatPourcent(projImpot.impotProjete.tauxEffectif * 100)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <div><p className="kicker text-gris">{t.federal}</p><p className="text-sm text-encre tabular-nums mt-1">{formatMontant(projImpot.impotProjete.federal)}</p></div>
            <div><p className="kicker text-gris">{t.quebec}</p><p className="text-sm text-encre tabular-nums mt-1">{formatMontant(projImpot.impotProjete.quebec)}</p></div>
            <div><p className="kicker text-gris">{t.rrq}</p><p className="text-sm text-encre tabular-nums mt-1">{formatMontant(projImpot.impotProjete.rrq)}</p></div>
            <div><p className="kicker text-gris">{t.rqap}</p><p className="text-sm text-encre tabular-nums mt-1">{formatMontant(projImpot.impotProjete.rqap)}</p></div>
          </div>

          <p className="text-sm text-gris mt-5 mesure">
            {projImpot.trojeune ? t.taxesJeune : t.impotExplication(formatMontant(projImpot.impotProjete.total), montantParMois)}
          </p>

          <div className="mt-5">
            <p className="text-sm font-semibold text-encre mb-2">{t.acomptes}</p>
            {projImpot.acomptesSuggeres.length === 0 ? (
              <p className="text-sm text-gris">{t.acomptesAucun}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {projImpot.acomptesSuggeres.map((a) => (
                  <li key={a.date}>
                    <Etiquette tone="accent">{dateLongue(a.date, lang)} · {formatMontant(a.montant)}</Etiquette>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDetailImpot((v) => !v)}
            aria-expanded={detailImpot}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose"
          >
            {detailImpot ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            {detailImpot ? t.cacherPaliers : t.voirPaliers}
          </button>

          {detailImpot && (
            <div className="defile-x mt-4">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-filet">
                  {projImpot.impotProjete.detail.map((ligne) => (
                    <tr key={ligne.libelle}>
                      <td className="py-2 text-sm text-gris">{ligne.libelle}</td>
                      <td className="py-2 text-sm text-encre text-right tabular-nums">{formatMontant(ligne.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panneau>
      </div>

      <p className="text-sm text-gris mesure">{t.rappel}</p>

      {/* --- Réglages fiscaux --- */}
      <Panneau
        titre={t.reglages}
        actions={<Bouton variante="secondaire" petit onClick={enregistrerReglages} disabled={!aChange || busy}>{t.enregistrer}</Bouton>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Selection label={t.frequence} value={frequence ?? reglages.frequenceTaxes} onChange={(e) => setFrequence(e.target.value as typeof reglages.frequenceTaxes)}>
            <option value="mensuelle">{t.frequenceMensuelle}</option>
            <option value="trimestrielle">{t.frequenceTrimestrielle}</option>
            <option value="annuelle">{t.frequenceAnnuelle}</option>
          </Selection>
          <Selection
            label={t.inscrit}
            value={(inscrit ?? reglages.inscritTaxes) ? 'oui' : 'non'}
            onChange={(e) => setInscrit(e.target.value === 'oui')}
          >
            <option value="oui">{t.inscritOui}</option>
            <option value="non">{t.inscritNon}</option>
          </Selection>
          <Champ
            label={t.annee}
            type="number"
            value={annee ?? String(reglages.anneeFiscale)}
            onChange={(e) => setAnnee(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Zone
            label={t.surcharge}
            aide={erreurSurcharge ? t.surchargeInvalide : surchargee ? t.surchargeActive : t.surchargeAide}
            value={surchargeTexte ?? ''}
            onChange={(e) => setSurchargeTexte(e.target.value)}
            placeholder='{ "federal": { "paliers": [...] } }'
            className="font-mono"
          />
        </div>
      </Panneau>
    </div>
  );
};

export default TaxesImpot;
