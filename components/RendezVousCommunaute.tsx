// L'onglet Rendez-vous de la Communauté : la personne connectée choisit un créneau libre sur
// l'agenda de Caroline, suit l'état de sa demande, l'annule au besoin, et entre dans la salle
// vidéo à l'heure. Modèle de données et logique : lib/rendezvous.ts.
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { AlertCircle, ChevronLeft, ChevronRight, Download, Video } from 'lucide-react';
import { db } from '../firebase';
import { subscribeToOccupations, updateRendezVousStatut, deleteOccupation, subscribeToRendezVous } from '../lib/firestore';
import {
  cleJour,
  creneauxLibres,
  type Creneau,
  formatDate,
  formatHeure,
  icsRendezVous,
  joursDisponibles,
  nouveauRendezVous,
  rencontreOuverte,
  telechargerIcs,
  useAgendaConfig,
} from '../lib/rendezvous';
import EditableText from './EditableText';
import { useEditableString } from './EditableField';
import type { Occupation, RendezVous as RendezVousDoc, StatutRendezVous } from '../types';
import Rencontre from './Rencontre';

interface Props {
  user: User;
}

const LIBELLE_STATUT: Record<StatutRendezVous, { key: string; defaut: string }> = {
  demande: { key: 'rdv_statut_demande', defaut: 'En attente de confirmation' },
  confirme: { key: 'rdv_statut_confirme', defaut: 'Confirmé' },
  annule: { key: 'rdv_statut_annule', defaut: 'Annulé' },
  complete: { key: 'rdv_statut_complete', defaut: 'Terminé' },
};

