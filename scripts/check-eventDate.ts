// Auto-vérification du module de dates : `node scripts/check-eventDate.ts`
import assert from 'node:assert/strict';
import { badge, formatLong, sortEvents, calendarRange, effectiveEnd, precisionOf } from '../lib/eventDate.ts';

const day = { date: '2026-09-13', endDate: '' };
const range = { date: '2026-09-13', endDate: '2026-09-20' };
const cross = { date: '2026-09-28', endDate: '2026-10-03' };
const crossYear = { date: '2026-12-30', endDate: '2027-01-02' };
const month = { date: '2027-03' };
const year = { date: '2027' };
const december = { date: '2027-12' };
const badEnd = { date: '2026-09-13', endDate: '2026-09-01' };
const first = { date: '2026-10-01' };

assert.deepEqual(badge(day), { top: '13', bottom: 'SEPT 2026' });
assert.deepEqual(badge(range), { top: '13-20', bottom: 'SEPT 2026' });
assert.deepEqual(badge(cross), { top: '28 SEPT', bottom: 'au 3 OCT 2026' });
assert.deepEqual(badge(month), { top: 'MARS', bottom: '2027' });
assert.deepEqual(badge(year), { top: '2027', bottom: 'date à venir' });
assert.deepEqual(badge(first), { top: '1', bottom: 'OCT 2026' }); // jamais « SEPT » (piège UTC)

assert.equal(formatLong(day), 'dimanche 13 septembre 2026');
assert.equal(formatLong(first), 'jeudi 1er octobre 2026');
assert.equal(formatLong(range), 'du 13 au 20 septembre 2026');
assert.equal(formatLong(cross), 'du 28 septembre au 3 octobre 2026');
assert.equal(formatLong(crossYear), 'du 30 décembre 2026 au 2 janvier 2027');
assert.equal(formatLong(month), 'mars 2027, date à confirmer');
assert.equal(formatLong(year), '2027, date à confirmer');
assert.equal(formatLong(badEnd), 'dimanche 13 septembre 2026'); // fin avant début ignorée
assert.equal(effectiveEnd(badEnd), '');

assert.deepEqual(calendarRange(day), { start: '20260913', end: '20260914' });
assert.deepEqual(calendarRange(range), { start: '20260913', end: '20260921' });
assert.deepEqual(calendarRange(crossYear), { start: '20261230', end: '20270103' });
assert.equal(calendarRange(month), null);
assert.equal(calendarRange(year), null);

const mixed: { date: string; endDate?: string }[] = [year, cross, december, month, day, range];
assert.deepEqual(sortEvents(mixed).map(e => e.date + (e.endDate ? '/' + e.endDate : '')),
  ['2026-09-13', '2026-09-13/2026-09-20', '2026-09-28/2026-10-03', '2027-03', '2027-12', '2027']);
assert.deepEqual(sortEvents([december, year]).map(e => e.date), ['2027-12', '2027']);
assert.equal(precisionOf(undefined as unknown as string), 'year'); // document sans champ date : pas de plantage
assert.equal(precisionOf('2026-09-13'), 'day'); assert.equal(precisionOf('2027-03'), 'month'); assert.equal(precisionOf('2027'), 'year');
console.log('eventDate: 30 assertions OK');
