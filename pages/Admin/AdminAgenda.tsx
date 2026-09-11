// L'agenda de Caroline dans le back-office : demandes, rendez-vous confirmés, journées demandées
// pour une conférence, et ses disponibilités. Modèle de données et logique : lib/rendezvous.ts.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check, CheckCircle2, Download, Video, X } from 'lucide-react';
import {
  subscribeToRendezVous,
  subscribeToOccupations,
  subscribeToLeads,
  updateRendezVousStatut,
  deleteOccupation,
  bloquerJournee,
} from '../../lib/firestore';
import { formatDate, formatHeure, icsRendezVous, rencontreOuverte, telechargerIcs, useAgendaConfig } from '../../lib/rendezvous';
import Rencontre from '../../components/Rencontre';
import Disponibilites from '../../components/admin/agenda/Disponibilites';
import type { Lead, Occupation, RendezVous, StatutRendezVous } from '../../types';

type Onglet = 'demande' | 'venir' | 'passes' | 'annule';

const versMillis = (ts: any): number =>
  ts?.toMillis ? ts.toMillis() : ts?.toDate ? ts.toDate().getTime() : ts instanceof Date ? ts.getTime() : new Date(ts).getTime() || 0;

const LIBELLE_STATUT: Record<StatutRendezVous, string> = {
  demande: 'En attente de confirmation',
  confirme: 'Confirmé',
  annule: 'Annulé',
  complete: 'Terminé',
};

