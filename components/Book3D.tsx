import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Book } from '../types';
import { thumb } from '../lib/img';

// ─── Dimensions ───────────────────────────────────────────────────────────────
const W = 200;   // cover width  (px) — 200×300 = 2:3 ratio matches 400×600 cover images
const H = 300;   // cover height (px)
const D = 34;    // spine depth  (px)

// ─── Helper: single face of the 3-D box ───────────────────────────────────────
const Face: React.FC<{
  width: number;
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  className?: string;
}> = ({ width, height, style, children, className }) => (
  <div
    className={`absolute backface-hidden overflow-hidden ${className ?? ''}`}
    style={{ width, height, ...style }}
  >
    {children}
  </div>
);

interface Book3DProps {
  book: Book;
  isOpen?: boolean;
  onToggle?: () => void;
  onAddToCart?: (book: Book) => void;
}

const Book3D: React.FC<Book3DProps> = ({ book, isOpen, onToggle, onAddToCart }) => {
  const [hovered, setHovered] = useState(false);
  const interactive = !!onToggle;

  // Angle changes on hover → appears to lift and face you
  const rotY = hovered ? -12 : -26;
  const rotX = hovered ? 1  :  4;
  const lift  = hovered ? -10 : 0;

  // Spine colour derived from book.color with a darkened tone
  const spineBg = book.color ?? '#1e293b';

  return (
    <div
      style={{ perspective: '1400px', perspectiveOrigin: '50% 38%', cursor: interactive ? 'pointer' : 'default' }}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/*
       *  Outer wrapper — positions the whole book in its column,
       *  adds the drop-shadow beneath it.
       */}
      <div style={{ position: 'relative', width: W, height: H + 40, margin: '0 auto' }}>

        {/* ── Cast shadow (ground plane) ─────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '8%',
            width: '84%',
            height: 28,
            background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 70%)',
            filter: 'blur(6px)',
            transition: 'opacity 0.5s',
            opacity: hovered ? 0.45 : 0.7,
          }}
        />

        {/* ── 3-D book group ────────────────────────────────────────────────── */}
        <div
          className="preserve-3d"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            transform: `translateY(${lift}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transition: 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >

          {/* ── FRONT COVER ──────────────────────────────────────────────────── */}
          <Face
            width={W}
            height={H}
            style={{
              transform: `translateZ(${D / 2}px)`,
              borderRadius: '0 3px 3px 0',
              boxShadow: `
                inset -1px 0 0 rgba(0,0,0,0.25),
                6px 12px 40px rgba(0,0,0,0.6),
                0 0 0 0.5px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Cover image */}
            <img
              src={thumb(book.image, 600)}
              alt={book.title}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Spine shadow — darkens the left 12 % of the cover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.08) 12%, transparent 28%)',
              pointerEvents: 'none',
            }} />
            {/* Gloss highlight — upper-left catch-light */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 30%, transparent 55%)',
              pointerEvents: 'none',
            }} />
            {/* Right-edge subtle darkening */}
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 6,
              background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.18))',
              pointerEvents: 'none',
            }} />
          </Face>

          {/* ── SPINE (left face) ────────────────────────────────────────────── */}
          {/*
           *  Positioned at left: -D/2 so its centre aligns with the
           *  left edge of the front/back cover planes (x = 0).
           *  rotateY(-90deg) around that centre makes it perpendicular.
           */}
          <Face
            width={D}
            height={H}
            style={{
              left: -(D / 2),
              transformOrigin: 'center center',
              transform: 'rotateY(-90deg)',
              background: `linear-gradient(
                180deg,
                rgba(0,0,0,0.85) 0%,
                ${spineBg}cc 18%,
                ${spineBg}dd 50%,
                ${spineBg}cc 82%,
                rgba(0,0,0,0.85) 100%
              )`,
              boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.4), inset 4px 0 4px rgba(255,255,255,0.05)',
            }}
          >
            {/* Vertical title on spine */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <span style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.75)',
                fontFamily: '"Playfair Display", serif',
                whiteSpace: 'nowrap',
                maxHeight: H - 24,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 2px',
              }}>
                {book.title}
              </span>
            </div>
            {/* Spine gloss */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
              pointerEvents: 'none',
            }} />
          </Face>

          {/* ── PAGES EDGE (right face) ──────────────────────────────────────── */}
          {/*
           *  Mirror of spine — positioned so its centre is at x = W.
           *  rotateY(90deg) makes it face rightward.
           */}
          <Face
            width={D}
            height={H}
            className="book-pages-fan"
            style={{
              right: -(D / 2),
              transformOrigin: 'center center',
              transform: 'rotateY(90deg)',
            }}
          >
            {/* Simulated page stack via repeating gradient */}
            <div style={{
              width: '100%',
              height: '100%',
              background: `repeating-linear-gradient(
                90deg,
                #f7f3ec 0px,
                #f7f3ec 1.5px,
                #ede8de 1.5px,
                #ede8de 3px,
                #f2ede3 3px,
                #f2ede3 5px
              )`,
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.18), inset -4px 0 6px rgba(0,0,0,0.12)',
            }} />
          </Face>

          {/* ── TOP EDGE ─────────────────────────────────────────────────────── */}
          <Face
            width={W}
            height={D}
            style={{
              top: -(D / 2),
              transformOrigin: 'center center',
              transform: 'rotateX(90deg)',
              background: 'linear-gradient(180deg, #f4efe6 0%, #e8e0d0 100%)',
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.12)',
            }}
          />

          {/* ── BOTTOM EDGE ──────────────────────────────────────────────────── */}
          <Face
            width={W}
            height={D}
            style={{
              bottom: -(D / 2),
              transformOrigin: 'center center',
              transform: 'rotateX(-90deg)',
              background: 'linear-gradient(180deg, #e8e0d0 0%, #ddd5c5 100%)',
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.18)',
            }}
          />

          {/* ── BACK COVER ───────────────────────────────────────────────────── */}
          <Face
            width={W}
            height={H}
            style={{
              transform: `rotateY(180deg) translateZ(${D / 2}px)`,
              borderRadius: '0 3px 3px 0',
            }}
          >
            <img
              src={thumb(book.backImage ?? book.image, 600)}
              alt="4e de couverture"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 30%)',
              pointerEvents: 'none',
            }} />
          </Face>

        </div>{/* end book group */}

        {/* ── Hover hint ────────────────────────────────────────────────────── */}
        {interactive && (
          <div style={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(212,175,55,0.35)',
            color: '#d4af37',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
          }}>
            <BookOpen size={11} /> Feuilleter
          </div>
        )}

        {/* ── Add-to-cart button (when opened in flip modal context) ─────────── */}
        {isOpen && onAddToCart && (
          <button
            onClick={e => { e.stopPropagation(); onAddToCart(book); if (onToggle) onToggle(); }}
            style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 24px',
              background: '#d4af37',
              color: '#0f172a',
              fontWeight: 800,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              zIndex: 50,
              boxShadow: '0 6px 24px rgba(212,175,55,0.4)',
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            Ajouter au panier
          </button>
        )}

      </div>{/* end outer wrapper */}
    </div>
  );
};

export default Book3D;
