/**
 * L'agenda de rendez-vous de Caroline, porté du même contrat que celui de Laurie Belhumeur
 * (Xena Horizon) : les disponibilités vivent dans `settings/agenda`, chaque rendez-vous dans
 * `rendezvous/{id}`, et un miroir sans donnée personnelle dans `occupations/{id}` pour que
 * toute personne connectée voie les créneaux déjà pris. La rencontre se tient dans une salle
 * vidéo Jitsi Meet nommée d'après l'id : aucune clé d'API, aucun serveur.
 */
import { useMemo } from 'react';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { onSnapshot, doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import type { AgendaConfig, Occupation, PlageHoraire, RendezVous } from '../types';

export const AGENDA_PATH = 'settings/agenda';

export const AGENDA_PAR_DEFAUT: AgendaConfig = {
  duree: 45,
  tampon: 15,
  delaiMinHeures: 24,
  horizonJours: 42,
  fuseau: 'America/Toronto',
  jours: {
    '0': [],
    '1': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
    '2': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
    '3': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
    '4': [{ de: '09:00', a: '12:00' }, { de: '13:00', a: '17:00' }],
    '5': [{ de: '09:00', a: '12:00' }],
    '6': [],
  },
  exceptions: {},
};

/** Suit settings/agenda en direct, fusionné avec les valeurs par défaut. */
export function useAgendaConfig(): AgendaConfig {
  const [data, setData] = useState<Partial<AgendaConfig> | null>(null);
  useEffect(() => onSnapshot(doc(db, AGENDA_PATH), (snap) => {
    setData(snap.exists() ? (snap.data() as Partial<AgendaConfig>) : null);
  }), []);
  return useMemo(
    () => ({ ...AGENDA_PAR_DEFAUT, ...(data ?? {}), jours: { ...AGENDA_PAR_DEFAUT.jours, ...(data?.jours ?? {}) } }),
    [data]
  );
}

/** 'AAAA-MM-JJ' en heure locale du navigateur. */
export const cleJour = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

const versDate = (v: any): Date => (v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v));

export interface Creneau {
  debut: Date;
  fin: Date;
}

/** Les plages d'un jour donné : l'exception du jour prime sur l'horaire hebdomadaire. */
export function plagesDuJour(config: AgendaConfig, jour: Date): PlageHoraire[] {
  const exception = config.exceptions?.[cleJour(jour)];
  if (exception) return exception;
  return config.jours[String(jour.getDay()) as keyof AgendaConfig['jours']] ?? [];
}

/**
 * Les créneaux libres d'un jour : les plages découpées à `duree + tampon`, moins les créneaux déjà pris,
 * moins ce qui tombe avant le délai minimal.
 */
export function creneauxLibres(config: AgendaConfig, jour: Date, occupations: Pick<Occupation, 'debut' | 'fin'>[], maintenant = new Date()): Creneau[] {
  const pas = config.duree + config.tampon;
  const limite = new Date(maintenant.getTime() + config.delaiMinHeures * 3600 * 1000);
  const horizon = new Date(maintenant.getTime() + config.horizonJours * 86400 * 1000);
  const pris = occupations.map((o) => ({ debut: versDate(o.debut).getTime(), fin: versDate(o.fin).getTime() }));
  const out: Creneau[] = [];
  for (const plage of plagesDuJour(config, jour)) {
    for (let m = minutes(plage.de); m + config.duree <= minutes(plage.a); m += pas) {
      const debut = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), Math.floor(m / 60), m % 60);
      const fin = new Date(debut.getTime() + config.duree * 60000);
      if (debut < limite || debut > horizon) continue;
      const chevauche = pris.some((p) => debut.getTime() < p.fin + config.tampon * 60000 && fin.getTime() > p.debut - config.tampon * 60000);
      if (!chevauche) out.push({ debut, fin });
    }
  }
  return out;
}

/** Les jours qui ont au moins un créneau libre, sur l'horizon. */
export function joursDisponibles(config: AgendaConfig, occupations: Pick<Occupation, 'debut' | 'fin'>[], maintenant = new Date()): string[] {
  const jours: string[] = [];
  for (let i = 0; i <= config.horizonJours; i++) {
    const j = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
    if (creneauxLibres(config, j, occupations, maintenant).length > 0) jours.push(cleJour(j));
  }
  return jours;
}

/** Nom de salle stable et opaque : l'id du rendez-vous suffit, il n'est connu que des deux parties. */
export const nomSalle = (rdvId: string): string => `caroline-${rdvId}`;
export const salleUrl = (salle: string): string => `https://meet.jit.si/${salle}`;

/** Un rendez-vous confirmé s'ouvre dans le site dès qu'on le veut, jusqu'à 30 minutes après l'heure de fin. */
export function rencontreOuverte(rdv: Pick<RendezVous, 'debut' | 'fin' | 'statut'>, maintenant = new Date()): boolean {
  if (rdv.statut !== 'confirme') return false;
  const fin = versDate(rdv.fin).getTime() + 30 * 60000;
  return maintenant.getTime() <= fin;
}

/** Un rendez-vous neuf demandé par la personne connectée, avec son miroir. */
export function nouveauRendezVous(id: string, uid: string, nom: string, courriel: string, creneau: Creneau, duree: number, note = ''): { rdv: Omit<RendezVous, 'id'>; occupation: Omit<Occupation, 'id'> } {
  const debut = Timestamp.fromDate(creneau.debut);
  const fin = Timestamp.fromDate(creneau.fin);
  return {
    rdv: {
      uid,
      nom,
      courriel,
      debut,
      fin,
      duree,
      statut: 'demande',
      salle: nomSalle(id),
      note: note.slice(0, 1000),
      creePar: 'client',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    occupation: { debut, fin },
  };
}

const deuxChiffres = (n: number) => String(n).padStart(2, '0');
const icsDate = (d: Date): string =>
  `${d.getUTCFullYear()}${deuxChiffres(d.getUTCMonth() + 1)}${deuxChiffres(d.getUTCDate())}T${deuxChiffres(d.getUTCHours())}${deuxChiffres(d.getUTCMinutes())}00Z`;

/** Fichier iCalendar d'un rendez-vous (« Ajouter à mon calendrier »). */
export function icsRendezVous(rdv: Pick<RendezVous, 'id' | 'debut' | 'fin' | 'salle'>, titre = 'Rencontre avec Caroline Gérard'): string {
  const debut = versDate(rdv.debut);
  const fin = versDate(rdv.fin);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Caroline Gérard//Rendez-vous//FR',
    'BEGIN:VEVENT',
    `UID:${rdv.id}@carolinegerard.ca`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(debut)}`,
    `DTEND:${icsDate(fin)}`,
    `SUMMARY:${titre}`,
    `DESCRIPTION:Rencontre vidéo : ${salleUrl(rdv.salle)}`,
    `URL:${salleUrl(rdv.salle)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export const formatDate = (d: any): string =>
  versDate(d).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const formatHeure = (d: any): string =>
  versDate(d).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

/** Fichier .ics téléchargeable dans le navigateur, sans dépendance externe. */
export function telechargerIcs(nomFichier: string, contenu: string): void {
  const blob = new Blob([contenu], { type: 'text/calendar' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nomFichier });
  a.click();
  URL.revokeObjectURL(a.href);
}
