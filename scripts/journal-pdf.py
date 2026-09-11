#!/usr/bin/env python3
"""Fabrique le PDF du journal des changements, à partir de lib/changelog.ts.

La source unique reste le fichier que lit l'Espace Auteure : le PDF ne se retape jamais à la
main, il se régénère. Le fond est peint sous le contenu par PyMuPDF plutôt que par le CSS,
parce que Chrome ne peint jamais dans la marge de @page et laisserait un cadre blanc.

    python3 scripts/journal-pdf.py [chemin/sortie.pdf]
"""
import re
import subprocess
import sys
from html import escape
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "lib" / "changelog.ts"
SORTIE = Path(sys.argv[1]) if len(sys.argv) > 1 else RACINE / "journal-des-changements.pdf"

NUIT = (0x0f / 255, 0x17 / 255, 0x2a / 255)
CREME = (0xf7 / 255, 0xf4 / 255, 0xec / 255)

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def date_longue(iso: str) -> str:
    a, m, j = (int(x) for x in iso.split("-"))
    return f"{'1er' if j == 1 else j} {MOIS[m - 1]} {a}"


def lire_journal():
    """Petit lecteur du tableau JOURNAL : le format du fichier est tenu par nous, pas deviné."""
    texte = SOURCE.read_text(encoding="utf-8")
    corps = texte.split("export const JOURNAL", 1)[1]
    entrees = []
    for bloc in re.findall(r"\{\s*\n\s*date:(.*?)\n  \},", corps, re.S):
        date = re.search(r"""['"]([\d-]+)['"]""", bloc).group(1)
        titre = re.search(r"""titre:\s*['"](.+?)['"],\n""", bloc, re.S).group(1)
        intro = re.search(r"""intro:\s*["'](.+?)["'],\n""", bloc, re.S).group(1)
        etapes_brut = bloc.split("etapes: [", 1)[1]
        etapes = re.findall(r'^\s*"(.+?)",\s*$', etapes_brut, re.M)
        entrees.append({"date": date, "titre": titre, "intro": intro, "etapes": etapes})
    return entrees


def html(entrees) -> str:
    total = sum(len(e["etapes"]) for e in entrees)
    premiere = date_longue(entrees[-1]["date"])
    journees = "".join(
        f"""
      <article class="journee">
        <p class="date">{escape(date_longue(e['date']))}</p>
        <h2>{escape(e['titre'])}</h2>
        <p class="intro">{escape(e['intro'])}</p>
        <ul>{''.join(f'<li>{escape(s)}</li>' for s in e['etapes'])}</ul>
      </article>"""
        for e in entrees
    )
    return f"""<!doctype html>
<html lang="fr-CA"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: Letter; margin: 17mm 18mm; }}
  * {{ box-sizing: border-box; }}
  html, body {{ background: none; margin: 0; }}
  body {{ font-family: 'Lato', system-ui, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.6; }}

  .couverture {{ page-break-after: always; height: 232mm; display: flex; flex-direction: column;
                 justify-content: center; color: #f8fafc; }}
  .couverture .marque {{ font-family: 'Playfair Display', serif; font-size: 15pt; color: #d4af37;
                         letter-spacing: .14em; text-transform: uppercase; margin-bottom: 42mm; }}
  .couverture h1 {{ font-family: 'Playfair Display', serif; font-size: 40pt; line-height: 1.1;
                    font-weight: 600; margin: 0 0 10mm; max-width: 150mm; }}
  .couverture .chiffre {{ font-family: 'Playfair Display', serif; font-size: 96pt; line-height: .9;
                          color: #d4af37; margin: 0; }}
  .couverture .sous {{ font-size: 11pt; color: #cbd5e1; max-width: 128mm; margin-top: 6mm; }}
  .couverture .pied {{ margin-top: auto; font-size: 9pt; color: #94a3b8; letter-spacing: .08em; }}

  .journee {{ margin-bottom: 10mm; padding-bottom: 8mm;
              border-bottom: 1px solid rgba(176,138,62,.28); }}
  .date, h2 {{ break-after: avoid-page; }}
  li, .intro {{ orphans: 2; widows: 2; }}
  .journee:last-of-type {{ border-bottom: 0; }}
  .date {{ font-size: 8.5pt; font-weight: 700; letter-spacing: .13em; text-transform: uppercase;
           color: #9a7429; margin: 0 0 2mm; }}
  h2 {{ font-family: 'Playfair Display', serif; font-size: 17pt; font-weight: 600; color: #0f172a;
        margin: 0 0 3mm; line-height: 1.25; }}
  .intro {{ margin: 0 0 4mm; color: #475569; }}
  ul {{ margin: 0; padding: 0; list-style: none; }}
  li {{ position: relative; padding-left: 7mm; margin-bottom: 2.4mm; }}
  li::before {{ content: ''; position: absolute; left: 1.5mm; top: 2.3mm; width: 2.2mm; height: 2.2mm;
                border-radius: 50%; background: #b08a3e; }}
  .fin {{ margin-top: 8mm; font-size: 9.5pt; color: #64748b; font-style: normal; }}
</style></head><body>
  <section class="couverture">
    <p class="marque">Caroline Gérard</p>
    <h1>Le journal de ton site</h1>
    <p class="chiffre">{len(entrees)}</p>
    <p class="sous">journées de travail et {total} changements livrés depuis le {escape(premiere)},
       racontés du plus récent au plus ancien.</p>
    <p class="pied">carolinegerard.ca · Espace Auteure · Journal des changements</p>
  </section>
  {journees}
  <p class="fin">Ce journal vit aussi dans ton Espace Auteure, sous « Journal des changements »,
     et une nouvelle journée s'y ajoute chaque fois que le site bouge.</p>
</body></html>"""


def main():
    entrees = lire_journal()
    if not entrees:
        sys.exit("Aucune entrée lue dans lib/changelog.ts")

    tmp_html = SORTIE.with_suffix(".html")
    tmp_html.write_text(html(entrees), encoding="utf-8")

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        nav = p.chromium.launch()
        page = nav.new_page()
        page.goto(tmp_html.as_uri())
        page.wait_for_timeout(2500)  # le temps que les polices Google arrivent
        page.pdf(path=str(SORTIE), format="Letter", print_background=True)
        nav.close()

    # Le fond, peint sous le contenu : Chrome laisse la marge de @page en blanc.
    import fitz
    doc = fitz.open(SORTIE)
    for i, page in enumerate(doc):
        page.wrap_contents()
        page.draw_rect(page.rect, fill=NUIT if i == 0 else CREME, overlay=False)
    final = SORTIE.with_name(SORTIE.stem + "-fond.pdf")
    doc.save(str(final), deflate=True)
    doc.close()
    final.replace(SORTIE)
    tmp_html.unlink(missing_ok=True)

    taille = SORTIE.stat().st_size / 1024
    print(f"{SORTIE} · {len(entrees)} journées · {taille:.0f} Ko")


if __name__ == "__main__":
    main()
