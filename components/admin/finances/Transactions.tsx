// Le grand livre façon QuickBooks : table dense, filtres, tri, édition en ligne, ajout rapide,
// suppression, pagination au-delà de 200 lignes. Contrat : lib/compta/types.ts. Canon : CANON-ADMIN.md.
import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Receipt, ArrowUpDown } from 'lucide-react';
import { Panneau, Bouton, Champ, Selection, Vide, Chargement, Etiquette, useCollection, type Language } from '../../../lib/compta/ancrage';
import { formatMontant, formatNombre } from '../../../lib/compta/format';
import { calculerTaxes } from '../../../lib/compta/import';
import { useTransactions, ajouterTransaction, modifierTransaction, supprimerTransaction, importerFacturesPayees } from '../../../lib/compta/transactions';
import { usePlanComptable } from '../../../lib/compta/plan-defaut';
import type { Document as DocumentFacture } from '../../../types';
import type { Sens, Transaction } from '../../../lib/compta/types';
import Recus from './Recus';
import BlocsEdition from './BlocsEdition';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    titre: 'Transactions', sous: 'Le grand livre : chaque revenu et chaque dépense, avec ses taxes.',
    importerFactures: 'Importer les factures payées',
    date: 'Date', description: 'Description', tiers: 'Tiers', compte: 'Compte', montant: 'Montant', taxes: 'Taxes', recu: 'Reçu', concilie: 'Concilié',
    filtreTexte: 'Rechercher…', tousComptes: 'Tous les comptes', tousSens: 'Revenus et dépenses', sensLabel: 'Sens', revenu: 'Revenus', depense: 'Dépenses',
    ajouter: 'Ajouter', supprimer: 'Supprimer', confirmerSuppr: 'Supprimer cette transaction ?', enregistrer: 'Enregistrer', annuler: 'Annuler',
    vide: 'Aucune transaction', videTexte: "Ajoutez une transaction, importez un relevé, ou importez les factures payées.",
    page: 'Page', sur: 'sur', precedent: 'Précédent', suivant: 'Suivant',
    nouvelleDate: 'Date', nouvelleDesc: 'Description', nouveauMontant: 'Montant avant taxes', nouveauTiers: 'Tiers',
    aRefacturer: 'À refacturer', clientFacturer: 'Client à facturer', recurrente: 'Récurrente', refacturee: (n: string) => `Refacturée (${n})`,
    importees: (n: number) => `${n} facture${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}.`, aucuneNouvelle: 'Aucune nouvelle facture payée à importer.',
  },
  EN: {
    titre: 'Transactions', sous: 'The ledger: every revenue and expense, with its taxes.',
    importerFactures: 'Import paid invoices',
    date: 'Date', description: 'Description', tiers: 'Party', compte: 'Account', montant: 'Amount', taxes: 'Taxes', recu: 'Receipt', concilie: 'Reconciled',
    filtreTexte: 'Search…', tousComptes: 'All accounts', tousSens: 'Revenue and expenses', sensLabel: 'Type', revenu: 'Revenue', depense: 'Expenses',
    ajouter: 'Add', supprimer: 'Delete', confirmerSuppr: 'Delete this transaction?', enregistrer: 'Save', annuler: 'Cancel',
    vide: 'No transactions', videTexte: 'Add a transaction, import a statement, or import paid invoices.',
    page: 'Page', sur: 'of', precedent: 'Previous', suivant: 'Next',
    nouvelleDate: 'Date', nouvelleDesc: 'Description', nouveauMontant: 'Amount before taxes', nouveauTiers: 'Party',
    aRefacturer: 'To rebill', clientFacturer: 'Client to bill', recurrente: 'Recurring', refacturee: (n: string) => `Rebilled (${n})`,
    importees: (n: number) => `${n} invoice${n > 1 ? 's' : ''} imported.`, aucuneNouvelle: 'No new paid invoice to import.',
  },
};

const PAR_PAGE = 50;

