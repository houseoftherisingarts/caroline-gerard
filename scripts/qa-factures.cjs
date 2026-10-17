// Boucle de vérification visuelle des factures brandées (agent A). Capture l'onglet Factures (aperçu
// en direct dans l'éditeur) et la page publique /facture/exemple dans les deux palettes et le mode
// nuit, à 1440 et 390, plus une impression PDF. Usage : node scripts/qa-factures.cjs <baseUrl> <dossierSortie>
const { chromium } = require('/Users/lesalondesinconnus/Documents/Websites/FMM 2026/node_modules/playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:4181';
const OUT = process.argv[3] || 'captures-factures';
fs.mkdirSync(OUT, { recursive: true });

const TAILLES = [
  { nom: '1440', width: 1440, height: 900 },
  { nom: '390', width: 390, height: 844 },
];

async function poserPalette(page, skin, nuit) {
  await page.evaluate(({ skin, nuit }) => {
    try {
      if (skin === 'encre') localStorage.setItem('xena.skin', 'encre'); else localStorage.removeItem('xena.skin');
      if (nuit) localStorage.setItem('xena.nuit', '1'); else localStorage.removeItem('xena.nuit');
    } catch (e) {}
  }, { skin, nuit });
}

async function capturerFacturePublique(browser) {
  for (const { nom, width, height } of TAILLES) {
    for (const combo of [{ skin: 'ciel', nuit: false }, { skin: 'encre', nuit: false }, { skin: 'ciel', nuit: true }]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${BASE}/facture/exemple`, { waitUntil: 'load', timeout: 60000 });
      await poserPalette(page, combo.skin, combo.nuit);
      await page.reload({ waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(900);
      const suffixe = combo.nuit ? 'nuit' : combo.skin;
      await page.screenshot({ path: `${OUT}/facture-publique-${suffixe}-${nom}.png`, fullPage: true });
      await page.close();
    }
  }
}

async function capturerPdf(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/facture/exemple`, { waitUntil: 'load', timeout: 60000 });
  // Le document tarde à paraître : la lecture Firestore réelle échoue d'abord (jeton de test),
  // et l'exemple `verif` ne s'affiche qu'une fois `loading` retombé. On attend le total, pas un délai fixe.
  await page.waitForSelector('text=Total', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${OUT}/facture-exemple.pdf`, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await page.close();
}

async function capturerAdmin(browser) {
  for (const { nom, width, height } of TAILLES) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${BASE}/admin/factures`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/admin-liste-${nom}.png`, fullPage: true });

    // Nouveau document : remplit deux lignes pour peupler l'aperçu de vraies données.
    const boutonNouveau = page.getByRole('button', { name: /nouveau document|new document/i });
    if (await boutonNouveau.count()) {
      await boutonNouveau.first().click();
      await page.waitForTimeout(600);
      const descriptions = page.locator('input[placeholder="Description"], input[placeholder="Description"]');
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs[0]) await inputs[0].fill('Accompagnement stratégique, forfait mensuel');
      const nums = await page.locator('input[type="number"]').all();
      if (nums[0]) await nums[0].fill('1');
      if (nums[1]) await nums[1].fill('850');
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/admin-editeur-apercu-${nom}.png`, fullPage: true });
    }
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  await capturerAdmin(browser);
  await capturerFacturePublique(browser);
  await capturerPdf(browser);
  await browser.close();
  console.log('Captures écrites dans', OUT);
})();
