// StellarGallery — Three.js floating card galaxy, Caroline Gérard branding
// Adapted from the Stellar Card Gallery pattern, gold/midnight palette.
import React, {
  Suspense, useEffect, useMemo, useRef, useState,
  createContext, useContext,
} from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Sphere } from '@react-three/drei'
import { X } from 'lucide-react'
import { thumb } from '../lib/img'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StellarImage {
  id: string
  url: string
  alt: string
}

// ── Gallery context ───────────────────────────────────────────────────────────

type GalleryCtx = {
  selected: StellarImage | null
  setSelected: (img: StellarImage | null) => void
  images: StellarImage[]
}

const GalleryContext = createContext<GalleryCtx | undefined>(undefined)

function useGallery() {
  const ctx = useContext(GalleryContext)
  if (!ctx) throw new Error('useGallery used outside GalleryProvider')
  return ctx
}

// ── Floating image card (Three.js scene object) ───────────────────────────────

function FloatingCard({
  image,
  position,
}: {
  image: StellarImage
  position: { x: number; y: number; z: number }
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const { setSelected } = useGallery()

  // Always face the camera
  useFrame(({ camera }) => {
    if (groupRef.current) groupRef.current.lookAt(camera.position)
  })

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Invisible click plane */}
      <mesh
        onClick={(e) => { e.stopPropagation(); setSelected(image) }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <planeGeometry args={[4.5, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* HTML card — rendered in 3D space via drei/Html */}
      <Html
        transform
        distanceFactor={10}
        position={[0, 0, 0.01]}
        style={{
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.18)' : 'scale(1)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 148,
            height: 196,
            borderRadius: 14,
            overflow: 'hidden',
            background: '#080a18',
            padding: 8,
            boxShadow: hovered
              ? '0 28px 56px rgba(200,169,110,0.45), 0 0 32px rgba(200,169,110,0.22)'
              : '0 16px 32px rgba(0,0,0,0.65)',
            border: hovered
              ? '1.5px solid rgba(200,169,110,0.65)'
              : '1px solid rgba(200,169,110,0.18)',
            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          }}
        >
          <img
            src={thumb(image.url, 600)}
            alt={image.alt}
            draggable={false}
            style={{
              width: '100%',
              height: 152,
              objectFit: 'cover',
              borderRadius: 8,
              display: 'block',
            }}
          />
          {/* Gold hairline */}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(200,169,110,0.5), transparent)',
            margin: '6px 0 4px',
          }} />
        </div>
      </Html>
    </group>
  )
}

// ── Card galaxy (sphere distribution) ────────────────────────────────────────

function CardGalaxy() {
  const { images } = useGallery()

  const positions = useMemo(() => {
    const n = images.length
    const golden = (1 + Math.sqrt(5)) / 2
    return images.map((_, i) => {
      const y = 1 - (i / Math.max(n - 1, 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = (2 * Math.PI * i) / golden
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      const radius = 12 + (i % 3) * 3.5
      return { x: x * radius, y: y * radius, z: z * radius }
    })
  }, [images.length])

  return (
    <>
      {/* Wireframe orbit rings — gold tones */}
      <Sphere args={[11, 32, 32]}>
        <meshStandardMaterial color="#C8A96E" transparent opacity={0.04} wireframe />
      </Sphere>
      <Sphere args={[15, 32, 32]}>
        <meshStandardMaterial color="#C8A96E" transparent opacity={0.025} wireframe />
      </Sphere>
      <Sphere args={[19, 32, 32]}>
        <meshStandardMaterial color="#C8A96E" transparent opacity={0.015} wireframe />
      </Sphere>

      {images.map((img, i) => {
        const pos = positions[i] ?? { x: 0, y: 0, z: 0 }
        return React.createElement(FloatingCard, { key: img.id, image: img, position: pos })
      })}
    </>
  )
}

// ── Lightbox modal ────────────────────────────────────────────────────────────

function GalleryModal() {
  const { selected, setSelected } = useGallery()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [selected, setSelected])

  if (!selected) return null

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    cardRef.current.style.transition = 'transform 0.05s linear'
    cardRef.current.style.transform =
      `perspective(1000px) rotateX(${((y - cy) / cy) * -7}deg) rotateY(${((x - cx) / cx) * 7}deg)`
  }

  const onMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transition = 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)'
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div
      onClick={() => setSelected(null)}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,6,18,0.88)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Close */}
      <button
        onClick={() => setSelected(null)}
        style={{
          position: 'absolute', top: 20, right: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(200,169,110,0.1)',
          border: '1px solid rgba(200,169,110,0.35)',
          color: '#C8A96E', cursor: 'pointer', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          cursor: 'default',
          background: '#080a18',
          padding: 12,
        }}
      >
        <img
          src={thumb(selected.url, 1600)}
          alt={selected.alt}
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

// ── Main component ────────────────────────────────────────────────────────────

interface StellarGalleryProps {
  images: StellarImage[]
  height?: string | number
}

const StellarGallery: React.FC<StellarGalleryProps> = ({ images, height = 640 }) => {
  const [selected, setSelected] = useState<StellarImage | null>(null)

  return (
    <GalleryContext.Provider value={{ selected, setSelected, images }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 24,
          overflow: 'hidden',
          /* No background — site's existing starfield shows through */
        }}
      >
        {/* Three.js galaxy — transparent so site starfield is the backdrop */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Canvas
          camera={{ position: [0, 0, 22], fov: 58 }}
          gl={{ alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0)
            gl.domElement.style.pointerEvents = 'auto'
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={0.7} color="#C8A96E" />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />
            <CardGalaxy />
            <OrbitControls
              enablePan={false}
              enableZoom
              enableRotate
              minDistance={8}
              maxDistance={38}
              autoRotate
              autoRotateSpeed={0.6}
              rotateSpeed={0.45}
              zoomSpeed={1.0}
            />
          </Suspense>
        </Canvas>
        </div>

        {/* Instruction hint */}
        <div style={{
          position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 100,
          background: 'rgba(8,10,24,0.75)',
          border: '1px solid rgba(200,169,110,0.2)',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(200,169,110,0.7)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            Glisser pour explorer · Défiler pour zoomer · Cliquer pour agrandir
          </span>
        </div>

        {/* Modal overlay */}
        <GalleryModal />
      </div>
    </GalleryContext.Provider>
  )
}

export default StellarGallery
