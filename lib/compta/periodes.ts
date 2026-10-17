// Découpage du temps comptable : exercice, trimestres, mois, à partir de la date de début d'exercice
// choisie dans les réglages (settings/compta). Fonctions pures, aucun accès Firestore ici.
import { useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, useDocument } from './ancrage';
import { REGLAGES_DEFAUT, type Periode, type ReglagesCompta, type RegleCategorisation } from './types';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function ajouterMois(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

function ajouterJours(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Les trois découpages de l'exercice qui commence en `annee` selon `reglages.exerciceDebut`. */
export function periodesDe(
  reglages: ReglagesCompta,
  annee: number
): { exercice: Periode; trimestres: Periode[]; mois: Periode[] } {
  const [mm, jj] = reglages.exerciceDebut.split('-').map(Number);
  const debutExercice = new Date(Date.UTC(annee, (mm || 1) - 1, jj || 1));
  const finExercice = ajouterJours(ajouterMois(debutExercice, 12), -1);

  const exercice: Periode = {
    debut: iso(debutExercice),
    fin: iso(finExercice),
    libelle: `Exercice ${annee}`,
  };

  const trimestres: Periode[] = Array.from({ length: 4 }, (_, t) => {
    const debut = ajouterMois(debutExercice, t * 3);
    const fin = ajouterJours(ajouterMois(debutExercice, (t + 1) * 3), -1);
    return { debut: iso(debut), fin: iso(fin), libelle: `T${t + 1} ${annee}` };
  });

  const mois: Periode[] = Array.from({ length: 12 }, (_, m) => {
    const debut = ajouterMois(debutExercice, m);
    const fin = ajouterJours(ajouterMois(debutExercice, m + 1), -1);
    return { debut: iso(debut), fin: iso(fin), libelle: `${MOIS_FR[debut.getUTCMonth()]} ${debut.getUTCFullYear()}` };
  });

  return { exercice, trimestres, mois };
}

/** L'exercice dans lequel tombe la date d'aujourd'hui. */
export function periodeCourante(reglages: ReglagesCompta): Periode {
  const aujourdhui = iso(new Date());
  const anneeCivile = new Date().getUTCFullYear();
  const { exercice } = periodesDe(reglages, anneeCivile);
  if (aujourdhui < exercice.debut) {
    return periodesDe(reglages, anneeCivile - 1).exercice;
  }
  return exercice;
}

export function dansPeriode(date: string, periode: Periode): boolean {
  return date >= periode.debut && date <= periode.fin;
}

// --- Réglages comptables et règles de catégorisation (settings/compta) ---

type ReglagesEtRegles = ReglagesCompta & { regles?: RegleCategorisation[] };

/** Les réglages de Laurie (fréquence de taxes, exercice, taux) avec les valeurs par défaut en secours. */
export function useReglagesCompta() {
  const { data, loading } = useDocument<ReglagesEtRegles>('settings/compta');
  const reglages = useMemo<ReglagesEtRegles>(() => ({ ...REGLAGES_DEFAUT, ...(data || {}) }), [data]);
  return { reglages, regles: reglages.regles || [], loading };
}

export async function enregistrerReglagesCompta(patch: Partial<ReglagesCompta>): Promise<void> {
  await setDoc(doc(db, 'settings/compta'), patch, { merge: true });
}

/** Ajoute (ou remplace) une règle de catégorisation apprise, dédoublonnée par motif. */
export async function apprendreRegle(regle: RegleCategorisation, reglesActuelles: RegleCategorisation[]): Promise<void> {
  const sansDoublon = reglesActuelles.filter((r) => r.motif !== regle.motif);
  await setDoc(doc(db, 'settings/compta'), { regles: [...sansDoublon, regle] }, { merge: true });
}

/** Retire une règle de catégorisation. */
export async function oublierRegle(motif: string, reglesActuelles: RegleCategorisation[]): Promise<void> {
  await setDoc(doc(db, 'settings/compta'), { regles: reglesActuelles.filter((r) => r.motif !== motif) }, { merge: true });
}
