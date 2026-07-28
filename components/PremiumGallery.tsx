// PremiumGallery — CSS 3D stellar masonry gallery, 2026-05-13
// Hover tilt, lightbox modal with parallax, gold Caroline branding.
// Zero extra packages — pure React + CSS 3D transforms.

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { thumb } from '../lib/img';
import EditableImage from './EditableImage';

export interface GalleryImage {
  contentKey: string;
  defaultUrl: string;
  alt: string;
  /** CSS grid span class, e.g. 'tall' | 'wide' | 'square' */
  shape: 'tall' | 'wide' | 'square';
}

interface PremiumGalleryProps {
  images: GalleryImage[];
}

// ── Tilt card ─────────────────────────────────────────────────────────────────
const TiltCard: React.FC<{
  img: GalleryImage;
  index: number;
  onClick: (img: GalleryImage) => void;
}> = ({ img, index, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  // Intersection observer — fade-in on scroll
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTilt({
      x: ((y - cy) / cy) * -9,
      y: ((x - cx) / cx) * 9,
    });
  }, []);

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  // Grid span styles
  const shapeStyle: React.CSSProperties =
    img.shape === 'tall'
      ? { gridRow: 'span 2' }
      : img.shape === 'wide'
      ? { gridColumn: 'span 2' }
      : {};

  const delay = `${index * 80}ms`;

  return (
    <div
      ref={cardRef}
      style={{
        ...shapeStyle,
        perspective: '1000px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
      }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={resetTilt}
        onClick={() => onClick(img)}
        style={{
          height: '100%',
          borderRadius: 18,
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'scale(1.025)' : 'scale(1)'}`,
          transition: hovered
            ? 'transform 0.08s linear, box-shadow 0.3s ease, border-color 0.3s ease'
            : 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease',
          border: hovered
            ? '1px solid rgba(200,169,110,0.55)'
            : '1px solid rgba(255,255,255,0.07)',
          boxShadow: hovered
            ? '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(200,169,110,0.12)'
            : '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Image */}
        <EditableImage
          contentKey={img.contentKey}
          defaultValue={img.defaultUrl}
          alt={img.alt}
          className="w-full h-full object-cover block"
        />

        {/* Tilt sheen — moves opposite to tilt for depth illusion */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: hovered
              ? `radial-gradient(ellipse at ${50 + tilt.y * 3}% ${50 - tilt.x * 3}%, rgba(200,169,110,0.12) 0%, transparent 65%)`
              : 'none',
            pointerEvents: 'none',
            transition: 'background 0.08s linear',
          }}
        />

        {/* Bottom gradient vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,12,28,0.55) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        {/* Hover zoom icon */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: '50%',
            background: 'rgba(200,169,110,0.15)',
            border: '1px solid rgba(200,169,110,0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: hovered ? 'scale(1)' : 'scale(0.7)',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <ZoomIn size={18} color="#C8A96E" />
          </div>
        </div>

        {/* Gold corner accent */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 24, height: 24,
          borderTop: '2px solid rgba(200,169,110,0.5)',
          borderRight: '2px solid rgba(200,169,110,0.5)',
          borderRadius: '0 6px 0 0',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          width: 24, height: 24,
          borderBottom: '2px solid rgba(200,169,110,0.5)',
          borderLeft: '2px solid rgba(200,169,110,0.5)',
          borderRadius: '0 0 0 6px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
};

// ── Lightbox modal ────────────────────────────────────────────────────────────
const Lightbox: React.FC<{
  img: GalleryImage;
  onClose: () => void;
}> = ({ img, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    cardRef.current.style.transition = 'transform 0.05s linear';
    cardRef.current.style.transform = `perspective(1200px) rotateX(${((y - cy) / cy) * -6}deg) rotateY(${((x - cx) / cx) * 6}deg)`;
    setTilt({ x: ((y - cy) / cy) * -6, y: ((x - cx) / cx) * 6 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
    cardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,7,20,0.92)',
        backdropFilter: 'blur(20px)',
        animation: 'lbFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lbSlideUp { from { opacity: 0; transform: perspective(1200px) translateY(40px); } to { opacity: 1; transform: perspective(1200px) translateY(0); } }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 24, right: 24,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', zIndex: 1,
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,169,110,0.15)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,169,110,0.4)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
        }}
      >
        <X size={18} />
      </button>

      {/* Image card — stops click propagation */}
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          maxWidth: '88vw',
          maxHeight: '88vh',
          border: '1px solid rgba(200,169,110,0.25)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(200,169,110,0.08)',
          cursor: 'default',
          animation: 'lbSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
      >
        <img
          src={thumb(img.defaultUrl, 1600)}
          alt={img.alt}
          style={{
            display: 'block',
            maxWidth: '88vw',
            maxHeight: '82vh',
            objectFit: 'contain',
          }}
        />
        {/* Sheen layer */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(200,169,110,0.08) 0%, transparent 60%)`,
          transition: 'background 0.05s linear',
        }} />
        {/* Gold hairline bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.5), transparent)',
        }} />
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const PremiumGallery: React.FC<PremiumGalleryProps> = ({ images }) => {
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  return (
    <>
      {/* Masonry-style grid — auto rows so tall cards span naturally */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: '240px',
          gap: '14px',
        }}
      >
        {images.map((img, i) => (
          <TiltCard key={img.contentKey} img={img} index={i} onClick={setSelected} />
        ))}
      </div>

      {/* Mobile fallback — 2 cols, no grid tricks */}
      <style>{`
        @media (max-width: 768px) {
          .premium-gallery-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            grid-auto-rows: 180px !important;
          }
          .premium-gallery-grid > div[style*="span 2"] {
            grid-column: span 2 !important;
          }
          .premium-gallery-grid > div[style*="span 2"][style*="row"] {
            grid-row: span 1 !important;
          }
        }
      `}</style>

      {selected && (
        <Lightbox img={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
};

export default PremiumGallery;