const Transactions: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: transactions, loading } = useTransactions();
  const { comptes } = usePlanComptable();
  const { data: documents } = useCollection<DocumentFacture>('documents');

  const [texte, setTexte] = useState('');
  const [filtreSens, setFiltreSens] = useState<'' | Sens>('');
  const [filtreCompte, setFiltreCompte] = useState('');
  const [filtreRefact, setFiltreRefact] = useState(false);
  const [tri, setTri] = useState<{ champ: 'date' | 'montant'; sens: 'asc' | 'desc' }>({ champ: 'date', sens: 'desc' });
  const [page, setPage] = useState(0);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [recuOuvert, setRecuOuvert] = useState<Transaction | null>(null);

  const [nouvelle, setNouvelle] = useState({ date: new Date().toISOString().slice(0, 10), description: '', tiers: '', montant: '', sens: 'depense' as Sens, compteId: comptes[0]?.id || '', refacturable: false, refactureA: '' });

  const compteNom = (id: string) => {
    const c = comptes.find((c) => c.id === id);
    return c ? (lang === 'FR' ? c.nom : c.nomEn) : (lang === 'FR' ? 'Sans catégorie' : 'Uncategorized');
  };

  const filtrees = useMemo(() => {
    const bas = texte.trim().toLowerCase();
    let liste = transactions.filter((tr) => {
      if (filtreSens && tr.sens !== filtreSens) return false;
      if (filtreCompte && tr.compteId !== filtreCompte) return false;
      if (filtreRefact && !(tr.refacturable && !tr.refactureeDans)) return false;
      if (bas && !(tr.description.toLowerCase().includes(bas) || (tr.tiers || '').toLowerCase().includes(bas))) return false;
      return true;
    });
    liste = [...liste].sort((a, b) => {
      const v = tri.champ === 'date' ? a.date.localeCompare(b.date) : a.montant - b.montant;
      return tri.sens === 'asc' ? v : -v;
    });
    return liste;
  }, [transactions, texte, filtreSens, filtreCompte, filtreRefact, tri]);

  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageBornee = Math.min(page, pages - 1);
  const visibles = filtrees.slice(pageBornee * PAR_PAGE, pageBornee * PAR_PAGE + PAR_PAGE);

  const basculerTri = (champ: 'date' | 'montant') => {
    setTri((prev) => (prev.champ === champ ? { champ, sens: prev.sens === 'asc' ? 'desc' : 'asc' } : { champ, sens: 'desc' }));
  };

  const soumettreNouvelle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouvelle.description.trim() || !nouvelle.montant) return;
    setBusy(true);
    try {
      const split = calculerTaxes(parseFloat(nouvelle.montant) || 0, {});
      await ajouterTransaction({
        date: nouvelle.date,
        description: nouvelle.description.trim(),
        sens: nouvelle.sens,
        montant: split.montant,
        tps: split.tps,
        tvq: split.tvq,
        total: split.total,
        compteId: nouvelle.compteId || comptes.find((c) => c.sens === nouvelle.sens)?.id || '',
        tiers: nouvelle.tiers.trim() || undefined,
        source: 'manuel',
        concilie: false,
        refacturable: nouvelle.sens === 'depense' && nouvelle.refacturable ? true : undefined,
        refactureA: nouvelle.sens === 'depense' && nouvelle.refacturable ? (nouvelle.refactureA.trim() || nouvelle.tiers.trim() || undefined) : undefined,
      });
      setNouvelle({ date: new Date().toISOString().slice(0, 10), description: '', tiers: '', montant: '', sens: 'depense', compteId: comptes.find((c) => c.sens === 'depense')?.id || '', refacturable: false, refactureA: '' });
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async (id: string) => {
    if (!window.confirm(t.confirmerSuppr)) return;
    await supprimerTransaction(id);
  };

  const importerFactures = async () => {
    setBusy(true);
    try {
      const n = await importerFacturesPayees(documents, transactions);
      setMessage(n > 0 ? t.importees(n) : t.aucuneNouvelle);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ajout rapide */}
      <Panneau titre={t.ajouter}>
        <form onSubmit={soumettreNouvelle} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Champ label={t.nouvelleDate} type="date" value={nouvelle.date} onChange={(e) => setNouvelle((n) => ({ ...n, date: e.target.value }))} required />
          <Champ label={t.nouvelleDesc} value={nouvelle.description} onChange={(e) => setNouvelle((n) => ({ ...n, description: e.target.value }))} required className="lg:col-span-2" />
          <Champ label={t.nouveauTiers} value={nouvelle.tiers} onChange={(e) => setNouvelle((n) => ({ ...n, tiers: e.target.value }))} />
          <Selection label={t.sensLabel} value={nouvelle.sens} onChange={(e) => setNouvelle((n) => ({ ...n, sens: e.target.value as Sens, compteId: '' }))}>
            <option value="depense">{t.depense}</option>
            <option value="revenu">{t.revenu}</option>
          </Selection>
          <Selection label={t.compte} value={nouvelle.compteId} onChange={(e) => setNouvelle((n) => ({ ...n, compteId: e.target.value }))}>
            {comptes.filter((c) => c.sens === nouvelle.sens && c.actif).map((c) => (
              <option key={c.id} value={c.id}>{lang === 'FR' ? c.nom : c.nomEn}</option>
            ))}
          </Selection>
          <Champ label={t.nouveauMontant} type="number" step="0.01" min="0" value={nouvelle.montant} onChange={(e) => setNouvelle((n) => ({ ...n, montant: e.target.value }))} required />
          {nouvelle.sens === 'depense' && (
            <label className="flex items-center gap-2 text-sm font-semibold text-encre min-h-[44px]">
              <input type="checkbox" className="w-5 h-5 accent-rose" checked={nouvelle.refacturable}
                onChange={(e) => setNouvelle((n) => ({ ...n, refacturable: e.target.checked, refactureA: e.target.checked && !n.refactureA ? n.tiers : n.refactureA }))} />
              {t.aRefacturer}
            </label>
          )}
          {nouvelle.sens === 'depense' && nouvelle.refacturable && (
            <Champ label={t.clientFacturer} value={nouvelle.refactureA} onChange={(e) => setNouvelle((n) => ({ ...n, refactureA: e.target.value }))} className="lg:col-span-2" />
          )}
          <Bouton type="submit" icone={Plus} disabled={busy} className="lg:col-span-1">{t.ajouter}</Bouton>
        </form>
      </Panneau>

      <Panneau
        titre={t.titre}
        actions={
          <>
            <input value={texte} onChange={(e) => { setTexte(e.target.value); setPage(0); }} placeholder={t.filtreTexte} aria-label={t.filtreTexte}
              className="bg-papier border border-filet rounded-champ px-4 py-2 text-sm text-encre placeholder-gris outline-none focus:border-rose w-full sm:w-40 md:w-56" />
            <select value={filtreSens} onChange={(e) => { setFiltreSens(e.target.value as any); setPage(0); }} aria-label={t.tousSens}
              className="bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose">
              <option value="">{t.tousSens}</option>
              <option value="revenu">{t.revenu}</option>
              <option value="depense">{t.depense}</option>
            </select>
            <select value={filtreCompte} onChange={(e) => { setFiltreCompte(e.target.value); setPage(0); }} aria-label={t.compte}
              className="bg-papier border border-filet rounded-champ px-3 py-2 text-sm text-encre outline-none focus:border-rose">
              <option value="">{t.tousComptes}</option>
              {comptes.map((c) => <option key={c.id} value={c.id}>{lang === 'FR' ? c.nom : c.nomEn}</option>)}
            </select>
            <Bouton variante={filtreRefact ? 'primaire' : 'secondaire'} petit onClick={() => { setFiltreRefact((v) => !v); setPage(0); }} aria-pressed={filtreRefact}>{t.aRefacturer}</Bouton>
            <Bouton variante="secondaire" petit onClick={importerFactures} disabled={busy}>{t.importerFactures}</Bouton>
          </>
        }
      >
        {message && <p className="text-sm text-gris mb-3">{message}</p>}
        {loading ? (
          <Chargement />
        ) : filtrees.length === 0 ? (
          <Vide titre={t.vide} texte={t.videTexte} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="divide-y divide-filet border-b border-filet">
                    <th className="py-3 pr-3"><button onClick={() => basculerTri('date')} className="kicker text-gris inline-flex items-center gap-1 hover:text-encre">{t.date} <ArrowUpDown className="w-3 h-3" aria-hidden="true" /></button></th>
                    <th className="py-3 pr-3 kicker text-gris">{t.description}</th>
                    <th className="py-3 pr-3 kicker text-gris">{t.tiers}</th>
                    <th className="py-3 pr-3 kicker text-gris">{t.compte}</th>
                    <th className="py-3 pr-3 kicker text-gris text-right"><button onClick={() => basculerTri('montant')} className="inline-flex items-center gap-1 hover:text-encre">{t.montant} <ArrowUpDown className="w-3 h-3" aria-hidden="true" /></button></th>
                    <th className="py-3 pr-3 kicker text-gris text-right">{t.taxes}</th>
                    <th className="py-3 pr-3 kicker text-gris text-center">{t.recu}</th>
                    <th className="py-3 pr-3 kicker text-gris text-center">{t.concilie}</th>
                    <th className="py-3 kicker text-gris text-center" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-filet">
                  {visibles.map((tr) => (
                    <LigneTransaction key={tr.id} tr={tr} lang={lang} comptes={comptes} compteNom={compteNom}
                      enEdition={editionId === tr.id} onEditer={() => setEditionId(tr.id)} onFermer={() => setEditionId(null)}
                      onSupprimer={() => supprimer(tr.id)} onOuvrirRecu={() => setRecuOuvert(tr)} texteBoutons={t}
                      numeroFacture={(id) => documents.find((d) => d.id === id)?.number || id} />
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="mt-6 flex items-center justify-between text-sm text-gris">
                <span>{t.page} {pageBornee + 1} {t.sur} {pages}</span>
                <div className="flex gap-2">
                  <Bouton variante="secondaire" petit disabled={pageBornee === 0} onClick={() => setPage(pageBornee - 1)}>{t.precedent}</Bouton>
                  <Bouton variante="secondaire" petit disabled={pageBornee >= pages - 1} onClick={() => setPage(pageBornee + 1)}>{t.suivant}</Bouton>
                </div>
              </div>
            )}
          </>
        )}
      </Panneau>
      {recuOuvert && <Recus transaction={recuOuvert} lang={lang} onFermer={() => setRecuOuvert(null)} />}
    </div>
  );
};

const LigneTransaction: React.FC<{
  tr: Transaction; lang: Language; comptes: ReturnType<typeof usePlanComptable>['comptes'];
  compteNom: (id: string) => string; enEdition: boolean; onEditer: () => void; onFermer: () => void; onSupprimer: () => void; onOuvrirRecu: () => void;
  texteBoutons: typeof TEXTES['FR']; numeroFacture: (id: string) => string;
}> = ({ tr, lang, comptes, compteNom, enEdition, onEditer, onFermer, onSupprimer, onOuvrirRecu, texteBoutons, numeroFacture }) => {
  const [brouillon, setBrouillon] = useState(tr);

  if (enEdition) {
    const enregistrer = async () => {
      const split = calculerTaxes(brouillon.montant, {});
      await modifierTransaction(tr.id, { description: brouillon.description, tiers: brouillon.tiers, compteId: brouillon.compteId, date: brouillon.date,
        refacturable: brouillon.refacturable, refactureA: brouillon.refacturable ? (brouillon.refactureA || brouillon.tiers || undefined) : undefined,
        recurrence: brouillon.recurrence ? JSON.parse(JSON.stringify(brouillon.recurrence)) : undefined,
        montant: split.montant, tps: split.tps, tvq: split.tvq, total: split.total });
      onFermer();
    };
    return (
      <>
      <tr className="bg-papier-2">
        <td className="py-2 pr-3"><input type="date" value={brouillon.date} onChange={(e) => setBrouillon((b) => ({ ...b, date: e.target.value }))} className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre outline-none focus:border-rose" /></td>
        <td className="py-2 pr-3"><input value={brouillon.description} onChange={(e) => setBrouillon((b) => ({ ...b, description: e.target.value }))} className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre outline-none focus:border-rose w-full" /></td>
        <td className="py-2 pr-3"><input value={brouillon.tiers || ''} onChange={(e) => setBrouillon((b) => ({ ...b, tiers: e.target.value }))} className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre outline-none focus:border-rose w-full" /></td>
        <td className="py-2 pr-3">
          <select value={brouillon.compteId} onChange={(e) => setBrouillon((b) => ({ ...b, compteId: e.target.value }))} className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre outline-none focus:border-rose">
            {comptes.filter((c) => c.sens === tr.sens).map((c) => <option key={c.id} value={c.id}>{lang === 'FR' ? c.nom : c.nomEn}</option>)}
          </select>
        </td>
        <td className="py-2 pr-3 text-right"><input type="number" step="0.01" value={brouillon.montant} onChange={(e) => setBrouillon((b) => ({ ...b, montant: parseFloat(e.target.value) || 0 }))} className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre text-right outline-none focus:border-rose w-24 tabular-nums" /></td>
        <td className="py-2 pr-3 text-right text-sm text-gris tabular-nums">{formatNombre(brouillon.tps + brouillon.tvq)}</td>
        <td colSpan={2} />
        <td />
      </tr>
      <tr className="bg-papier-2">
        <td colSpan={9} className="pr-3">
          <BlocsEdition lang={lang} brouillon={brouillon} onChange={(patch) => setBrouillon((b) => ({ ...b, ...patch }))}
            onEnregistrer={enregistrer} onFermer={onFermer} enregistrer={texteBoutons.enregistrer} annuler={texteBoutons.annuler} />
        </td>
      </tr>
      </>
    );
  }

  return (
    <tr className="hover:bg-papier-2/60 cursor-pointer" onClick={onEditer}>
      <td className="py-3 pr-3 text-sm text-gris whitespace-nowrap">{tr.date}</td>
      <td className="py-3 pr-3 text-sm font-medium text-encre">
        {tr.description}
        {(tr.recurrence || (tr.sens === 'depense' && tr.refacturable)) && (
          <span className="flex flex-wrap gap-1.5 mt-1">
            {tr.recurrence && <Etiquette tone="neutre" className="!text-[13px]">{texteBoutons.recurrente}</Etiquette>}
            {tr.refacturable && <Etiquette tone={tr.refactureeDans ? 'neutre' : 'accent'} className="!text-[13px]">{tr.refactureeDans ? texteBoutons.refacturee(numeroFacture(tr.refactureeDans)) : texteBoutons.aRefacturer}</Etiquette>}
          </span>
        )}
      </td>
      <td className="py-3 pr-3 text-sm text-gris">{tr.tiers || '–'}</td>
      <td className="py-3 pr-3 text-sm text-gris">{compteNom(tr.compteId)}</td>
      <td className={`py-3 pr-3 text-sm text-right font-medium tabular-nums ${tr.sens === 'revenu' ? 'text-encre' : 'text-encre'}`}>
        {tr.sens === 'revenu' ? '+' : '−'}{formatMontant(tr.montant)}
      </td>
      <td className="py-3 pr-3 text-sm text-right text-gris tabular-nums">{formatNombre(tr.tps + tr.tvq)}</td>
      <td className="py-3 pr-3 text-center" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onOuvrirRecu} aria-label={texteBoutons.recu} className="w-9 h-9 inline-flex items-center justify-center hover:text-encre">
          {tr.recu ? <Receipt className="w-4 h-4 text-rose" aria-hidden="true" /> : <span className="text-gris">–</span>}
        </button>
      </td>
      <td className="py-3 pr-3 text-center">
        {tr.concilie ? <Etiquette tone="accent">✓</Etiquette> : <span className="text-gris">–</span>}
      </td>
      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onSupprimer} aria-label={texteBoutons.supprimer} className="w-9 h-9 inline-flex items-center justify-center text-gris hover:text-rose transition-colors">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
};

export default Transactions;
