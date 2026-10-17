// Boucle verdict du module fiscal (xena4-K-fiscal, 8 septembre 2026) : d'abord les tests purs de
// lib/compta/fiscal.ts (scripts/verif-fiscal-cas.ts, bundlé par esbuild et exécuté), puis les
// captures de l'onglet Taxes et impôt et des mini-cartes, à 1440 et 390, en ciel et en mode nuit.
// Sert http://127.0.0.1:4190 (dist-verif), jamais un autre serveur : le harnais qa-finances.html y
// est déjà buildé (scripts/vite.qa.config.ts, `?c=taxes-impot` et `?c=cartes-fiscales`).
// Usage : node scripts/verif-fiscal.mjs <baseUrl> <dossierSortie>
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');
const require = createRequire(import.meta.url); // .mjs (type: module) : require() n'existe pas nativement

const BASE = process.argv[2] || 'http://127.0.0.1:4190';
const OUT = process.argv[3] || 'captures-verif/xena4-K-fiscal';
fs.mkdirSync(path.resolve(RACINE, OUT), { recursive: true });

// --- 1. Tests purs (voir scripts/verif-fiscal-cas.ts) ---
console.log('--- Tests purs : lib/compta/fiscal.ts ---');
const TEMP = path.resolve(RACINE, '.verif-fiscal-tmp.mjs');
let testsOk = true;
try {
  execSync(
    `npx esbuild scripts/verif-fiscal-cas.ts --bundle --platform=node --format=esm --packages=external ` +
      `--define:import.meta.env='{"VITE_FIREBASE_API_KEY":"test","VITE_FIREBASE_AUTH_DOMAIN":"test","VITE_FIREBASE_PROJECT_ID":"xena-test","VITE_FIREBASE_STORAGE_BUCKET":"test","VITE_FIREBASE_MESSAGING_SENDER_ID":"test","VITE_FIREBASE_APP_ID":"test","MODE":"verif"}' ` +
      `--outfile="${TEMP}"`,
    { cwd: RACINE, stdio: 'inherit' }
  );
  execSync(`node "${TEMP}"`, { cwd: RACINE, stdio: 'inherit' });
} catch (e) {
  testsOk = false;
  console.log(`Tests purs en échec : ${e.message}`);
} finally {
  fs.rmSync(TEMP, { force: true });
}

// --- 2. Captures visuelles (Playwright, serveur déjà en marche sur 4190) ---
console.log('\n--- Captures : onglet Taxes et impôt, mini-cartes ---');
const { chromium } = require('/Users/lesalondesinconnus/Documents/Websites/FMM 2026/node_modules/playwright');

const ECRANS = [
  { nom: 'taxes-impot', url: `${BASE}/qa-finances.html?c=taxes-impot` },
  { nom: 'cartes-fiscales', url: `${BASE}/qa-finances.html?c=cartes-fiscales` },
];

const rapport = { testsPursOk: testsOk, erreurs: [], ecrans: [] };

async function mesurer(page) {
  return page.evaluate(() => {
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const tous = [...document.querySelectorAll('body *')];
    const italiques = tous.filter((e) => getComputedStyle(e).fontStyle === 'italic' && e.innerText && e.innerText.trim() && visible(e)).length;
    const petits = tous
      .filter((e) => {
        if (!visible(e) || e.children.length > 0) return false;
        const txt = (e.innerText || '').trim();
        if (!txt) return false;
        return parseFloat(getComputedStyle(e).fontSize) < 13;
      })
      .map((e) => `${parseFloat(getComputedStyle(e).fontSize)}px « ${(e.innerText || '').trim().slice(0, 40)} »`)
      .slice(0, 8);
    const h = document.querySelector('h1, h2, h3');
    let lignesTitre = 0;
    if (h) {
      const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2;
      lignesTitre = Math.round(h.getBoundingClientRect().height / lh);
    }
    return {
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
      italiques,
      petits,
      tirets: (document.body.innerText.match(/—/g) || []).length,
      titre: h ? h.innerText.replace(/\n/g, ' / ') : null,
      lignesTitre,
      skin: document.documentElement.getAttribute('data-skin') || 'ciel',
      nuit: document.documentElement.hasAttribute('data-nuit'),
    };
  });
}

async function passe(browser, { largeur, hauteur, nuit, skin }) {
  const context = await browser.newContext({ viewport: { width: largeur, height: hauteur } });
  await context.addInitScript(
    ([n, s]) => {
      try {
        if (n) localStorage.setItem('xena.nuit', '1');
        if (s === 'encre') localStorage.setItem('xena.skin', 'encre');
      } catch (e) {}
    },
    [nuit, skin]
  );
  const page = await context.newPage();
  page.on('pageerror', (err) => rapport.erreurs.push(`${skin}/${nuit ? 'nuit' : 'jour'} ${largeur}px : ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') rapport.erreurs.push(`console ${skin}/${nuit ? 'nuit' : 'jour'} ${largeur}px : ${msg.text()}`);
  });

  for (const ecran of ECRANS) {
    await page.goto(ecran.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(900); // laisse le temps à useTransactions() de basculer sur le jeu d'exemple
    // Déplie les deux tiroirs de détail sur l'onglet Taxes et impôt, pour capturer le tableau des
    // paliers, pas seulement les deux grandes cartes fermées.
    if (ecran.nom === 'taxes-impot') {
      const boutons = await page.$$('button:has-text("Voir le détail"), button:has-text("Voir le détail par paliers")');
      for (const b of boutons) {
        await b.click().catch(() => {});
      }
      await page.waitForTimeout(300);
    }
    const m = await mesurer(page);
    const suffixe = `${nuit ? 'nuit' : skin}-${largeur}`;
    const fichier = path.join(path.resolve(RACINE, OUT), `${ecran.nom}-${suffixe}.png`);
    await page.screenshot({ path: fichier, fullPage: true });
    rapport.ecrans.push({ ecran: ecran.nom, largeur, palette: nuit ? 'nuit' : skin, fichier, ...m });
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  await passe(browser, { largeur: 1440, hauteur: 900, nuit: false, skin: 'ciel' });
  await passe(browser, { largeur: 390, hauteur: 844, nuit: false, skin: 'ciel' });
  await passe(browser, { largeur: 1440, hauteur: 900, nuit: true, skin: 'ciel' });
  await passe(browser, { largeur: 390, hauteur: 844, nuit: true, skin: 'ciel' });
  await browser.close();

  fs.writeFileSync(path.join(path.resolve(RACINE, OUT), 'rapport.json'), JSON.stringify(rapport, null, 2));

  const soucis = rapport.ecrans.filter(
    (e) => e.scrollWidth > e.clientWidth + 1 || e.italiques > 0 || e.tirets > 0 || e.petits.length > 0 || e.lignesTitre > 2
  );
  console.log(`${rapport.ecrans.length} captures écrites dans ${OUT}`);
  if (rapport.erreurs.length) console.log(`Erreurs console/page : ${rapport.erreurs.length}`, rapport.erreurs.slice(0, 5));
  if (soucis.length) {
    console.log(`${soucis.length} écran(s) à regarder de près :`);
    for (const s of soucis) {
      console.log(
        `- ${s.ecran} (${s.palette}, ${s.largeur}px) : débordement=${s.scrollWidth > s.clientWidth + 1} italiques=${s.italiques} tirets=${s.tirets} petits=${s.petits.length} lignesTitre=${s.lignesTitre}`
      );
    }
  } else {
    console.log('Aucun souci détecté par les mesures automatiques.');
  }
  if (!testsOk) process.exitCode = 1;
})();
