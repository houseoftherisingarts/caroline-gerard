// PlusParVexel — la section « Plus par Vexel » de l'admin d'un site client.
//
// Le studio y dépose les outils qu'il offre à ses clients, gratuits ou payants
// (Influencer Studio le premier), et la section reste à jour d'elle-même : elle
// lit à chaque ouverture le catalogue publié dans le seau Vexel, puis, pour chaque
// outil qui porte un manifeste de mise à jour, la version et les notes en ligne.
// Rien de tout cela ne vit dans le code du site : publier une nouvelle version
// d'un outil ou un nouvel outil suffit, aucun site n'a besoin d'être redéployé.
//
// Aucune dépendance au-delà de React. Aucune couleur de Vexel en dur : tout passe
// par les variables --couleur-* du site hôte (voir README.md), avec un repli sobre.
import { useEffect, useState } from 'react';

export const CATALOGUE_PLUS_PAR_VEXEL =
  'https://firebasestorage.googleapis.com/v0/b/vexel-integrations.firebasestorage.app/o/plus-par-vexel%2Fcatalogue.json?alt=media';

export type Telechargement = { id: string; etiquette: string; url: string; aide?: string };
export type PrixOutil =
  | { type: 'gratuit'; note?: string }
  | { type: 'payant'; montant: number; periode: 'unique' | 'mensuel'; note?: string }
  | { type: 'abonnement'; note?: string };
export type Outil = {
  id: string;
  nom: string;
  ligne: string;
  texte: string;
  prix: PrixOutil;
  plateformes?: string;
  icone?: string;
  image?: string;
  /** le manifeste signé de l'outil (version, notes), lu en direct */
  manifeste?: string;
  telechargements?: Telechargement[];
  ouverture?: string[];
  lien?: { url: string; etiquette: string };
};
export type Catalogue = { version: number; misAJour?: string; outils: Outil[] };
type Manifeste = { version?: string; notes?: string };

const formatPrix = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const etiquettePrix = (p: PrixOutil) =>
  p.type === 'gratuit' ? 'Gratuit' : p.type === 'abonnement' ? 'Avec l’abonnement' : `${formatPrix(p.montant)}${p.periode === 'mensuel' ? ' / mois' : ''}`;

