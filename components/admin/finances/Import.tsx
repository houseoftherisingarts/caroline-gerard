// Import d'un relevé bancaire CSV ou OFX/QFX : dépôt du fichier, aperçu, choix des colonnes, doublons
// signalés, import. Split des taxes automatique, catégorisation par les règles apprises. Contrat :
// lib/compta/import.ts (parseurs purs) et lib/compta/types.ts.
import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Panneau, Bouton, Selection, Etiquette, type Language } from '../../../lib/compta/ancrage';
import { apercuCsv, parseOfx, lignesDepuisApercu, empreinte, appliquerRegles, motifAppris, calculerTaxes, type Apercu, type LigneImport } from '../../../lib/compta/import';
import { ajouterTransaction, useTransactions } from '../../../lib/compta/transactions';
import { usePlanComptable } from '../../../lib/compta/plan-defaut';
import { useReglagesCompta, apprendreRegle } from '../../../lib/compta/periodes';
import { formatMontant } from '../../../lib/compta/format';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    titre: 'Importer un relevé', sous: 'Un fichier CSV ou OFX/QFX de votre institution bancaire.',
    deposer: 'Glissez un fichier ici, ou cliquez pour le choisir', formats: 'CSV, OFX ou QFX',
    apercuTitre: 'Aperçu avant import', colonneDate: 'Colonne date', colonneDesc: 'Colonne description', colonneDebit: 'Colonne débit', colonneCredit: 'Colonne crédit', colonneMontant: 'Colonne montant (signé)',
    aucune: '(aucune)', lignes: (n: number) => `${n} ligne${n > 1 ? 's' : ''} détectée${n > 1 ? 's' : ''}.`,
    date: 'Date', description: 'Description', montant: 'Montant', compte: 'Compte', deja: 'Déjà importée',
    importer: 'Importer', importerN: (n: number) => `Importer ${n} nouvelle${n > 1 ? 's' : ''} transaction${n > 1 ? 's' : ''}`,
    fait: (n: number) => `${n} transaction${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}.`, recommencer: 'Importer un autre fichier',
    doublonsTitre: (n: number) => `${n} ligne${n > 1 ? 's' : ''} déjà présente${n > 1 ? 's' : ''} dans le grand livre, ignorée${n > 1 ? 's' : ''}.`,
  },
  EN: {
    titre: 'Import a statement', sous: 'A CSV or OFX/QFX file from your bank.',
    deposer: 'Drag a file here, or click to choose one', formats: 'CSV, OFX or QFX',
    apercuTitre: 'Preview before import', colonneDate: 'Date column', colonneDesc: 'Description column', colonneDebit: 'Debit column', colonneCredit: 'Credit column', colonneMontant: 'Amount column (signed)',
    aucune: '(none)', lignes: (n: number) => `${n} row${n > 1 ? 's' : ''} detected.`,
    date: 'Date', description: 'Description', montant: 'Amount', compte: 'Account', deja: 'Already imported',
    importer: 'Import', importerN: (n: number) => `Import ${n} new transaction${n > 1 ? 's' : ''}`,
    fait: (n: number) => `${n} transaction${n > 1 ? 's' : ''} imported.`, recommencer: 'Import another file',
    doublonsTitre: (n: number) => `${n} row${n > 1 ? 's' : ''} already in the ledger, skipped.`,
  },
};

type Etape = 'depot' | 'apercu' | 'fait';

