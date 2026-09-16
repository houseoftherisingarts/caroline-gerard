// CollantVexel — le collant foil du pied de page, présent sur tous les sites Vexel sauf
// vexelwebstudio.com lui-même. Porté de xena-horizon-platform (3)/components/BadgeVexel.tsx :
// même liseré découpé, même reflet holographique qui suit le pointeur, même clic qui ouvre
// une carte avant de renvoyer vers vexelwebstudio.com. Autonome (styles inline, comme
// BadgeVexel.tsx dans ce même dossier) pour ne dépendre d'aucun token Tailwind du site hôte.
import { useCallback, useEffect, useRef, useState } from 'react';

const TEXTES = {
  FR: {
    kicker: 'Site créé par',
    nom: 'Vexel Webstudio',
    sousTitre: 'un projet créatif du Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: "Site créé par Vexel Webstudio : en savoir plus",
    titre: 'Un site comme celui-ci',
    corps: "Ce site a été bâti par Vexel Webstudio, un studio web fondé au Salon des Inconnus.",
    oui: 'Voir Vexel Webstudio',
    fermer: 'Fermer',
  },
  EN: {
    kicker: 'Site by',
    nom: 'Vexel Webstudio',
    sousTitre: 'a creative project of Le Salon des Inconnus',
    salon: 'Le Salon des Inconnus',
    libelle: 'Site by Vexel Webstudio: learn more',
    titre: 'A site like this one',
    corps: 'This site was built by Vexel Webstudio, a web studio founded at Le Salon des Inconnus.',
    oui: 'Visit Vexel Webstudio',
    fermer: 'Close',
  },
};

const VEXEL_URL = 'https://vexelwebstudio.com';
const SALON_URL = 'https://lesalondesinconnus.com/';
const LOGO_SALON = '/salon-logo-or.png';

const style = `
.cv-foil {
  --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.1rem;
  border-radius: 15px;
  border: 2px solid #fff;
  color: #fff;
  text-decoration: none;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(120% 120% at var(--mx) var(--my), rgb(255 255 255 / 0.18), transparent 55%),
    linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 10px 24px -10px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25);
  transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 220ms ease, box-shadow 220ms ease;
}
.cv-foil:hover { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 18px 34px -12px rgb(0 0 0 / 0.65), inset 0 1px 0 rgb(255 255 255 / 0.35); }
.cv-sheen {
  position: absolute; inset: -40%; pointer-events: none; z-index: 0;
  background: repeating-conic-gradient(from 200deg at var(--mx) var(--my),
    #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
  opacity: 0.16; mix-blend-mode: color-dodge; filter: saturate(1.2) blur(2px);
  transition: opacity 260ms ease;
}
.cv-foil:hover .cv-sheen { opacity: 0.32; }
.cv-foil > *:not(.cv-sheen) { position: relative; z-index: 1; }
.cv-overlay {
  position: fixed; inset: 0; z-index: 900;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
  background: rgba(10,10,12,0.6); backdrop-filter: blur(4px);
}
.cv-carte {
  position: relative;
  width: 100%; max-width: 480px;
  border-radius: 15px;
  background: #101012;
  border: 1px solid rgba(255,255,255,0.14);
  color: #f2f2f2;
  padding: 2rem;
  text-align: center;
}
.cv-carte-fermer {
  position: absolute; top: 0.75rem; right: 0.75rem;
  width: 2.25rem; height: 2.25rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 999px; border: none; background: transparent; color: #9a9a9f; cursor: pointer;
}
.cv-carte-fermer:hover { color: #f2f2f2; }
.cv-bouton {
  display: inline-flex; align-items: center; justify-content: center;
  margin-top: 1.25rem; min-height: 44px; padding: 0 1.4rem;
  border-radius: 999px; background: #d4af37; color: #101012; font-weight: 600;
  text-decoration: none;
}
.cv-salon { display: inline-block; margin-top: 1.5rem; }
`;

export interface CollantVexelProps {
  lang?: 'FR' | 'EN';
  className?: string;
}

export function CollantVexel({ lang = 'FR', className = '' }: CollantVexelProps) {
  const t = TEXTES[lang];
  const ref = useRef<HTMLAnchorElement>(null);
  const ouiRef = useRef<HTMLAnchorElement>(null);
  const [ouverte, setOuverte] = useState(false);

  const suivre = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
  }, []);
  const relacher = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '30%');
    el.style.setProperty('--my', '30%');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  const ouvrir = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setOuverte(true);
  };

  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuverte(false);
    };
    window.addEventListener('keydown', onKey);
    const minuterie = window.setTimeout(() => ouiRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(minuterie);
    };
  }, [ouverte]);

  return (
    <>
      <style>{style}</style>
      <a
        ref={ref}
        href={VEXEL_URL}
        onClick={ouvrir}
        aria-haspopup="dialog"
        aria-expanded={ouverte}
        aria-label={t.libelle}
        onPointerMove={suivre}
        onPointerLeave={relacher}
        className={`cv-foil ${className}`}
      >
        <span aria-hidden className="cv-sheen" />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.7)' }}>
            {t.kicker}
          </span>
          <span style={{ marginTop: '0.25rem', fontSize: '1.05rem' }}>{t.nom}</span>
        </span>
      </a>

      {ouverte && (
        <div className="cv-overlay" role="presentation" onClick={() => setOuverte(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collant-vexel-titre"
            className="cv-carte"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="cv-carte-fermer" aria-label={t.fermer} onClick={() => setOuverte(false)}>
              ✕
            </button>
            <p style={{ fontSize: '0.75rem', color: '#9a9a9f', margin: 0 }}>{t.sousTitre}</p>
            <h2 id="collant-vexel-titre" style={{ marginTop: '0.5rem', fontSize: '1.25rem' }}>{t.titre}</h2>
            <p style={{ marginTop: '0.75rem', color: '#c7c7cc' }}>{t.corps}</p>
            <a
              ref={ouiRef}
              href={VEXEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOuverte(false)}
              className="cv-bouton"
            >
              {t.oui}
            </a>
            <a href={SALON_URL} target="_blank" rel="noopener noreferrer" aria-label={t.salon} className="cv-salon">
              <img src={LOGO_SALON} alt={t.salon} style={{ height: '2.5rem', width: 'auto' }} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}

export default CollantVexel;
