// Plan comptable : liste, ajout, renommage, désactivation, ordre. Surcharge settings/plan_comptable,
// valeur de départ dans lib/compta/plan-defaut.ts (PLAN_COMPTABLE_DEFAUT).
import React, { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Panneau, Bouton, Champ, Selection, Etiquette, type Language } from '../../../lib/compta/ancrage';
import { usePlanComptable, enregistrerPlanComptable } from '../../../lib/compta/plan-defaut';
import type { Compte, Sens } from '../../../lib/compta/types';

interface Props {
  lang: Language;
}

const TEXTES = {
  FR: {
    titre: 'Plan comptable', sous: 'Les catégories de revenus et de dépenses utilisées dans le grand livre.',
    code: 'Code', nom: 'Nom', sens: 'Sens', deductible: 'Déductible', actif: 'Actif', revenu: 'Revenu', depense: 'Dépense',
    ajouter: 'Ajouter un compte', nouveauNom: 'Nom du compte', nouveauCode: 'Code', enregistrer: 'Enregistrer les changements',
    integral: 'Intégral', partiel: '50 %', desactiver: 'Désactiver', activer: 'Activer',
  },
  EN: {
    titre: 'Chart of accounts', sous: 'The revenue and expense categories used in the ledger.',
    code: 'Code', nom: 'Name', sens: 'Type', deductible: 'Deductible', actif: 'Active', revenu: 'Revenue', depense: 'Expense',
    ajouter: 'Add an account', nouveauNom: 'Account name', nouveauCode: 'Code', enregistrer: 'Save changes',
    integral: 'Full', partiel: '50%', desactiver: 'Disable', activer: 'Enable',
  },
};

const PlanComptable: React.FC<Props> = ({ lang }) => {
  const t = TEXTES[lang];
  const { comptes: comptesSauvegardes } = usePlanComptable();
  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauCode, setNouveauCode] = useState('');
  const [nouveauSens, setNouveauSens] = useState<Sens>('depense');
  const [busy, setBusy] = useState(false);

  const liste = comptes ?? comptesSauvegardes;

  const modifier = (id: string, patch: Partial<Compte>) => {
    setComptes(liste.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deplacer = (id: string, sens: -1 | 1) => {
    const idx = liste.findIndex((c) => c.id === id);
    const cible = idx + sens;
    if (cible < 0 || cible >= liste.length) return;
    const copie = [...liste];
    [copie[idx].ordre, copie[cible].ordre] = [copie[cible].ordre, copie[idx].ordre];
    copie.sort((a, b) => a.ordre - b.ordre);
    setComptes(copie);
  };

  const ajouter = () => {
    if (!nouveauNom.trim()) return;
    const maxOrdre = Math.max(0, ...liste.map((c) => c.ordre));
    const nouveau: Compte = {
      id: `${nouveauSens}-${nouveauNom.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Date.now().toString(36)}`,
      code: nouveauCode || String(maxOrdre + 10),
      nom: nouveauNom.trim(),
      nomEn: nouveauNom.trim(),
      sens: nouveauSens,
      ordre: maxOrdre + 10,
      actif: true,
    };
    setComptes([...liste, nouveau]);
    setNouveauNom('');
    setNouveauCode('');
  };

  const enregistrer = async () => {
    setBusy(true);
    try {
      await enregistrerPlanComptable(liste);
      setComptes(null);
    } finally {
      setBusy(false);
    }
  };

  const grouper = (s: Sens) => liste.filter((c) => c.sens === s).sort((a, b) => a.ordre - b.ordre);

  const Groupe: React.FC<{ titre: string; comptes: Compte[]; estDepense?: boolean }> = ({ titre, comptes, estDepense }) => (
    <div>
      <h3 className="font-sans font-semibold text-encre mb-3">{titre}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="divide-y divide-filet border-b border-filet">
              <th className="py-2 pr-3 kicker text-gris w-16">{t.code}</th>
              <th className="py-2 pr-3 kicker text-gris">{t.nom}</th>
              {estDepense && <th className="py-2 pr-3 kicker text-gris">{t.deductible}</th>}
              <th className="py-2 pr-3 kicker text-gris text-center">{t.actif}</th>
              <th className="py-2 kicker text-gris text-right">{lang === 'FR' ? 'Ordre' : 'Order'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filet">
            {comptes.map((c) => (
              <tr key={c.id} className={c.actif ? '' : 'opacity-50'}>
                <td className="py-2 pr-3 text-sm text-gris tabular-nums">{c.code}</td>
                <td className="py-2 pr-3 text-sm min-w-[11rem]">
                  <input value={lang === 'FR' ? c.nom : c.nomEn} onChange={(e) => modifier(c.id, lang === 'FR' ? { nom: e.target.value } : { nomEn: e.target.value })}
                    className="bg-transparent border-b border-transparent hover:border-filet focus:border-rose outline-none text-encre w-full py-0.5" />
                </td>
                {c.sens === 'depense' && (
                  <td className="py-2 pr-3">
                    <Selection label="" value={c.deductible ?? 1} onChange={(e) => modifier(c.id, { deductible: Number(e.target.value) })} className="!gap-0">
                      <option value={1}>{t.integral}</option>
                      <option value={0.5}>{t.partiel}</option>
                    </Selection>
                  </td>
                )}
                <td className="py-2 pr-3 text-center">
                  <button type="button" onClick={() => modifier(c.id, { actif: !c.actif })} aria-label={c.actif ? t.desactiver : t.activer} className="w-9 h-9 inline-flex items-center justify-center text-gris hover:text-encre">
                    {c.actif ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => deplacer(c.id, -1)} aria-label="↑" className="w-8 h-8 inline-flex items-center justify-center text-gris hover:text-encre"><ChevronUp className="w-4 h-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => deplacer(c.id, 1)} aria-label="↓" className="w-8 h-8 inline-flex items-center justify-center text-gris hover:text-encre"><ChevronDown className="w-4 h-4" aria-hidden="true" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Panneau titre={t.titre} actions={comptes && <Bouton petit onClick={enregistrer} disabled={busy}>{t.enregistrer}</Bouton>}>
        <p className="text-gris text-sm mesure mb-6">{t.sous}</p>
        <div className="space-y-8">
          <Groupe titre={t.revenu} comptes={grouper('revenu')} />
          <Groupe titre={t.depense} comptes={grouper('depense')} estDepense />
        </div>
      </Panneau>

      <Panneau titre={t.ajouter}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Champ label={t.nouveauNom} value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} className="sm:col-span-2" />
          <Champ label={t.nouveauCode} value={nouveauCode} onChange={(e) => setNouveauCode(e.target.value)} />
          <Selection label={t.sens} value={nouveauSens} onChange={(e) => setNouveauSens(e.target.value as Sens)}>
            <option value="depense">{t.depense}</option>
            <option value="revenu">{t.revenu}</option>
          </Selection>
        </div>
        <div className="mt-4"><Bouton variante="secondaire" icone={Plus} onClick={ajouter}>{t.ajouter}</Bouton></div>
      </Panneau>
    </div>
  );
};

export default PlanComptable;
