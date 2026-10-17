// Paquet pour le comptable : un zip de l'exercice choisi (grand livre, état des résultats, taxes par
// période, plan comptable, tiers, reçus). Les CSV se construisent sans réseau (csvsDuPaquet) ; seuls
// les reçus se téléchargent (construirePaquet), un fichier recus-manquants.txt liste ceux qui échouent.
import { zipper, octets, octetsTexte, type FichierZip } from './ancrage';
import { exportCsv, etatDesResultats } from './rapports';
import { taxesARemettre } from './fiscal';
import { periodesDe, dansPeriode } from './periodes';
import { nomCompte } from './plan-defaut';
import type { Compte, Periode, ReglagesCompta, Tiers, Transaction } from './types';

type Lang = 'FR' | 'EN';
type Ligne = Record<string, string | number>;

const H = {
  FR: {
    date: 'Date', description: 'Description', sens: 'Sens', revenu: 'Revenu', depense: 'Dépense', code: 'Code du compte', compte: 'Compte', tiers: 'Tiers',
    montant: 'Montant avant taxes', tps: 'TPS', tvq: 'TVQ', total: 'Total', concilie: 'Concilié', recu: 'Reçu', oui: 'oui', non: 'non',
    source: 'Source', facture: 'Facture', refact: 'À refacturer', refactureeDans: 'Refacturée dans',
    periode: 'Période', debut: 'Début', fin: 'Fin', tpsPercue: 'TPS perçue', tvqPercue: 'TVQ perçue', tpsPayee: 'TPS payée (CTI)', tvqPayee: 'TVQ payée (RTI)',
    tpsRemettre: 'TPS à remettre', tvqRemettre: 'TVQ à remettre', totalRemettre: 'Total à remettre', totalCol: 'Total',
    nom: 'Nom', type: 'Type', courriel: 'Courriel', notes: 'Notes', deductible: 'Part déductible', actif: 'Actif',
  },
  EN: {
    date: 'Date', description: 'Description', sens: 'Type', revenu: 'Revenue', depense: 'Expense', code: 'Account code', compte: 'Account', tiers: 'Party',
    montant: 'Amount before taxes', tps: 'GST', tvq: 'QST', total: 'Total', concilie: 'Reconciled', recu: 'Receipt', oui: 'yes', non: 'no',
    source: 'Source', facture: 'Invoice', refact: 'To rebill', refactureeDans: 'Rebilled in',
    periode: 'Period', debut: 'Start', fin: 'End', tpsPercue: 'GST collected', tvqPercue: 'QST collected', tpsPayee: 'GST paid (ITC)', tvqPayee: 'QST paid (ITR)',
    tpsRemettre: 'GST to remit', tvqRemettre: 'QST to remit', totalRemettre: 'Total to remit', totalCol: 'Total',
    nom: 'Name', type: 'Type', courriel: 'Email', notes: 'Notes', deductible: 'Deductible share', actif: 'Active',
  },
};

const LISEZ_MOI = {
  FR: (ex: string) => `Paquet pour le comptable, ${ex}.\nLes fichiers .csv s'ouvrent dans Excel : transactions, état des résultats, taxes par période, plan comptable et tiers.\nLe dossier recus/ garde chaque reçu sous la date et l'identifiant de sa transaction, et recus-manquants.txt (s'il existe) liste ceux qui n'ont pas pu être téléchargés.\n`,
  EN: (ex: string) => `Accountant package, ${ex}.\nThe .csv files open in Excel: transactions, income statement, taxes by period, chart of accounts and parties.\nThe recus/ folder keeps each receipt under its transaction's date and identifier, and recus-manquants.txt (if present) lists the ones that could not be downloaded.\n`,
};

const BOM = '﻿';
const csv = (entetes: string[], lignes: Ligne[]) => BOM + (lignes.length ? exportCsv(lignes) : entetes.join(','));
const sansSlash = (s: string) => s.replace(/[^\w.\-]+/g, '_');

/** Le nom d'un reçu dans le zip : date, identifiant de la transaction, puis le nom d'origine. */
export const nomRecu = (tr: Transaction) => `recus/${tr.date}_${sansSlash(tr.id)}_${sansSlash(tr.recu?.nom || 'recu')}`;

interface Entrees { transactions: Transaction[]; comptes: Compte[]; tiers: Tiers[]; reglages: ReglagesCompta; exercice: Periode; lang: Lang }

