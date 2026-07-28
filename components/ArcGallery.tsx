// ArcGallery — photos displayed along an arc, Caroline Gérard branding
// Inspired by ArcGalleryHero pattern. No Three.js — pure CSS + React.
// Gold/midnight palette, transparent background (site starfield shows through).

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { thumb } from '../lib/img'

export interface ArcImage {
  id: string
  url: string
  alt: string
}

interface ArcGalleryProps {
  images: ArcImage[]
  height?: number
}

// ── Responsive size helper ────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ img: ArcImage; onClose: () => void }> = ({ img, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    cardRef.current.style.transition = 'transform 0.05s linear'
    cardRef.current.style.transform = `perspective(1200px) rotateX(${((y - cy) / cy) * -6}deg) rotateY(${((x - cx) / cx) * 6}deg)`
  }, [])

  const onMouseLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)'
    cardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)'
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,6,18,0.92)',
        backdropFilter: 'blur(22px)',
        animation: 'arcLbFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes arcLbFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes arcLbSlideUp { from { opacity:0; transform:perspective(1200px) translateY(36px) } to { opacity:1; transform:perspective(1200px) translateY(0) } }
      `}</style>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 22, right: 22,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(200,169,110,0.1)',
          border: '1px solid rgba(200,169,110,0.35)',
          color: '#C8A96E', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={18} />
      </button>

      {/* Tilt card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(200,169,110,0.3)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 80px rgba(200,169,110,0.1)',
          background: '#080a18',
          padding: 12,
          animation: 'arcLbSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          cursor: 'default',
        }}
      >
        <img
          src={thumb(img.url, 1600)}
          alt={img.alt}
          style={{
            display: 'block',
            maxWidth: '80vw',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: 12,
          }}
        />
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, #C8A96E, transparent)',
          marginTop: 10,
          borderRadius: 1,
        }} />
      </div>
    </div>
  )
}

// ── Arc card ──────────────────────────────────────────────────────────────────

const ArcCard: React.FC<{
  img: ArcImage
  x: number
  y: number
  angleDeg: number
  size: number
  delay: number
  onClick: () => void
}> = ({ img, x, y, angleDeg, size, delay, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  // Slight tilt on each card following the arc curvature
  const tiltDeg = angleDeg / 5

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        bottom: `${y}px`,
        width: size,
        height: size * 1.3,
        transform: `translateX(-50%) rotate(${tiltDeg}deg) ${hovered ? 'scale(1.15) translateY(-8px)' : 'scale(1)'}`,
        transition: hovered
          ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, opacity 0.6s ease'
          : 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, opacity 0.6s ease',
        opacity: visible ? 1 : 0,
        cursor: 'pointer',
        zIndex: hovered ? 20 : 10,
        borderRadius: 14,
        overflow: 'hidden',
        background: '#080a18',
        padding: 6,
        boxShadow: hovered
          ? '0 28px 56px rgba(200,169,110,0.4), 0 0 28px rgba(200,169,110,0.2)'
          : '0 16px 40px rgba(0,0,0,0.7)',
        border: hovered
          ? '1.5px solid rgba(200,169,110,0.65)'
          : '1px solid rgba(200,169,110,0.2)',
      }}
    >
      <img
        src={img.url}
        alt={img.alt}
        draggable={false}
        style={{
          width: '100%',
          height: '88%',
          objectFit: 'cover',
          borderRadius: 10,
          display: 'block',
        }}
      />
      {/* Gold hairline */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.55), transparent)',
        margin: '5px 0 3px',
      }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const ArcGallery: React.FC<ArcGalleryProps> = ({ images, height = 540 }) => {
  const [selected, setSelected] = useState<ArcImage | null>(null)
  const windowWidth = useWindowWidth()

  // Responsive radius and card size
  const radius = windowWidth >= 1024 ? 480 : windowWidth >= 640 ? 360 : 240
  const cardSize = windowWidth >= 1024 ? 120 : windowWidth >= 640 ? 100 : 82

  // Arc parameters — images spread from left to right along a bottom arc
  const startAngle = 195  // degrees (leftmost, below horizon)
  const endAngle = 345    // degrees (rightmost, below horizon)

  // Orbit rings for depth
  const ringStyles = [
    { r: radius * 0.72, opacity: 0.05 },
    { r: radius * 0.92, opacity: 0.035 },
    { r: radius * 1.08, opacity: 0.02 },
  ]

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          overflow: 'hidden',
        }}
      >
        {/* Subtle gold glow at base */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          height: 120,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(200,169,110,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* SVG arc rings — decorative */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox={`0 0 ${Math.max(windowWidth, 320)} ${height}`}
          preserveAspectRatio="xMidYMax meet"
        >
          {ringStyles.map((ring, i) => (
            <ellipse
              key={i}
              cx={Math.max(windowWidth, 320) / 2}
              cy={height + ring.r * 0.1}
              rx={ring.r}
              ry={ring.r * 0.32}
              fill="none"
              stroke="#C8A96E"
              strokeWidth="0.8"
              opacity={ring.opacity}
            />
          ))}
        </svg>

        {/* Arc cards */}
        {images.map((img, i) => {
          const n = images.length
          const t = n === 1 ? 0.5 : i / (n - 1)
          const angleDeg = startAngle + t * (endAngle - startAngle)
          const angleRad = (angleDeg * Math.PI) / 180
          const x = Math.cos(angleRad) * radius
          const y = -Math.sin(angleRad) * radius * 0.38 + 20

          return (
            <ArcCard
              key={img.id}
              img={img}
              x={x}
              y={Math.max(0, y)}
              angleDeg={angleDeg - 270}
              size={cardSize}
              delay={i * 90}
              onClick={() => setSelected(img)}
            />
          )
        })}

        {/* Instruction hint */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 16px', borderRadius: 100,
          background: 'rgba(8,10,24,0.72)',
          border: '1px solid rgba(200,169,110,0.18)',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(200,169,110,0.7)', letterSpacing: '0.1em' }}>
            Cliquer pour agrandir
          </span>
        </div>
      </div>

      {selected && (
        <Lightbox img={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

export default ArcGallery
