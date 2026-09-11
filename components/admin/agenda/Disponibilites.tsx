// Panneau « Mes disponibilités » de l'onglet Agenda (voir pages/Admin/AdminAgenda.tsx). Édite
// settings/agenda : plages hebdomadaires, durée/tampon/délai/horizon, exceptions par date.
// Lecture par useAgendaConfig(), écriture par setDoc en merge. Suit le canon de l'Espace Auteure.
import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../../../firebase';
import { useAgendaConfig } from '../../../lib/rendezvous';
import type { AgendaConfig, PlageHoraire } from '../../../types';

type JourKey = keyof AgendaConfig['jours'];
const JOURS_ORDRE: JourKey[] = ['1', '2', '3', '4', '5', '6', '0'];
const NOMS_JOURS: Record<JourKey, string> = {
  '0': 'Dimanche', '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi', '4': 'Jeudi', '5': 'Vendredi', '6': 'Samedi',
};

const CHAMP_PETIT =
  'flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none transition-colors focus:border-gold';

const Disponibilites: React.FC = () => {
  const config = useAgendaConfig();

  const [jours, setJours] = useState<AgendaConfig['jours']>(config.jours);
  const [duree, setDuree] = useState(config.duree);
  const [tampon, setTampon] = useState(config.tampon);
  const [delaiMinHeures, setDelaiMinHeures] = useState(config.delaiMinHeures);
  const [horizonJours, setHorizonJours] = useState(config.horizonJours);
  const [exceptions, setExceptions] = useState<Record<string, PlageHoraire[]>>(config.exceptions ?? {});
  const [dateException, setDateException] = useState('');
  const [modifie, setModifie] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [enregistre, setEnregistre] = useState(false);

  // Suit Firestore tant que Caroline n'a pas commencé à éditer; s'arrête dès la première
  // modification locale pour ne jamais écraser une saisie en cours.
  useEffect(() => {
    if (modifie) return;
    setJours(config.jours);
    setDuree(config.duree);
    setTampon(config.tampon);
    setDelaiMinHeures(config.delaiMinHeures);
    setHorizonJours(config.horizonJours);
    setExceptions(config.exceptions ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, modifie]);

  const majPlage = (jour: JourKey, i: number, champ: keyof PlageHoraire, valeur: string) => {
    setJours((j) => ({ ...j, [jour]: j[jour].map((p, idx) => (idx === i ? { ...p, [champ]: valeur } : p)) }));
    setModifie(true);
  };
  const ajouterPlage = (jour: JourKey) => {
    setJours((j) => ({ ...j, [jour]: [...j[jour], { de: '09:00', a: '17:00' }] }));
    setModifie(true);
  };
  const retirerPlage = (jour: JourKey, i: number) => {
    setJours((j) => ({ ...j, [jour]: j[jour].filter((_, idx) => idx !== i) }));
    setModifie(true);
  };

  const ajouterException = () => {
    if (!dateException || exceptions[dateException]) return;
    setExceptions((ex) => ({ ...ex, [dateException]: [] }));
    setDateException('');
    setModifie(true);
  };
  const retirerException = (cle: string) => {
    setExceptions((ex) => {
      const suivant = { ...ex };
      delete suivant[cle];
      return suivant;
    });
    setModifie(true);
  };
  const majPlageException = (cle: string, i: number, champ: keyof PlageHoraire, valeur: string) => {
    setExceptions((ex) => ({ ...ex, [cle]: ex[cle].map((p, idx) => (idx === i ? { ...p, [champ]: valeur } : p)) }));
    setModifie(true);
  };
  const ajouterPlageException = (cle: string) => {
    setExceptions((ex) => ({ ...ex, [cle]: [...ex[cle], { de: '09:00', a: '17:00' }] }));
    setModifie(true);
  };
  const retirerPlageException = (cle: string, i: number) => {
    setExceptions((ex) => ({ ...ex, [cle]: ex[cle].filter((_, idx) => idx !== i) }));
    setModifie(true);
  };

  const enregistrer = async () => {
    if (enregistrement) return;
    setEnregistrement(true);
    try {
      await setDoc(
        doc(db, 'settings', 'agenda'),
        { duree, tampon, delaiMinHeures, horizonJours, fuseau: config.fuseau, jours, exceptions },
        { merge: true }
      );
      setModifie(false);
      setEnregistre(true);
      window.setTimeout(() => setEnregistre(false), 2500);
    } catch {
      // modifie reste vrai : le bouton reste actif pour réessayer
    } finally {
      setEnregistrement(false);
    }
  };

  const rangeePlage = (p: PlageHoraire, onDe: (v: string) => void, onA: (v: string) => void, onRetirer: () => void, cle: string) => (
    <div key={cle} className="flex items-center gap-2 min-w-0">
      <input type="time" value={p.de} onChange={(e) => onDe(e.target.value)} aria-label="De" className={CHAMP_PETIT} />
      <span className="text-slate-400 text-sm">à</span>
      <input type="time" value={p.a} onChange={(e) => onA(e.target.value)} aria-label="À" className={CHAMP_PETIT} />
      <button
        type="button"
        onClick={onRetirer}
        aria-label="Retirer la plage"
        className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-8 space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white">Mes disponibilités</h3>
        <p className="text-slate-400 text-sm mt-1">
          Les plages où ta clientèle peut réserver, et les exceptions à ton horaire habituel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {JOURS_ORDRE.map((jour) => (
          <div key={jour} className="min-w-0 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-white text-sm">{NOMS_JOURS[jour]}</p>
              <button
                type="button"
                onClick={() => ajouterPlage(jour)}
                aria-label="Ajouter une plage"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {jours[jour].length === 0 ? (
              <p className="text-slate-500 text-sm">Fermé</p>
            ) : (
              <div className="space-y-2">
                {jours[jour].map((p, i) =>
                  rangeePlage(
                    p,
                    (v) => majPlage(jour, i, 'de', v),
                    (v) => majPlage(jour, i, 'a', v),
                    () => retirerPlage(jour, i),
                    `${jour}-${i}`
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Durée d'une rencontre (minutes)</span>
          <input
            type="number" min={5} step={5} value={duree}
            onChange={(e) => { setDuree(Number(e.target.value)); setModifie(true); }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Tampon entre deux rencontres (minutes)</span>
          <input
            type="number" min={0} step={5} value={tampon}
            onChange={(e) => { setTampon(Number(e.target.value)); setModifie(true); }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Délai minimal avant un rendez-vous (heures)</span>
          <input
            type="number" min={0} value={delaiMinHeures}
            onChange={(e) => { setDelaiMinHeures(Number(e.target.value)); setModifie(true); }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Horizon de réservation (jours)</span>
          <input
            type="number" min={1} value={horizonJours}
            onChange={(e) => { setHorizonJours(Number(e.target.value)); setModifie(true); }}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
          />
        </label>
      </div>

      <div className="border border-white/10 rounded-xl p-4 space-y-4">
        <p className="font-bold text-white text-sm">Exceptions</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[10rem]">
            <span className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Date de l'exception</span>
            <input
              type="date" value={dateException} onChange={(e) => setDateException(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors"
            />
          </label>
          <button
            type="button" onClick={ajouterException} disabled={!dateException}
            className="flex items-center gap-2 px-4 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Ajouter l'exception
          </button>
        </div>
        {Object.keys(exceptions).length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune exception pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(exceptions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cle, plages]: [string, PlageHoraire[]]) => (
                <div key={cle} className="border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-white">{cle}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button" onClick={() => ajouterPlageException(cle)} aria-label="Ajouter une plage"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button" onClick={() => retirerException(cle)} aria-label="Retirer l'exception"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {plages.length === 0 ? (
                    <p className="text-slate-500 text-sm">Fermé</p>
                  ) : (
                    <div className="space-y-2">
                      {plages.map((p, i) =>
                        rangeePlage(
                          p,
                          (v) => majPlageException(cle, i, 'de', v),
                          (v) => majPlageException(cle, i, 'a', v),
                          () => retirerPlageException(cle, i),
                          `${cle}-${i}`
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button" onClick={enregistrer} disabled={!modifie || enregistrement}
          className="flex items-center gap-2 bg-gold text-midnight px-4 py-2 rounded-lg font-bold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={16} /> {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {enregistre && <span className="text-gold text-sm font-bold">Enregistré</span>}
      </div>
    </div>
  );
};

export default Disponibilites;