const Import: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { data: transactions } = useTransactions();
  const { comptes } = usePlanComptable();
  const { regles } = useReglagesCompta();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [etape, setEtape] = useState<Etape>('depot');
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [colonnes, setColonnes] = useState({ date: -1, description: -1, debit: -1, credit: -1, montant: -1 });
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [busy, setBusy] = useState(false);
  const [importees, setImportees] = useState(0);

  const empreintesExistantes = new Set(transactions.map((tr) => empreinte({ date: tr.date, description: tr.description, montant: tr.sens === 'revenu' ? tr.montant : -tr.montant })));

  const traiterFichier = async (file: File) => {
    const texte = await file.text();
    const estOfx = /\.(ofx|qfx)$/i.test(file.name) || /<OFX>/i.test(texte.slice(0, 200));
    if (estOfx) {
      setLignes(parseOfx(texte));
      setApercu(null);
      setEtape('apercu');
    } else {
      const a = apercuCsv(texte);
      setApercu(a);
      setColonnes(a.detection);
      setLignes(lignesDepuisApercu(a, a.detection));
      setEtape('apercu');
    }
  };

  const surChangementColonnes = (nouvelles: typeof colonnes) => {
    setColonnes(nouvelles);
    if (apercu) setLignes(lignesDepuisApercu(apercu, nouvelles));
  };

  const lignesAvecStatut = lignes.map((l) => ({ ligne: l, doublon: empreintesExistantes.has(empreinte(l)) }));
  const nouvellesLignes = lignesAvecStatut.filter((l) => !l.doublon);
  const doublons = lignesAvecStatut.length - nouvellesLignes.length;

  const importer = async () => {
    setBusy(true);
    try {
      for (const { ligne } of nouvellesLignes) {
        const suggestion = appliquerRegles(ligne.description, regles);
        const compteId = suggestion?.compteId || (ligne.montant >= 0 ? comptes.find((c) => c.sens === 'revenu')?.id : comptes.find((c) => c.sens === 'depense')?.id) || '';
        const split = calculerTaxes(Math.abs(ligne.montant), { depuisTotal: true });
        await ajouterTransaction({
          date: ligne.date,
          description: ligne.description,
          sens: ligne.montant >= 0 ? 'revenu' : 'depense',
          montant: split.montant,
          tps: split.tps,
          tvq: split.tvq,
          total: split.total,
          compteId,
          tiers: suggestion?.tiers || ligne.description,
          source: 'import',
          importId: empreinte(ligne),
          concilie: false,
        });
      }
      setImportees(nouvellesLignes.length);
      setEtape('fait');
    } finally {
      setBusy(false);
    }
  };

  const recategoriser = async (description: string, compteId: string) => {
    await apprendreRegle({ motif: motifAppris(description), compteId }, regles);
  };

  if (etape === 'fait') {
    return (
      <Panneau titre={t.titre}>
        <p className="text-sm text-encre">{t.fait(importees)}</p>
        <div className="mt-4"><Bouton variante="secondaire" onClick={() => { setEtape('depot'); setApercu(null); setLignes([]); }}>{t.recommencer}</Bouton></div>
      </Panneau>
    );
  }

  if (etape === 'apercu') {
    return (
      <Panneau titre={t.apercuTitre} actions={<Bouton variante="secondaire" petit onClick={() => { setEtape('depot'); setApercu(null); setLignes([]); }}>{t.recommencer}</Bouton>}>
        {apercu && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {(['date', 'description', 'debit', 'credit', 'montant'] as const).map((champ) => (
              <Selection key={champ} label={{ date: t.colonneDate, description: t.colonneDesc, debit: t.colonneDebit, credit: t.colonneCredit, montant: t.colonneMontant }[champ]}
                value={colonnes[champ]} onChange={(e) => surChangementColonnes({ ...colonnes, [champ]: Number(e.target.value) })}>
                <option value={-1}>{t.aucune}</option>
                {apercu.colonnes.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </Selection>
            ))}
          </div>
        )}
        <p className="text-sm text-gris mb-3">{t.lignes(lignesAvecStatut.length)}</p>
        {doublons > 0 && (
          <p className="text-sm text-rose mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" />{t.doublonsTitre(doublons)}</p>
        )}
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-filet rounded-champ">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-papier-2">
              <tr className="divide-y divide-filet border-b border-filet">
                <th className="py-2 px-3 kicker text-gris">{t.date}</th>
                <th className="py-2 px-3 kicker text-gris">{t.description}</th>
                <th className="py-2 px-3 kicker text-gris text-right">{t.montant}</th>
                <th className="py-2 px-3 kicker text-gris">{t.compte}</th>
                <th className="py-2 px-3 kicker text-gris" />
              </tr>
            </thead>
            <tbody className="divide-y divide-filet">
              {lignesAvecStatut.map(({ ligne, doublon }, i) => {
                const suggestion = appliquerRegles(ligne.description, regles);
                return (
                  <tr key={i} className={doublon ? 'opacity-40' : ''}>
                    <td className="py-2 px-3 text-sm text-gris whitespace-nowrap">{ligne.date}</td>
                    <td className="py-2 px-3 text-sm text-encre">{ligne.description}</td>
                    <td className="py-2 px-3 text-sm text-right tabular-nums text-encre">{ligne.montant >= 0 ? '+' : '−'}{formatMontant(Math.abs(ligne.montant))}</td>
                    <td className="py-2 px-3 text-sm text-gris">
                      <select defaultValue={suggestion?.compteId || ''} onChange={(e) => recategoriser(ligne.description, e.target.value)}
                        className="bg-papier border border-filet rounded-champ px-2 py-1 text-sm text-encre outline-none focus:border-rose">
                        <option value="">–</option>
                        {comptes.filter((c) => c.sens === (ligne.montant >= 0 ? 'revenu' : 'depense')).map((c) => (
                          <option key={c.id} value={c.id}>{lang === 'FR' ? c.nom : c.nomEn}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">{doublon && <Etiquette tone="neutre">{t.deja}</Etiquette>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <Bouton icone={Upload} onClick={importer} disabled={busy || nouvellesLignes.length === 0}>{t.importerN(nouvellesLignes.length)}</Bouton>
        </div>
      </Panneau>
    );
  }

  return (
    <Panneau titre={t.titre}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) traiterFichier(f); }}
        onClick={() => fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-champ py-16 px-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-rose bg-rose/5' : 'border-filet hover:border-encre'}`}
      >
        <FileText className="w-8 h-8 text-gris" aria-hidden="true" />
        <p className="text-encre font-medium">{t.deposer}</p>
        <p className="text-[13px] text-gris">{t.formats}</p>
        <input ref={fileRef} type="file" accept=".csv,.ofx,.qfx,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) traiterFichier(f); }} />
      </div>
    </Panneau>
  );
};

export default Import;