const LigneRendezVous: React.FC<{ rdv: RendezVous; maintenant: Date; onRejoindre: () => void }> = ({ rdv, maintenant, onRejoindre }) => {
  const [note, setNote] = useState(rdv.noteAdmin ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setNote(rdv.noteAdmin ?? ''), [rdv.noteAdmin]);

  const agir = async (cle: string, statut: StatutRendezVous) => {
    setBusy(cle);
    try {
      await updateRendezVousStatut(rdv.id, statut);
      if (cle === 'annuler') await deleteOccupation(rdv.id).catch(() => null);
    } finally {
      setBusy(null);
    }
  };

  const enregistrerNote = () => {
    if (note === (rdv.noteAdmin ?? '')) return;
    updateRendezVousStatut(rdv.id, rdv.statut, note).catch(() => null);
  };

  const rejoignable = rencontreOuverte(rdv, maintenant);
  const peutAnnuler = rdv.statut === 'demande' || rdv.statut === 'confirme';

  return (
    <li className="border border-white/10 rounded-xl p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-white">{rdv.nom}</p>
          <a href={`mailto:${rdv.courriel}`} className="text-gold text-sm hover:underline break-all">{rdv.courriel}</a>
          <p className="text-slate-400 text-sm mt-1">
            {formatDate(rdv.debut)} · {formatHeure(rdv.debut)} · {rdv.duree} minutes
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${rdv.statut === 'confirme' ? 'bg-gold/20 text-gold' : 'bg-white/10 text-slate-300'}`}>
          {LIBELLE_STATUT[rdv.statut]}
        </span>
      </div>

      {rdv.note && <p className="text-slate-300 text-sm whitespace-pre-line">{rdv.note}</p>}

      <label className="block">
        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ta note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={enregistrerNote}
          rows={2}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        {rejoignable && (
          <button onClick={onRejoindre} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-bold text-sm hover:bg-white transition-colors">
            <Video size={16} /> Rejoindre la rencontre
          </button>
        )}
        {rdv.statut === 'demande' && (
          <button onClick={() => agir('confirmer', 'confirme')} disabled={busy === 'confirmer'} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-40">
            <Check size={16} /> Confirmer
          </button>
        )}
        {rdv.statut === 'confirme' && (
          <button onClick={() => agir('terminer', 'complete')} disabled={busy === 'terminer'} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-40">
            <CheckCircle2 size={16} /> Terminé
          </button>
        )}
        {peutAnnuler && (
          <button onClick={() => agir('annuler', 'annule')} disabled={busy === 'annuler'} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-40">
            <X size={16} /> Annuler
          </button>
        )}
        {rdv.statut !== 'annule' && (
          <button onClick={() => telechargerIcs('rendez-vous.ics', icsRendezVous(rdv))} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white rounded-lg font-bold text-sm transition-colors">
            <Download size={16} /> Ajouter à mon calendrier
          </button>
        )}
      </div>
    </li>
  );
};

const AdminAgenda: React.FC = () => {
  const config = useAgendaConfig();
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [onglet, setOnglet] = useState<Onglet>('demande');
  const [salleActive, setSalleActive] = useState<{ salle: string; nom: string } | null>(null);
  const [blocageEnCours, setBlocageEnCours] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      subscribeToRendezVous((items) => setRdvs(items.slice().sort((a, b) => versMillis(a.debut) - versMillis(b.debut)))),
      subscribeToOccupations(setOccupations),
      subscribeToLeads(setLeads),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const aConfirmerListe = useMemo(() => rdvs.filter((r) => r.statut === 'demande'), [rdvs]);
  const cetteSemaine = useMemo(() => {
    const dansSeptJours = maintenant.getTime() + 7 * 86400000;
    return rdvs.filter((r) => r.statut === 'confirme' && versMillis(r.debut) >= maintenant.getTime() && versMillis(r.debut) <= dansSeptJours).length;
  }, [rdvs, maintenant]);

  const listeOnglet = useMemo(() => {
    switch (onglet) {
      case 'demande': return aConfirmerListe;
      case 'annule': return rdvs.filter((r) => r.statut === 'annule');
      case 'passes': return rdvs.filter((r) => r.statut === 'complete' || (r.statut === 'confirme' && versMillis(r.fin) < maintenant.getTime()));
      case 'venir':
      default: return rdvs.filter((r) => r.statut === 'confirme' && versMillis(r.fin) >= maintenant.getTime());
    }
  }, [rdvs, onglet, aConfirmerListe, maintenant]);

  // Journées demandées : les leads de conférence qui portent une date souhaitée, distincts des
  // rendez-vous vidéo. Une journée déjà bloquée sur l'agenda le montre.
  const journeesDemandees = useMemo(
    () => leads.filter((l) => (l.source ?? '').startsWith('Intervention') && l.dateSouhaitee && !l.archived),
    [leads]
  );
  const journeesBloquees = useMemo(() => new Set(occupations.filter((o) => o.id.startsWith('bloc-')).map((o) => o.id)), [occupations]);

  const bloquer = async (jour: string) => {
    setBlocageEnCours(jour);
    try { await bloquerJournee(jour); } finally { setBlocageEnCours(null); }
  };

  const ONGLETS: { id: Onglet; label: string }[] = [
    { id: 'demande', label: 'À confirmer' },
    { id: 'venir', label: 'À venir' },
    { id: 'passes', label: 'Passés' },
    { id: 'annule', label: 'Annulés' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white">Agenda</h1>
        <p className="text-slate-400 mt-1">Les demandes de rencontre, tes rendez-vous confirmés et tes disponibilités, au même endroit.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="font-serif text-4xl text-white">{aConfirmerListe.length}</div>
          <p className="text-slate-400 text-sm mt-1">À confirmer</p>
        </div>
        <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="font-serif text-4xl text-white">{cetteSemaine}</div>
          <p className="text-slate-400 text-sm mt-1">Cette semaine</p>
        </div>
      </div>

      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6">Rendez-vous</h3>

        {salleActive && (
          <div className="mb-6">
            <Rencontre salle={salleActive.salle} nom={salleActive.nom} onQuitter={() => setSalleActive(null)} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2 mb-6">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnglet(o.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${onglet === o.id ? 'bg-gold text-midnight' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {o.label}
              {o.id === 'demande' && aConfirmerListe.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{aConfirmerListe.length}</span>
              )}
            </button>
          ))}
        </div>

        {listeOnglet.length === 0 ? (
          <p className="text-slate-500 text-center py-10">Aucun rendez-vous ici.</p>
        ) : (
          <ul className="space-y-4">
            {listeOnglet.map((rdv) => (
              <LigneRendezVous
                key={rdv.id}
                rdv={rdv}
                maintenant={maintenant}
                onRejoindre={() => setSalleActive({ salle: rdv.salle, nom: 'Caroline Gérard' })}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="bg-midnight/60 backdrop-blur-md rounded-xl border border-white/10 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-gold" size={20} />
          <h3 className="text-xl font-bold text-white">Journées demandées pour une conférence</h3>
        </div>
        {journeesDemandees.length === 0 ? (
          <p className="text-slate-500 text-center py-6">Aucune date souhaitée pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {journeesDemandees.map((lead) => {
              const jour = lead.dateSouhaitee as string;
              const dejaBloquee = journeesBloquees.has(`bloc-${jour}`);
              return (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 rounded-xl p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{jour}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{lead.source} · {lead.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/admin/communaute?lead=${lead.id}`}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors"
                    >
                      Voir la demande
                    </Link>
                    <button
                      type="button"
                      onClick={() => bloquer(jour)}
                      disabled={dejaBloquee || blocageEnCours === jour}
                      className="px-4 py-2 bg-gold text-midnight rounded-lg font-bold text-sm hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {dejaBloquee ? 'Journée bloquée' : blocageEnCours === jour ? 'Blocage…' : 'Bloquer la journée'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Disponibilites />
    </div>
  );
};

export default AdminAgenda;