const style = `
.ppv {
  --ppv-fond: var(--couleur-surface, #101012);
  --ppv-texte: var(--couleur-texte, #f2f2f2);
  --ppv-muted: var(--couleur-muted, #9a9a9f);
  --ppv-bordure: var(--couleur-bordure, rgba(255,255,255,0.14));
  --ppv-accent: var(--couleur-accent, #d4af37);
  --ppv-accent-texte: var(--couleur-accent-texte, #101012);
  --ppv-radius: var(--rayon-carte, 15px);
  --ppv-font: var(--police-corps, system-ui, sans-serif);
  --ppv-font-titre: var(--police-titre, var(--ppv-font));
  --ppv-font-etiquette: var(--police-etiquette, var(--ppv-font));
  color: var(--ppv-texte);
  font-family: var(--ppv-font);
  display: grid;
  gap: 24px;
}
.ppv-entete { display: flex; flex-direction: column; gap: 6px; max-width: 640px; }
.ppv-kicker { font-family: var(--ppv-font-etiquette); font-size: 13px; font-weight: 700; letter-spacing: .28em; text-transform: uppercase; color: var(--ppv-accent); }
.ppv-titre { font-family: var(--ppv-font-titre); font-weight: 300; font-size: clamp(26px, 3vw, 34px); line-height: 1.1; letter-spacing: -.02em; margin: 0; }
.ppv-intro { font-size: 15px; line-height: 1.55; color: var(--ppv-muted); margin: 0; }
.ppv-etat { font-size: 14px; color: var(--ppv-muted); padding: 24px; border: 1px dashed var(--ppv-bordure); border-radius: var(--ppv-radius); }
.ppv-carte {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
  background: var(--ppv-fond);
  border: 1px solid var(--ppv-bordure);
  border-radius: var(--ppv-radius);
  box-shadow: 0 24px 60px -32px rgba(0,0,0,.45);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
@media (min-width: 960px) { .ppv-carte { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); } }
.ppv-corps { display: flex; flex-direction: column; gap: 18px; padding: clamp(20px, 3vw, 36px); min-width: 0; }
.ppv-tete { display: flex; align-items: center; gap: 16px; min-width: 0; }
.ppv-icone { width: 64px; height: 64px; flex: none; border-radius: 15px; object-fit: cover; box-shadow: 0 10px 24px -12px rgba(0,0,0,.6), inset 0 0 0 1px var(--ppv-bordure); background: #000; }
.ppv-nom { font-family: var(--ppv-font-titre); font-size: clamp(22px, 2.4vw, 28px); font-weight: 400; line-height: 1.1; margin: 0; letter-spacing: -.01em; }
.ppv-ligne { font-size: 14px; color: var(--ppv-muted); margin: 4px 0 0; line-height: 1.4; }
.ppv-pilules { display: flex; flex-wrap: wrap; gap: 8px; }
.ppv-pilule { font-family: var(--ppv-font-etiquette); font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--ppv-bordure); color: var(--ppv-texte); white-space: nowrap; }
.ppv-pilule--prix { background: var(--ppv-accent); color: var(--ppv-accent-texte); border-color: transparent; }
.ppv-texte { font-size: 15px; line-height: 1.6; margin: 0; }
.ppv-version { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: calc(var(--ppv-radius) - 4px); border: 1px solid var(--ppv-bordure); background: color-mix(in srgb, var(--ppv-texte) 4%, transparent); }
.ppv-version strong { font-size: 14px; font-weight: 700; letter-spacing: .02em; }
.ppv-version span { font-size: 14px; line-height: 1.5; color: var(--ppv-muted); }
.ppv-boutons { display: flex; flex-wrap: wrap; gap: 10px; }
.ppv-bouton {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 12px 18px; border-radius: 999px; text-decoration: none;
  font-family: var(--ppv-font-etiquette); font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  background: var(--ppv-accent); color: var(--ppv-accent-texte); border: 1px solid transparent;
  transition: transform .16s ease, filter .3s ease;
}
.ppv-bouton:hover { filter: brightness(1.06); }
.ppv-bouton:active { transform: scale(.97); }
.ppv-bouton--second { background: transparent; color: var(--ppv-texte); border-color: var(--ppv-bordure); }
.ppv-bouton--second:hover { border-color: var(--ppv-accent); color: var(--ppv-accent); filter: none; }
.ppv-aide { font-size: 13px; color: var(--ppv-muted); margin: 0; line-height: 1.5; }
.ppv-ouverture { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.ppv-ouverture li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; font-size: 14px; line-height: 1.5; }
.ppv-ouverture li::before { content: counter(ppv) '.'; counter-increment: ppv; color: var(--ppv-accent); font-weight: 700; }
.ppv-ouverture { counter-reset: ppv; }
.ppv-details summary { cursor: pointer; font-family: var(--ppv-font-etiquette); font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ppv-accent); list-style: none; }
.ppv-details summary::-webkit-details-marker { display: none; }
.ppv-details[open] summary { margin-bottom: 12px; }
.ppv-visuel { position: relative; min-height: 220px; background: #0b0b0d; }
.ppv-visuel img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: center; }
.ppv-visuel::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 1px var(--ppv-bordure); pointer-events: none; }
@media (max-width: 959px) { .ppv-visuel { order: -1; aspect-ratio: 16 / 10; min-height: 0; } }
@media (prefers-reduced-motion: reduce) { .ppv-bouton { transition: none; } }
`;

