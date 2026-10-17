// Boucle verdict du module comptable (xena4-J-compta, 8 septembre 2026; complété par xena4-L-finances
// le même jour pour Aperçu, Rapports et l'impression) : capture les composants de
// components/admin/finances/ à 1440 et 390, en palette ciel et en mode nuit, avec le jeu d'exemple
// (une année de revenus et dépenses d'une consultante autonome). Sert http://127.0.0.1:4190 (dist-verif),
// jamais un autre serveur : le harnais qa-finances.html y est déjà buildé (scripts/vite.qa.config.ts).
// Mesures par capture : débordement horizontal, italiques, tiret cadratin, texte sous 13 px, lignes du h1/h2.
// Usage : node scripts/qa-finances.cjs <baseUrl> <dossierSortie>
const { chromium } = require('/Users/lesalondesinconnus/Documents/Websites/FMM 2026/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:4190';
const OUT = process.argv[3] || 'captures-finances-2';
fs.mkdirSync(OUT, { recursive: true });

// Un vrai CSV pour simuler le dépôt et capturer l'écran d'aperçu d'Import.tsx (colonnes détectées,
// doublons signalés), pas seulement la zone de dépôt vide.
const CSV_TEMOIN = path.join(OUT, 'releve-temoin.csv');
fs.writeFileSync(
  CSV_TEMOIN,
  ['Date;Description;Débit;Crédit', '2026-09-03;Stripe;45,50;', '2026-09-05;Nouveau client;;750,00'].join('\n')
);

// Les composants de la mission; Recus se capture à part (sans/avec reçu) via ?c=recus&recu=.
// apercu et rapports (xena4-L-finances, 8 septembre 2026) : Aperçu, Rapports, et l'impression d'un
// rapport (voir la passe PDF plus bas, sur l'écran « rapports »).
const ECRANS = [
  { nom: 'apercu', url: `${BASE}/qa-finances.html?c=apercu` },
  { nom: 'transactions', url: `${BASE}/qa-finances.html?c=transactions` },
  { nom: 'import', url: `${BASE}/qa-finances.html?c=import` },
  { nom: 'conciliation', url: `${BASE}/qa-finances.html?c=conciliation` },
  { nom: 'rapports', url: `${BASE}/qa-finances.html?c=rapports` },
  { nom: 'plan-comptable', url: `${BASE}/qa-finances.html?c=plan-comptable` },
  { nom: 'tiers', url: `${BASE}/qa-finances.html?c=tiers` },
  { nom: 'recus-sans', url: `${BASE}/qa-finances.html?c=recus&recu=sans` },
  { nom: 'recus-avec', url: `${BASE}/qa-finances.html?c=recus&recu=avec` },
  // Tour 2 (Kiwili) : récurrence, refacturation, paquet pour le comptable.
  { nom: 'apercu-recurrentes', url: `${BASE}/qa-finances.html?c=apercu&rec=2` },
  { nom: 'transactions-recurrente', url: `${BASE}/qa-finances.html?c=transactions`, avant: async (page) => { await page.fill('input[aria-label="Rechercher…"]', 'Hébergement'); await page.waitForTimeout(300); } },
  { nom: 'transactions-edition', url: `${BASE}/qa-finances.html?c=transactions`, avant: async (page) => { await page.fill('input[aria-label="Rechercher…"]', 'Hébergement'); await page.click('tbody tr'); await page.waitForTimeout(300); } },
  { nom: 'transactions-a-refacturer', url: `${BASE}/qa-finances.html?c=transactions`, avant: async (page) => { await page.click('button[aria-pressed]'); await page.waitForTimeout(300); } },
  { nom: 'transactions-ajout-refacturer', url: `${BASE}/qa-finances.html?c=transactions`, avant: async (page) => { await page.check('form input[type="checkbox"]'); await page.waitForTimeout(200); } },
  { nom: 'rapports-paquet', url: `${BASE}/qa-finances.html?c=rapports`, avant: async (page, { largeur, nuit }) => {
      await page.evaluate(() => { window.__zip = null; const o = URL.createObjectURL; URL.createObjectURL = (b) => { window.__zip = b; return o.call(URL, b); }; });
      await page.click('[data-paquet] button'); await page.waitForFunction(() => window.__zip, null, { timeout: 15000 }); await page.waitForTimeout(400);
      const taille = await page.evaluate(() => window.__zip.size);
      rapport.paquet = { taille };
      // Le zip lui-même, gardé à côté des captures pour `unzip -t` et `unzip -l`.
      const b64 = await page.evaluate(async () => { const buf = new Uint8Array(await window.__zip.arrayBuffer()); let bin = ''; for (const b of buf) bin += String.fromCharCode(b); return btoa(bin); });
      if (largeur === 1440 && !nuit) fs.writeFileSync(path.join(OUT, 'paquet-temoin.zip'), Buffer.from(b64, 'base64'));
    } },
];

const rapport = { erreurs: [], ecrans: [] };

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
    const h = document.querySelector('h1, h2');
    let lignesTitre = 0;
    if (h) {
      const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2;
      lignesTitre = Math.round(h.getBoundingClientRect().height / lh);
    }
    return {
      // body.scrollWidth aussi, pas seulement documentElement : une ligne d'actions qui déborde sans
      // wrap peut élargir le body sans que documentElement le signale (trouvé sur Transactions.tsx,
      // 8 sept, corrigé dans components/admin/ui.tsx).
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
    if (ecran.avant) await ecran.avant(page, { largeur, nuit });
    const m = await mesurer(page);
    const suffixe = `${nuit ? 'nuit' : skin}-${largeur}`;
    const fichier = path.join(OUT, `${ecran.nom}-${suffixe}.jpg`);
    await page.screenshot({ path: fichier, fullPage: true, type: 'jpeg', quality: 80 });
    rapport.ecrans.push({ ecran: ecran.nom, largeur, palette: nuit ? 'nuit' : skin, fichier, ...m });

    if (ecran.nom === 'rapports' && largeur === 1440 && !nuit) {
      // Impression d'un seul rapport (État des résultats) : clique « Imprimer », capture le PDF rendu
      // (page.pdf, Lettre US) pour être regardé comme une capture normale. Une seule passe (desktop,
      // palette ciel de jour) suffit : la mise en page imprimée ne change pas avec la palette d'écran.
      await page.evaluate(() => {
        const boutons = [...document.querySelectorAll('button')];
        const bouton = boutons.find((b) => b.textContent && b.textContent.includes('Imprimer'));
        window.print = () => { document.title = '__impression_declenchee__'; };
        bouton?.click();
      });
      await page.waitForTimeout(200);
      const fichierPdf = path.join(OUT, `rapports-impression-${suffixe}.pdf`);
      await page.pdf({ path: fichierPdf, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
      rapport.ecrans.push({ ecran: 'rapports-impression', largeur, palette: nuit ? 'nuit' : skin, fichier: fichierPdf });
    }

    if (ecran.nom === 'import') {
      // Dépôt réel d'un CSV témoin (une ligne déjà dans le jeu d'exemple, une nouvelle) : capture
      // aussi l'écran d'aperçu (colonnes détectées, doublon signalé), pas seulement la zone de dépôt vide.
      await page.setInputFiles('input[type="file"]', CSV_TEMOIN);
      await page.waitForTimeout(400);
      const mApercu = await mesurer(page);
      const fichierApercu = path.join(OUT, `import-apercu-${suffixe}.jpg`);
      await page.screenshot({ path: fichierApercu, fullPage: true, type: 'jpeg', quality: 80 });
      rapport.ecrans.push({ ecran: 'import-apercu', largeur, palette: nuit ? 'nuit' : skin, fichier: fichierApercu, ...mApercu });
    }
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

  fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 2));

  // rapports-impression est un PDF (pas de mesure DOM, voir la passe page.pdf ci-dessus) : exclu du
  // filtre de soucis, qui suppose une capture mesurée.
  const soucis = rapport.ecrans.filter(
    (e) => e.petits && (e.scrollWidth > e.clientWidth + 1 || e.italiques > 0 || e.tirets > 0 || e.petits.length > 0 || e.lignesTitre > 2)
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
})();
