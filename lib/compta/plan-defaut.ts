// Le plan comptable actif et ses outils. Le plan de départ vient de plan-metier.ts, posé au portage
// selon le métier du site (_vexel-base/modules/compta, porter.py --metier).
import { useMemo } from 'react';
import { useDocument, writeDoc } from './ancrage';
import type { Compte } from './types';
import { PLAN_COMPTABLE_DEFAUT } from './plan-metier';

export { PLAN_COMPTABLE_DEFAUT };

export function compteParId(comptes: Compte[], id: string): Compte | undefined {
  return comptes.find((c) => c.id === id);
}

export function nomCompte(compte: Compte | undefined, lang: 'FR' | 'EN'): string {
  if (!compte) return lang === 'FR' ? 'Sans catégorie' : 'Uncategorized';
  return lang === 'FR' ? compte.nom : compte.nomEn;
}

/** Le plan comptable actif : la surcharge de Laurie (settings/plan_comptable) si elle existe, sinon le plan par défaut. */
export function usePlanComptable() {
  const { data, loading } = useDocument<{ comptes: Compte[] }>('settings/plan_comptable');
  const comptes = useMemo(() => {
    if (data?.comptes?.length) return [...data.comptes].sort((a, b) => a.ordre - b.ordre);
    return PLAN_COMPTABLE_DEFAUT;
  }, [data]);
  return { comptes, loading };
}

/** Enregistre le plan comptable complet (ajout, renommage, désactivation, réordonnancement). */
export async function enregistrerPlanComptable(comptes: Compte[]): Promise<void> {
  await writeDoc('settings/plan_comptable', { comptes });
}