const RendezVousCommunaute: React.FC<Props> = ({ user }) => {
  const config = useAgendaConfig();
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [tousLesRdv, setTousLesRdv] = useState<RendezVousDoc[]>([]);
  const [chargementRdv, setChargementRdv] = useState(true);

  useEffect(() => {
    const unsubs = [
      subscribeToOccupations(setOccupations),
      subscribeToRendezVous((items) => { setTousLesRdv(items); setChargementRdv(false); }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const mesRendezVous = useMemo(
    () => tousLesRdv.filter((r) => r.uid === user.uid).sort((a, b) => {
      const versMillis = (ts: any): number => ts?.toMillis ? ts.toMillis() : ts?.toDate ? ts.toDate().getTime() : new Date(ts).getTime() || 0;
      return versMillis(a.debut) - versMillis(b.debut);
    }),
    [tousLesRdv, user.uid]
  );

  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const [moisAffiche, setMoisAffiche] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [jourChoisi, setJourChoisi] = useState<Date | null>(null);
  const [creneauChoisi, setCreneauChoisi] = useState<Creneau | null>(null);
  const [note, setNote] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurDemande, setErreurDemande] = useState<string | null>(null);

  const [annulationArmee, setAnnulationArmee] = useState<string | null>(null);
  const [annulationEnCours, setAnnulationEnCours] = useState<string | null>(null);
  const [erreurAnnulation, setErreurAnnulation] = useState<string | null>(null);

  const [salleActive, setSalleActive] = useState<{ salle: string; nom: string } | null>(null);

  const placeholderNote = useEditableString('rdv_note_placeholder', 'Ce que tu veux aborder');
  const errDemande = useEditableString('rdv_err_demande', "La demande a échoué. Réessaie dans un instant.");
  const errAnnulation = useEditableString('rdv_err_annulation', "L'annulation a échoué. Réessaie dans un instant.");

  const nomPersonne = user.displayName ?? user.email ?? '';
  const courrielPersonne = user.email ?? '';

  const joursLibres = useMemo(() => new Set(joursDisponibles(config, occupations, maintenant)), [config, occupations, maintenant]);

  const semaine = useMemo(() => {
    const premier = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
    const dernier = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0);
    const decalage = (premier.getDay() + 6) % 7; // lundi en tête
    const cellules: (Date | null)[] = [];
    for (let i = 0; i < decalage; i++) cellules.push(null);
    for (let jour = 1; jour <= dernier.getDate(); jour++) cellules.push(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), jour));
    return cellules;
  }, [moisAffiche]);

  const auMoinsUnJourDispoDansMois = semaine.some((j) => j && joursLibres.has(cleJour(j)));

  const creneauxDuJour = useMemo(
    () => (jourChoisi ? creneauxLibres(config, jourChoisi, occupations, maintenant) : []),
    [config, jourChoisi, occupations, maintenant]
  );

  const clePassee = cleJour(maintenant);
  const nomMois = moisAffiche.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  const premierMoisPossible = maintenant.getFullYear() === moisAffiche.getFullYear() && maintenant.getMonth() === moisAffiche.getMonth();

  const demander = async () => {
    if (!creneauChoisi || envoiEnCours) return;
    setEnvoiEnCours(true);
    setErreurDemande(null);
    try {
      const ref = doc(collection(db, 'rendezvous'));
      const { rdv, occupation } = nouveauRendezVous(ref.id, user.uid, nomPersonne, courrielPersonne, creneauChoisi, config.duree, note);
      const batch = writeBatch(db);
      batch.set(ref, rdv);
      batch.set(doc(db, 'occupations', ref.id), occupation);
      await batch.commit();
      setJourChoisi(null);
      setCreneauChoisi(null);
      setNote('');
    } catch {
      setErreurDemande(errDemande);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const annuler = async (id: string) => {
    setAnnulationEnCours(id);
    setErreurAnnulation(null);
    try {
      await updateRendezVousStatut(id, 'annule');
      await deleteOccupation(id).catch(() => null);
      setAnnulationArmee(null);
    } catch {
      setErreurAnnulation(errAnnulation);
    } finally {
      setAnnulationEnCours(null);
    }
  };

  if (salleActive) {
    return <Rencontre salle={salleActive.salle} nom={nomPersonne} onQuitter={() => setSalleActive(null)} />;
  }

  return (
    <div className="space-y-10">
      {mesRendezVous.length === 0 && !chargementRdv && (
        <p className="text-sm text-white bg-gold/10 border border-gold/20 rounded-xl px-4 py-3 max-w-2xl">
          <EditableText
            tag="span"
            contentKey="rdv_decouverte"
            defaultValue={`Une première rencontre vidéo de ${config.duree} minutes avec Caroline, pour discuter de ton projet.`}
          />
        </p>
      )}

      {/* Calendrier */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1))}
            disabled={premierMoisPossible}
            aria-label="Mois précédent"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="font-bold text-white capitalize">{nomMois}</p>
          <button
            type="button"
            onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1))}
            aria-label="Mois suivant"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((j) => (
            <p key={j} className="text-slate-500 text-xs uppercase tracking-wider text-center py-1">{j}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {semaine.map((jour, i) => {
            if (!jour) return <div key={`vide-${i}`} />;
            const cle = cleJour(jour);
            const passe = cle < clePassee;
            const dispo = joursLibres.has(cle);
            const choisi = jourChoisi ? cleJour(jourChoisi) === cle : false;
            return (
              <button
                key={cle}
                type="button"
                disabled={passe || !dispo}
                aria-pressed={choisi}
                onClick={() => { setJourChoisi(jour); setCreneauChoisi(null); }}
                className={`min-h-[40px] rounded-lg text-sm font-bold transition-colors ${
                  passe || !dispo
                    ? 'text-slate-700 cursor-default'
                    : choisi
                    ? 'bg-gold text-midnight'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {jour.getDate()}
              </button>
            );
          })}
        </div>

        {!auMoinsUnJourDispoDansMois && (
          <p className="text-slate-500 text-sm mt-4">
            <EditableText tag="span" contentKey="rdv_aucun_creneau_mois" defaultValue="Aucun créneau ce mois-ci." />
          </p>
        )}

        {jourChoisi && creneauxDuJour.length > 0 && (
          <div className="mt-6">
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">
              <EditableText tag="span" contentKey="rdv_creneaux_titre" defaultValue="Créneaux disponibles" />
            </p>
            <div className="flex flex-wrap gap-2">
              {creneauxDuJour.map((c) => {
                const choisi = creneauChoisi && creneauChoisi.debut.getTime() === c.debut.getTime();
                return (
                  <button
                    key={c.debut.toISOString()}
                    type="button"
                    onClick={() => setCreneauChoisi(c)}
                    aria-pressed={!!choisi}
                    className={`px-4 py-2.5 rounded-full text-sm font-bold border transition-colors ${
                      choisi ? 'bg-gold text-midnight border-gold' : 'border-white/10 text-white hover:border-gold/50'
                    }`}
                  >
                    {formatHeure(c.debut)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {creneauChoisi && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 space-y-4">
            <div>
              <p className="font-bold text-white">{formatDate(creneauChoisi.debut)}</p>
              <p className="text-slate-400 text-sm mt-1">{formatHeure(creneauChoisi.debut)} · {config.duree} minutes</p>
            </div>
            <label className="block">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <EditableText tag="span" contentKey="rdv_note_label" defaultValue="Ce que tu veux aborder" />
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                maxLength={1000}
                placeholder={placeholderNote}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors focus:border-gold min-h-[7rem] resize-y"
              />
            </label>
            {erreurDemande && (
              <div role="alert" className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {erreurDemande}
              </div>
            )}
            <button
              type="button"
              onClick={demander}
              disabled={envoiEnCours}
              className="px-5 py-3 rounded-full bg-gold text-midnight hover:bg-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {envoiEnCours
                ? <EditableText tag="span" contentKey="rdv_envoi_en_cours" defaultValue="Envoi…" />
                : <EditableText tag="span" contentKey="rdv_demander_btn" defaultValue="Demander ce moment" />}
            </button>
          </div>
        )}
      </div>

      {/* Liste des rendez-vous */}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wider mb-4">
          <EditableText tag="span" contentKey="rdv_tes_rendez_vous" defaultValue="Tes rendez-vous" />
        </p>
        {chargementRdv ? (
          <div className="py-10 flex justify-center" role="status" aria-live="polite">
            <span className="w-6 h-6 rounded-full border-2 border-white/10 border-t-gold animate-spin" />
          </div>
        ) : mesRendezVous.length === 0 ? (
          <p className="text-slate-500 text-sm py-6">
            <EditableText tag="span" contentKey="rdv_vide_titre" defaultValue="Tu n'as pas encore de rendez-vous." />
          </p>
        ) : (
          <ul className="space-y-3">
            {mesRendezVous.map((rdv) => {
              const peutAnnuler = rdv.statut === 'demande' || rdv.statut === 'confirme';
              const arme = annulationArmee === rdv.id;
              const enCours = annulationEnCours === rdv.id;
              const rejoindre = rencontreOuverte(rdv, maintenant);
              return (
                <li key={rdv.id} className="border border-white/10 rounded-xl p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{formatDate(rdv.debut)}</p>
                      <p className="text-slate-400 text-sm mt-0.5">{formatHeure(rdv.debut)}</p>
                      {rdv.note && <p className="text-slate-300 text-sm mt-2 whitespace-pre-line">{rdv.note}</p>}
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0 ${rdv.statut === 'confirme' ? 'bg-gold/20 text-gold' : 'border border-white/10 text-slate-400'}`}>
                      <EditableText tag="span" contentKey={LIBELLE_STATUT[rdv.statut].key} defaultValue={LIBELLE_STATUT[rdv.statut].defaut} />
                    </span>
                  </div>

                  {arme && erreurAnnulation && (
                    <div role="alert" className="flex items-center gap-2 text-sm text-red-400 mt-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {erreurAnnulation}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {rejoindre && (
                      <button
                        type="button"
                        onClick={() => setSalleActive({ salle: rdv.salle, nom: nomPersonne })}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-midnight hover:bg-white text-sm font-bold transition-colors"
                      >
                        <Video className="w-4 h-4" aria-hidden="true" />
                        <EditableText tag="span" contentKey="rdv_rejoindre" defaultValue="Rejoindre la rencontre" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => telechargerIcs('rendez-vous.ics', icsRendezVous(rdv))}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white hover:border-gold/50 text-sm font-bold transition-colors"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <EditableText tag="span" contentKey="rdv_ajouter_calendrier" defaultValue="Ajouter à mon calendrier" />
                    </button>
                    {peutAnnuler && !arme && (
                      <button
                        type="button"
                        onClick={() => { setErreurAnnulation(null); setAnnulationArmee(rdv.id); }}
                        className="px-5 py-2.5 rounded-full text-slate-400 hover:text-red-400 text-sm font-bold transition-colors"
                      >
                        <EditableText tag="span" contentKey="rdv_annuler" defaultValue="Annuler" />
                      </button>
                    )}
                    {peutAnnuler && arme && (
                      <>
                        <button
                          type="button"
                          onClick={() => annuler(rdv.id)}
                          disabled={enCours}
                          className="px-5 py-2.5 rounded-full border border-red-500/30 text-red-400 hover:border-red-500 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {enCours
                            ? <EditableText tag="span" contentKey="rdv_annulation_en_cours" defaultValue="Annulation…" />
                            : <EditableText tag="span" contentKey="rdv_annuler_confirmer" defaultValue="Confirmer l'annulation" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setErreurAnnulation(null); setAnnulationArmee(null); }}
                          disabled={enCours}
                          className="px-5 py-2.5 rounded-full text-slate-400 hover:text-white text-sm font-bold transition-colors"
                        >
                          <EditableText tag="span" contentKey="rdv_annuler_non" defaultValue="Garder le rendez-vous" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RendezVousCommunaute;
