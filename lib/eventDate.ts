// Dates d'événement à trois précisions : « 2026-09-13 » (jour), « 2027-03 » (mois), « 2027 » (année),
// avec une fin facultative (endDate, jour seulement) pour une période.
// Tout se lit sur la chaîne, jamais via new Date(iso) : un ISO sans heure est
// interprété en UTC et s'affiche la veille au Québec.
import type { AppEvent } from '../types';

export type Precision = 'day' | 'month' | 'year';
type Dated = Pick<AppEvent, 'date'> & { endDate?: string };

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['JAN', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1).padStart(2, '0'), label }));

export const precisionOf = (date = ''): Precision =>
  date.length >= 10 ? 'day' : date.length === 7 ? 'month' : 'year';

export const isDateToConfirm = (e: Dated) => precisionOf(e.date) !== 'day';

const parts = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m: m || 1, d: day || 1 };
};

const dayLabel = (d: number) => (d === 1 ? '1er' : String(d));

/** Fin réelle de la période : endDate seulement si l'événement a un jour précis et que la fin vient après. */
export const effectiveEnd = (e: Dated): string =>
  e.endDate && precisionOf(e.date) === 'day' && e.endDate > e.date ? e.endDate : '';

/** Clé de tri : une année seule vient après tous ses mois (« 2027 » après « décembre 2027 »). */
const sortKey = (e: Dated) => (precisionOf(e.date) === 'year' ? `${e.date}-13` : e.date);

/** Dates précises d'abord, en ordre chronologique; les « à confirmer » (mois ou année seule) au bas. */
export const sortEvents = <T extends Dated>(events: T[]): T[] =>
  [...events].sort((a, b) =>
    Number(isDateToConfirm(a)) - Number(isDateToConfirm(b)) ||
    sortKey(a).localeCompare(sortKey(b)) ||
    effectiveEnd(a).localeCompare(effectiveEnd(b)),
  );

/** Encart de la carte publique : { top: '13-20', bottom: 'SEPT 2026' }. */
export function badge(e: Dated): { top: string; bottom: string } {
  if (!e.date) return { top: '?', bottom: 'date à venir' };
  const s = parts(e.date);
  const p = precisionOf(e.date);
  if (p === 'year') return { top: String(s.y), bottom: 'date à venir' };
  if (p === 'month') return { top: MONTHS_SHORT[s.m - 1], bottom: String(s.y) };
  const end = effectiveEnd(e);
  if (!end) return { top: String(s.d), bottom: `${MONTHS_SHORT[s.m - 1]} ${s.y}` };
  const f = parts(end);
  if (f.y === s.y && f.m === s.m) return { top: `${s.d}-${f.d}`, bottom: `${MONTHS_SHORT[s.m - 1]} ${s.y}` };
  return { top: `${s.d} ${MONTHS_SHORT[s.m - 1]}`, bottom: `au ${f.d} ${MONTHS_SHORT[f.m - 1]} ${f.y}` };
}

/** Phrase complète : « samedi 13 septembre 2026 », « du 13 au 20 septembre 2026 », « mars 2027, date à confirmer ». */
export function formatLong(e: Dated, withWeekday = true): string {
  if (!e.date) return 'Date à confirmer';
  const s = parts(e.date);
  const p = precisionOf(e.date);
  if (p === 'year') return `${s.y}, date à confirmer`;
  if (p === 'month') return `${MONTHS[s.m - 1]} ${s.y}, date à confirmer`;
  const end = effectiveEnd(e);
  if (!end) {
    const weekday = withWeekday ? `${WEEKDAYS[new Date(s.y, s.m - 1, s.d).getDay()]} ` : '';
    return `${weekday}${dayLabel(s.d)} ${MONTHS[s.m - 1]} ${s.y}`;
  }
  const f = parts(end);
  if (f.y === s.y && f.m === s.m) return `du ${dayLabel(s.d)} au ${dayLabel(f.d)} ${MONTHS[s.m - 1]} ${s.y}`;
  if (f.y === s.y) return `du ${dayLabel(s.d)} ${MONTHS[s.m - 1]} au ${dayLabel(f.d)} ${MONTHS[f.m - 1]} ${s.y}`;
  return `du ${dayLabel(s.d)} ${MONTHS[s.m - 1]} ${s.y} au ${dayLabel(f.d)} ${MONTHS[f.m - 1]} ${f.y}`;
}

/** Bornes d'agenda en journées entières (fin exclusive, format 20260913). Null quand la date reste à confirmer. */
export function calendarRange(e: Dated): { start: string; end: string } | null {
  if (!e.date || isDateToConfirm(e)) return null;
  const last = parts(effectiveEnd(e) || e.date);
  const next = new Date(last.y, last.m - 1, last.d + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: e.date.replace(/-/g, ''), end: `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}` };
}