export function PlusParVexel({
  catalogue = CATALOGUE_PLUS_PAR_VEXEL,
  titre = 'Les outils du studio, à vous.',
  intro = 'Vexel bâtit des programmes entre deux sites, et les offre d’abord à ses clients. Ce qui s’affiche ici se met à jour tout seul, dès que le studio publie.',
}: { catalogue?: string; titre?: string; intro?: string }) {
  const [outils, setOutils] = useState<Outil[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [manifestes, setManifestes] = useState<Record<string, Manifeste>>({});

  useEffect(() => {
    let vivant = true;
    fetch(catalogue, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Catalogue>) : Promise.reject(new Error(String(r.status)))))
      .then((c) => {
        if (!vivant) return;
        const liste = Array.isArray(c.outils) ? c.outils : [];
        setOutils(liste);
        liste.forEach((o) => {
          if (!o.manifeste) return;
          fetch(o.manifeste, { cache: 'no-store' })
            .then((r) => (r.ok ? (r.json() as Promise<Manifeste>) : Promise.reject(new Error(String(r.status)))))
            .then((m) => vivant && setManifestes((prev) => ({ ...prev, [o.id]: { version: m.version, notes: m.notes } })))
            .catch(() => undefined);
        });
      })
      .catch(() => vivant && setErreur(true));
    return () => { vivant = false; };
  }, [catalogue]);

  return (
    <section className="ppv" aria-labelledby="ppv-titre">
      <style>{style}</style>
      <header className="ppv-entete">
        <p className="ppv-kicker">Plus par Vexel</p>
        <h2 id="ppv-titre" className="ppv-titre">{titre}</h2>
        <p className="ppv-intro">{intro}</p>
      </header>

      {erreur && <p className="ppv-etat">Le catalogue du studio ne répond pas pour le moment. Rouvrez cette section un peu plus tard.</p>}
      {!erreur && outils === null && <p className="ppv-etat">Le catalogue arrive…</p>}
      {outils && outils.length === 0 && <p className="ppv-etat">Rien de neuf au studio pour l’instant. Les prochains outils apparaîtront ici.</p>}

      {outils?.map((o) => {
        const m = manifestes[o.id];
        return (
          <article className="ppv-carte" key={o.id}>
            <div className="ppv-corps">
              <div className="ppv-tete">
                {o.icone && <img className="ppv-icone" src={o.icone} alt="" width={64} height={64} loading="lazy" />}
                <div style={{ minWidth: 0 }}>
                  <h3 className="ppv-nom">{o.nom}</h3>
                  <p className="ppv-ligne">{o.ligne}</p>
                </div>
              </div>
              <div className="ppv-pilules">
                <span className="ppv-pilule ppv-pilule--prix">{etiquettePrix(o.prix)}</span>
                {o.plateformes && <span className="ppv-pilule">{o.plateformes}</span>}
                {m?.version && <span className="ppv-pilule">Version {m.version}</span>}
              </div>
              <p className="ppv-texte">{o.texte}</p>
              {o.prix.note && <p className="ppv-aide">{o.prix.note}</p>}
              {m?.notes && (
                <div className="ppv-version">
                  <strong>Dans la version {m.version}</strong>
                  <span>{m.notes}</span>
                </div>
              )}
              {(o.telechargements?.length || o.lien) && (
                <div className="ppv-boutons">
                  {o.telechargements?.map((t) => (
                    <a key={t.id} className="ppv-bouton" href={t.url} download>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" />
                      </svg>
                      {t.etiquette}
                    </a>
                  ))}
                  {o.lien && (
                    <a className="ppv-bouton ppv-bouton--second" href={o.lien.url} target="_blank" rel="noopener noreferrer">
                      {o.lien.etiquette}
                    </a>
                  )}
                </div>
              )}
              {o.telechargements?.some((t) => t.aide) && (
                <p className="ppv-aide">{o.telechargements.filter((t) => t.aide).map((t) => t.aide).join(' ')}</p>
              )}
              {o.ouverture?.length ? (
                <details className="ppv-details">
                  <summary>Comment l’installer</summary>
                  <ol className="ppv-ouverture">
                    {o.ouverture.map((etape, i) => <li key={i}><span>{etape}</span></li>)}
                  </ol>
                </details>
              ) : null}
            </div>
            {o.image && (
              <div className="ppv-visuel">
                <img src={o.image} alt={`${o.nom}, l’écran du programme`} loading="lazy" />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default PlusParVexel;