/** Les CSV et le LISEZ-MOI du paquet, sans accès réseau. */
export function csvsDuPaquet({ transactions, comptes, tiers, reglages, exercice, lang }: Entrees): FichierZip[] {
  const h = H[lang];
  const duExercice = transactions.filter((tr) => dansPeriode(tr.date, exercice)).sort((a, b) => a.date.localeCompare(b.date));
  const compte = (id: string) => comptes.find((c) => c.id === id);

  const lignesTx: Ligne[] = duExercice.map((tr) => ({
    [h.date]: tr.date, [h.description]: tr.description, [h.sens]: tr.sens === 'revenu' ? h.revenu : h.depense,
    [h.code]: compte(tr.compteId)?.code || '', [h.compte]: nomCompte(compte(tr.compteId), lang), [h.tiers]: tr.tiers || '',
    [h.montant]: tr.montant, [h.tps]: tr.tps, [h.tvq]: tr.tvq, [h.total]: tr.total,
    [h.concilie]: tr.concilie ? h.oui : h.non, [h.recu]: tr.recu ? h.oui : h.non, [h.source]: tr.source,
    [h.facture]: tr.factureId || '', [h.refact]: tr.refacturable ? h.oui : h.non, [h.refactureeDans]: tr.refactureeDans || '',
  }));
  const entTx = [h.date, h.description, h.sens, h.code, h.compte, h.tiers, h.montant, h.tps, h.tvq, h.total, h.concilie, h.recu, h.source, h.facture, h.refact, h.refactureeDans];

  const etat = etatDesResultats(transactions, comptes, exercice, 'mois');
  const ligneEtat = (c: Compte, parColonne: number[], total: number): Ligne => {
    const l: Ligne = { [h.code]: c.code, [h.compte]: nomCompte(c, lang), [h.sens]: c.sens === 'revenu' ? h.revenu : h.depense };
    etat.colonnes.forEach((col, i) => { l[col.libelle] = parColonne[i]; });
    l[h.totalCol] = total;
    return l;
  };
  const lignesEtat = [...etat.revenus, ...etat.depenses].map((l) => ligneEtat(l.compte, l.parColonne, l.total));
  const total = (libelle: string, parColonne: number[], t: number): Ligne => {
    const l: Ligne = { [h.code]: '', [h.compte]: libelle, [h.sens]: '' };
    etat.colonnes.forEach((col, i) => { l[col.libelle] = parColonne[i]; });
    l[h.totalCol] = t;
    return l;
  };
  lignesEtat.push(total(`${h.revenu} / ${h.totalCol}`, etat.totalRevenusParColonne, etat.totalRevenus), total(`${h.depense} / ${h.totalCol}`, etat.totalDepensesParColonne, etat.totalDepenses));

  const { exercice: ex, trimestres, mois } = periodesDe(reglages, Number(exercice.debut.slice(0, 4)));
  const periodesTaxes = reglages.frequenceTaxes === 'mensuelle' ? mois : reglages.frequenceTaxes === 'annuelle' ? [ex] : trimestres;
  const lignesTaxes: Ligne[] = periodesTaxes.map((p) => {
    const t = taxesARemettre(transactions, reglages, p);
    const r = (v: number) => Math.round(v * 100) / 100;
    return {
      [h.periode]: p.libelle, [h.debut]: p.debut, [h.fin]: p.fin,
      [h.tpsPercue]: r(t.percu.tps), [h.tvqPercue]: r(t.percu.tvq), [h.tpsPayee]: r(t.credits.cti), [h.tvqPayee]: r(t.credits.rti),
      [h.tpsRemettre]: r(t.net.tps), [h.tvqRemettre]: r(t.net.tvq), [h.totalRemettre]: r(t.net.total),
    };
  });
  const entTaxes = [h.periode, h.debut, h.fin, h.tpsPercue, h.tvqPercue, h.tpsPayee, h.tvqPayee, h.tpsRemettre, h.tvqRemettre, h.totalRemettre];

  const lignesPlan: Ligne[] = comptes.map((c) => ({
    [h.code]: c.code, [h.compte]: nomCompte(c, lang), [h.sens]: c.sens === 'revenu' ? h.revenu : h.depense,
    [h.deductible]: c.deductible ?? 1, [h.actif]: c.actif ? h.oui : h.non,
  }));
  const lignesTiers: Ligne[] = tiers.map((t) => ({ [h.nom]: t.nom, [h.type]: t.type, [h.courriel]: t.courriel || '', [h.notes]: t.notes || '' }));

  return [
    { nom: 'LISEZ-MOI.txt', data: octetsTexte(LISEZ_MOI[lang](exercice.libelle)) },
    { nom: 'transactions.csv', data: octetsTexte(csv(entTx, lignesTx)) },
    { nom: 'etat-des-resultats.csv', data: octetsTexte(csv([h.compte], lignesEtat)) },
    { nom: 'taxes.csv', data: octetsTexte(csv(entTaxes, lignesTaxes)) },
    { nom: 'plan-comptable.csv', data: octetsTexte(csv([h.code, h.compte, h.sens, h.deductible, h.actif], lignesPlan)) },
    { nom: 'tiers.csv', data: octetsTexte(csv([h.nom, h.type, h.courriel, h.notes], lignesTiers)) },
  ];
}

/** Les transactions de l'exercice qui portent un reçu. */
export const transactionsAvecRecu = (transactions: Transaction[], exercice: Periode) =>
  transactions.filter((tr) => tr.recu?.url && dansPeriode(tr.date, exercice));

/** Le zip complet. `surProgres(n, N)` est appelé après chaque reçu traité (téléchargé ou échoué). */
export async function construirePaquet(e: Entrees, surProgres: (n: number, total: number) => void): Promise<{ blob: Blob; manquants: number }> {
  const fichiers = csvsDuPaquet(e);
  const avecRecu = transactionsAvecRecu(e.transactions, e.exercice);
  const manquants: string[] = [];
  let fait = 0;
  surProgres(0, avecRecu.length);
  // Quatre téléchargements à la fois : assez vite, sans saturer le réseau de Laurie.
  const file = [...avecRecu];
  const travailleur = async () => {
    for (let tr = file.shift(); tr; tr = file.shift()) {
      try {
        fichiers.push({ nom: nomRecu(tr), data: await octets(tr.recu!.url) });
      } catch {
        manquants.push(`${tr.date}  ${tr.id}  ${tr.description}  ${tr.recu!.url}`);
      }
      surProgres(++fait, avecRecu.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, avecRecu.length) }, travailleur));
  if (manquants.length) fichiers.push({ nom: 'recus-manquants.txt', data: octetsTexte(manquants.sort().join('\n') + '\n') });
  return { blob: zipper(fichiers), manquants: manquants.length };
}
