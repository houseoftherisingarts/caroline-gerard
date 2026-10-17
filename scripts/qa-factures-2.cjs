// Boucle verdict du module de facturation (16 octobre 2026, remplacement de Kiwili) : capture le harnais
// qa-factures.html (liste, éditeur avec paiements, rabais, remise, récurrence et pièces jointes, note de
// crédit, aperçu, état de compte, page publique avec solde) à 1440 et 390, en palettes ciel, encre et nuit.
// Mesures par capture : débordement horizontal, italiques, tiret cadratin, texte sous 13 px, lignes des titres.
// Usage : node scripts/qa-factures-2.cjs http://127.0.0.1:4195 captures-factures-2
const { chromium } = require('/Users/lesalondesinconnus/Documents/Websites/FMM 2026/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:4195';
const OUT = process.argv[3] || 'captures-factures-2';
fs.mkdirSync(OUT, { recursive: true });

const url = (q) => `${BASE}/qa-factures.html?${q}`;
const ECRANS = [
  { nom: 'liste', url: url('c=liste') },
  { nom: 'liste-retard', url: url('c=liste'), avant: (p) => p.click('button[aria-pressed]:nth-of-type(2)') },
  { nom: 'editeur', url: url('c=editeur') },
  { nom: 'editeur-sans-depense', url: url('c=editeur&dep=aucune') },
  { nom: 'editeur-credit', url: url('c=editeur-credit') },
  { nom: 'apercu', url: url('c=apercu') },
  { nom: 'apercu-credit', url: url('c=apercu-credit') },
  { nom: 'etat', url: url('c=etat') },
  { nom: 'publique', url: url('c=publique') },
  { nom: 'publique-en', url: url('c=publique&lang=EN') },
  { nom: 'publique-carte', url: url('c=publique&carte=1') },
  { nom: 'reglages', url: url('c=reglages') },
];

const rapport = { erreurs: [], ecrans: [] };

async function mesurer(page) {
  return page.evaluate(() => {
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const tous = [...document.querySelectorAll('body *')];
    const italiques = tous.filter((e) => getComputedStyle(e).fontStyle === 'italic' && e.innerText && e.innerText.trim() && visible(e)).length;
    const petits = tous
      .filter((e) => visible(e) && e.children.length === 0 && (e.innerText || '').trim() && parseFloat(getComputedStyle(e).fontSize) < 13)
      .map((e) => `${parseFloat(getComputedStyle(e).fontSize)}px « ${(e.innerText || '').trim().slice(0, 40)} »`)
      .slice(0, 8);
    const titres = [...document.querySelectorAll('h1, h2, h3')].filter(visible).map((h) => {
      const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2;
      return { texte: h.innerText.replace(/\n/g, ' / ').slice(0, 60), lignes: Math.round(h.getBoundingClientRect().height / lh) };
    });
    // Éléments qui sortent de la fenêtre à droite (cause la plus fréquente d'un défilement horizontal).
    const largeur = document.documentElement.clientWidth;
    const debordants = tous
      .filter((e) => visible(e) && e.getBoundingClientRect().right > largeur + 1 && !e.closest('.overflow-x-auto'))
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 3).join('.')}`)
      .slice(0, 5);
    return {
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      clientWidth: largeur,
      italiques,
      petits,
      tirets: (document.body.innerText.match(/—/g) || []).length,
      titres,
      lignesTitre: Math.max(0, ...titres.map((t) => t.lignes)),
      debordants,
      // Cellules de tableau dont le texte dépasse la largeur (en-tête qui mord sur la colonne voisine).
      cellules: [...document.querySelectorAll('th, td')].filter((e) => visible(e) && e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.trim().slice(0, 30)).slice(0, 5),
      skin: document.documentElement.getAttribute('data-skin') || 'ciel',
      nuit: document.documentElement.hasAttribute('data-nuit'),
    };
  });
}

async function passe(browser, { largeur, hauteur, nuit, skin }) {
  const context = await browser.newContext({ viewport: { width: largeur, height: hauteur } });
  await context.addInitScript(([n, s]) => {
    try {
      localStorage.setItem('xena.nuit', n ? '1' : '0');
      if (s === 'encre') localStorage.setItem('xena.skin', 'encre');
    } catch (e) {}
  }, [nuit, skin]);
  const page = await context.newPage();
  const etiquette = `${nuit ? 'nuit' : skin} ${largeur}px`;
  page.on('pageerror', (err) => rapport.erreurs.push(`${etiquette} : ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') rapport.erreurs.push(`console ${etiquette} : ${msg.text().slice(0, 200)}`); });

  for (const ecran of ECRANS) {
    await page.goto(ecran.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(ecran.nom.startsWith('publique') ? 2500 : 700);
    if (ecran.avant) { await ecran.avant(page); await page.waitForTimeout(300); }
    const m = await mesurer(page);
    const fichier = path.join(OUT, `${ecran.nom}-${nuit ? 'nuit' : skin}-${largeur}.jpg`);
    await page.screenshot({ path: fichier, fullPage: true, type: 'jpeg', quality: 78 });
    rapport.ecrans.push({ ecran: ecran.nom, largeur, palette: nuit ? 'nuit' : skin, fichier, ...m });
  }
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const largeur of [1440, 390]) {
    const hauteur = largeur === 1440 ? 900 : 844;
    await passe(browser, { largeur, hauteur, nuit: false, skin: 'ciel' });
    await passe(browser, { largeur, hauteur, nuit: false, skin: 'encre' });
    await passe(browser, { largeur, hauteur, nuit: true, skin: 'ciel' });
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 2));

  const soucis = rapport.ecrans.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.italiques > 0 || e.tirets > 0 || e.petits.length > 0 || e.lignesTitre > 2 || e.cellules.length > 0);
  console.log(`${rapport.ecrans.length} captures écrites dans ${OUT}`);
  if (rapport.erreurs.length) console.log(`Erreurs console/page : ${rapport.erreurs.length}`, rapport.erreurs.slice(0, 6));
  for (const s of soucis) {
    console.log(`- ${s.ecran} (${s.palette}, ${s.largeur}px) : débordement=${s.scrollWidth > s.clientWidth + 1} ${s.debordants.join(' ')} italiques=${s.italiques} tirets=${s.tirets} petits=${s.petits.join(' | ')} lignesTitre=${s.lignesTitre} cellules=${s.cellules.join(' | ')}`);
  }
  if (!soucis.length) console.log('Aucun souci détecté par les mesures automatiques.');
})();
