/**
 * Copie les factures de l'ancien créateur (collection `invoices`) vers la collection `documents` du module
 * Factures et Finances, en gardant le numéro d'origine, les lignes, la date et les taxes. L'ancienne
 * collection reste intacte. Relançable : un document déjà copié (même identifiant) est laissé tel quel.
 *
 *   node scripts/migrer-factures.mjs --essai    montre ce qui serait écrit, n'écrit rien
 *   node scripts/migrer-factures.mjs            écrit pour vrai
 *
 * Même mécanique que vexel-site/scripts/seed-branchements-laurie.mjs : API REST Firestore avec le jeton du
 * compte gcloud actif (gcloud auth print-access-token), aucune clé de service.
 *
 * Les taxes de l'ancien créateur : une ligne cochée « taxable » (un livre) porte la TPS seule, une ligne non
 * cochée ne porte rien, et le transport porte la TPS et la TVQ. Le module le dit avec le champ `taxe` d'une
 * ligne ('tps', 'aucune', ou absent pour les deux), et le transport devient sa propre ligne.
 */
import { execSync } from 'node:child_process';

const PROJET = 'carolinegerard-99f5d';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const ESSAI = process.argv.includes('--essai');

const jeton = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
const entetes = { Authorization: `Bearer ${jeton}`, 'x-goog-user-project': PROJET, 'Content-Type': 'application/json' };

// --- conversion Firestore REST <-> JavaScript ---
function versFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(versFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, versFs(x)])) } };
}
function depuisFs(f) {
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(depuisFs);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, depuisFs(x)]));
  return null;
}

async function lister(collection) {
  const sortie = [];
  let page = '';
  do {
    const res = await fetch(`${BASE}/${collection}?pageSize=100${page ? `&pageToken=${page}` : ''}`, { headers: entetes });
    const data = await res.json();
    if (!res.ok) throw new Error(`Lecture ${collection} : ${res.status} ${JSON.stringify(data)}`);
    for (const d of data.documents || []) sortie.push({ id: d.name.split('/').pop(), ...depuisFs({ mapValue: { fields: d.fields || {} } }) });
    page = data.nextPageToken || '';
  } while (page);
  return sortie;
}

async function existe(chemin) {
  const res = await fetch(`${BASE}/${chemin}`, { headers: entetes });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Lecture ${chemin} : ${res.status}`);
  return true;
}

async function creer(collection, id, donnees) {
  // currentDocument.exists=false : l'écriture échoue plutôt que d'écraser, donc jamais de doublon ni de perte.
  const res = await fetch(`${BASE}/${collection}/${id}?currentDocument.exists=false`, {
    method: 'PATCH', headers: entetes, body: JSON.stringify({ fields: versFs(donnees).mapValue.fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Écriture ${collection}/${id} : ${res.status} ${JSON.stringify(data)}`);
}

// --- conversion d'une facture de l'ancien créateur ---
const arrondi = (n) => Math.round(n * 100) / 100;

function totauxAncien(inv) {
  const sousTotal = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxable = inv.items.reduce((s, i) => (i.isTaxable ? s + i.quantity * i.rate : s), 0);
  const transport = Number(inv.shipping?.cost) || 0;
  const tps = (taxable + transport) * 0.05;
  const tvq = transport * 0.09975;
  return { sousTotal: sousTotal + transport, tps, tvq, total: sousTotal + transport + tps + tvq };
}

function totauxModule(items) {
  const m = (i) => i.quantity * i.price;
  const sousTotal = items.reduce((s, i) => s + m(i), 0);
  const tps = items.reduce((s, i) => s + (i.taxe === 'aucune' ? 0 : m(i)), 0) * 0.05;
  const tvq = items.reduce((s, i) => s + (i.taxe === 'tps' || i.taxe === 'aucune' ? 0 : m(i)), 0) * 0.09975;
  return { sousTotal, tps, tvq, total: sousTotal + tps + tvq };
}

function versDocument(inv) {
  const lignes = inv.items.map((i) => ({
    id: String(i.id), description: i.description || '', quantity: i.quantity, price: i.rate,
    ...(i.isTaxable ? { taxe: 'tps' } : { taxe: 'aucune' }),
  }));
  const transport = Number(inv.shipping?.cost) || 0;
  if (transport > 0) lignes.push({ id: 'transport', description: inv.shipping.method || 'Transport', quantity: 1, price: transport });
  return {
    number: inv.meta?.number || inv.number,
    type: 'Invoice',
    clientId: '',
    clientName: inv.clientName || inv.billTo?.name || '',
    clientEmail: inv.billTo?.email || '',
    date: inv.meta?.date,
    dueDate: inv.meta?.dueDate || inv.meta?.date,
    items: lignes,
    status: 'Sent',
    terms: inv.meta?.terms || 'Payable dès réception',
    // Gardé tel quel de l'ancien créateur, pour mémoire.
    migreDe: `invoices/${inv.id}`,
    adresseFacturation: inv.billTo?.address || '',
    adresseLivraison: inv.shipTo?.address || '',
    telephoneLivraison: inv.shipTo?.phone || '',
    createdAt: new Date(inv.savedAt || Date.now()),
  };
}

// --- réglages de facturation (les mêmes que ceux de l'ancien créateur : adresse et numéros de taxes) ---
const REGLAGES = {
  nomLegal: 'Caroline Gérard',
  adresse: '501 Chemin-du-Lac-à-la-Perchaude, Saint-Tite QC G0X 3H0',
  neq: '', tps: '781718333 RT0001', tvq: '1041635416 TQ0001',
  modalites: 'Payable dès réception', note: 'Merci de ton achat !',
  courriel: 'caroline@carolinegerard.ca', lienPaiementStripe: '',
  paiementCarte: false, relancesAutomatiques: false, envoiRecurrences: false,
};

console.log(ESSAI ? 'ESSAI : rien ne sera écrit.' : 'Migration pour vrai.');
const anciennes = await lister('invoices');
console.log(`${anciennes.length} facture(s) dans l'ancienne collection invoices.`);
let migrees = 0, deja = 0, ecarts = 0;
for (const inv of anciennes) {
  const doc = versDocument(inv);
  const a = totauxAncien(inv), m = totauxModule(doc.items);
  const memes = ['sousTotal', 'tps', 'tvq', 'total'].every((k) => arrondi(a[k]) === arrondi(m[k]));
  if (!memes) ecarts += 1;
  const present = await existe(`documents/${inv.id}`);
  console.log(`  ${doc.number}  ${doc.date}  ${doc.clientName}  ${doc.items.length} ligne(s)  total ${arrondi(a.total)} $ (module ${arrondi(m.total)} $)  ${memes ? 'taxes identiques' : 'ÉCART DE TAXES'}  ${present ? 'déjà copiée' : 'à copier'}`);
  if (present) { deja += 1; continue; }
  if (!ESSAI) await creer('documents', inv.id, doc);
  migrees += 1;
}
console.log(`${ESSAI ? 'À copier' : 'Copiées'} : ${migrees}; déjà là : ${deja}; écarts de taxes : ${ecarts}.`);

if (!(await existe('settings/facturation'))) {
  console.log(`settings/facturation : ${ESSAI ? 'serait créé' : 'créé'} avec l'adresse et les numéros de taxes de l'ancien créateur.`);
  if (!ESSAI) await creer('settings', 'facturation', REGLAGES);
} else console.log('settings/facturation : déjà présent, laissé tel quel.');
