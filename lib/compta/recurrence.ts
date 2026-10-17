// Dépenses récurrentes : une transaction modèle (sens depense, champ `recurrence`) crée les dépenses dues
// à l'ouverture de Finances. Le calcul est pur (calculerRecurrences) et l'écriture Firestore est à part
// (genererDepensesRecurrentes). Idempotent : l'identifiant d'une dépense générée est rec_<modèle>_<date>
// et la date s'ajoute à `generees`, donc deux onglets ouverts en même temps n'écrivent qu'une fois.
import { useEffect, useRef, useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { writeDoc, patchDoc } from './ancrage';
import type { Recurrence, Transaction } from './types';

type Donnees = Omit<Transaction, 'id' | 'cree' | 'modifie'>;
export interface Generee { id: string; data: Donnees }
export interface MiseAJour { id: string; recurrence: Recurrence }

const MAX_PAR_MODELE = 400;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** La date suivante d'une période. Un jour absent du mois d'arrivée se replie sur la fin du mois. */
export function dateSuivante(date: string, frequence: Recurrence['frequence']): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (frequence === 'hebdomadaire') return iso(new Date(d.getTime() + 7 * 86400000));
  const mois = d.getUTCMonth() + (frequence === 'mensuelle' ? 1 : 12);
  const dernier = new Date(Date.UTC(d.getUTCFullYear(), mois + 1, 0)).getUTCDate();
  // ponytail: le jour peut glisser (31 janvier, 28 février, 28 mars); ancrer le jour si Laurie le demande.
  return iso(new Date(Date.UTC(d.getUTCFullYear(), mois, Math.min(d.getUTCDate(), dernier))));
}

/** Les dépenses dues à `aujourdhui` (AAAA-MM-JJ) et les modèles à mettre à jour. Aucun accès Firestore. */
export function calculerRecurrences(transactions: Transaction[], aujourdhui: string): { nouvelles: Generee[]; modeles: MiseAJour[] } {
  const nouvelles: Generee[] = [];
  const modeles: MiseAJour[] = [];
  for (const m of transactions) {
    const r = m.recurrence;
    if (!r || !r.actif || m.sens !== 'depense' || !r.prochaine) continue;
    let prochaine = r.prochaine;
    const generees = [...(r.generees || [])];
    let actif = true;
    let n = 0;
    while (prochaine <= aujourdhui && (!r.fin || prochaine <= r.fin) && n++ < MAX_PAR_MODELE) {
      if (!generees.includes(prochaine)) {
        const { id: _i, cree: _c, modifie: _m, recurrence: _r, refactureeDans: _f, recu: _u, ...base } = m;
        nouvelles.push({ id: `rec_${m.id}_${prochaine}`, data: { ...base, date: prochaine, source: 'manuel', concilie: false } });
        generees.push(prochaine);
      }
      prochaine = dateSuivante(prochaine, r.frequence);
    }
    if (r.fin && prochaine > r.fin) actif = false;
    if (prochaine !== r.prochaine || actif !== r.actif) modeles.push({ id: m.id, recurrence: { ...r, prochaine, actif, generees } });
  }
  return { nouvelles, modeles };
}

const sansIndefini = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o));

/** Écrit les dépenses dues, puis fait avancer les modèles. Rend le nombre de dépenses ajoutées. */
export async function genererDepensesRecurrentes(transactions: Transaction[], aujourdhui = iso(new Date())): Promise<number> {
  const { nouvelles, modeles } = calculerRecurrences(transactions, aujourdhui);
  for (const n of nouvelles) await writeDoc('transactions', n.id, { ...sansIndefini(n.data), cree: serverTimestamp(), modifie: serverTimestamp() });
  for (const m of modeles) await patchDoc('transactions', m.id, { recurrence: m.recurrence, modifie: serverTimestamp() });
  return nouvelles.length;
}

/** Lance la génération une fois par ouverture de Finances, dès que le grand livre est chargé. Rend le nombre ajouté. */
export function useDepensesRecurrentes(transactions: Transaction[], pret: boolean): number {
  const fait = useRef(false);
  const [ajoutees, setAjoutees] = useState(0);
  useEffect(() => {
    if (!pret || fait.current || import.meta.env.MODE === 'verif') return;
    fait.current = true;
    genererDepensesRecurrentes(transactions).then(setAjoutees).catch(() => { fait.current = false; });
  }, [pret, transactions]);
  return ajoutees;
}
