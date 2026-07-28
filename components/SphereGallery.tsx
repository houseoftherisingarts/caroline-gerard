// SphereGallery — 3D Image Sphere adapted for Caroline Gérard branding
// Gold/midnight palette, transparent background, drag + momentum + auto-rotate.
// Based on SphereImageGrid pattern.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { thumb } from '../lib/img';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SphereImage {
  id: string;
  url: string;
  alt: string;
  description?: string;
  showDescription?: boolean;
}

export interface SphereGalleryProps {
  images: SphereImage[];
  /** Height of the outer wrapper. The sphere canvas is always square (min of width/height). */
  height?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  dragSensitivity?: number;
  /** Image scale relative to container. Default 0.28. Range 0.10–0.45. */
  baseImageScale?: number;
}

interface Position3D { x: number; y: number; z: number; }
interface SphericalPosition { theta: number; phi: number; radius: number; }
interface WorldPosition extends Position3D {
  scale: number; zIndex: number; isVisible: boolean; fadeOpacity: number; originalIndex: number;
}
interface RotationState { x: number; y: number; z: number; }
interface VelocityState { x: number; y: number; }

// ── Math helpers ──────────────────────────────────────────────────────────────

const toRad = (d: number) => d * (Math.PI / 180);
const normalizeAngle = (a: number) => {
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  return a;
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ── Lightbox ──────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ img: SphereImage; onClose: () => void }> = ({ img, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    cardRef.current.style.transition = 'transform 0.05s linear';
    cardRef.current.style.transform = `perspective(1200px) rotateX(${((e.clientY - rect.top - cy) / cy) * -6}deg) rotateY(${((e.clientX - rect.left - cx) / cx) * 6}deg)`;
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
    cardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,6,18,0.92)',
        backdropFilter: 'blur(22px)',
        animation: 'sphFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes sphFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes sphSlideUp { from { opacity:0; transform:perspective(1200px) translateY(36px) } to { opacity:1; transform:perspective(1200px) translateY(0) } }
      `}</style>

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
          animation: 'sphSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          cursor: 'default',
          // inline-flex shrinks the card to its widest child (the image),
          // so the description below inherits exactly the image's rendered width.
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 'calc(80vw + 24px)',
        }}
      >
        <img
          src={thumb(img.url, 1600)}
          alt={img.alt}
          style={{
            display: 'block',
            maxWidth: '80vw',
            maxHeight: '70vh',
            width: 'auto',
            objectFit: 'contain',
            borderRadius: 12,
          }}
        />
        {img.showDescription && img.description && (
          <>
            <div style={{
              alignSelf: 'stretch',
              height: 2,
              background: 'linear-gradient(90deg, transparent, #C8A96E, transparent)',
              marginTop: 10, borderRadius: 1,
            }} />
            <p style={{
              // width:0 + minWidth:100% keeps the paragraph from pushing the card wider
              // than the image; it still fills the card's actual width.
              width: 0,
              minWidth: '100%',
              boxSizing: 'border-box',
              margin: '12px 0 0',
              color: 'rgba(200,169,110,0.9)',
              fontSize: 14,
              lineHeight: 1.6,
              textAlign: 'center',
              fontWeight: 500,
              letterSpacing: '0.02em',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}>
              {img.description}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main sphere component ─────────────────────────────────────────────────────

const MIN_SPHERE_NODES = 25;

const SphereGallery: React.FC<SphereGalleryProps> = ({
  images = [],
  height = 560,
  autoRotate = true,
  autoRotateSpeed = 0.25,
  dragSensitivity = 0.5,
  baseImageScale: baseImageScaleProp,
}) => {
  // Pad images to MIN_SPHERE_NODES by cycling through them
  const paddedImages: SphereImage[] = images.length === 0 ? images : Array.from(
    { length: Math.max(images.length, MIN_SPHERE_NODES) },
    (_, i) => ({ ...images[i % images.length], id: `${images[i % images.length].id}__${i}` })
  );

  const [isMounted, setIsMounted] = useState(false);
  const [containerSize, setContainerSize] = useState(500);
  const [rotation, setRotation] = useState<RotationState>({ x: 15, y: 15, z: 0 });
  const [velocity, setVelocity] = useState<VelocityState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SphereImage | null>(null);
  const [imagePositions, setImagePositions] = useState<SphericalPosition[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const velocityRef = useRef<VelocityState>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { velocityRef.current = velocity; }, [velocity]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  const sphereRadius = containerSize * 0.42;
  const baseImageSize = containerSize * (baseImageScaleProp ?? 0.42);
  const maxRotationSpeed = 5;

  // ── Responsive container size ───────────────────────────────────────────────

  useEffect(() => {
    const measure = () => {
      if (wrapperRef.current) {
        const w = wrapperRef.current.offsetWidth;
        setContainerSize(Math.min(w, height));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [height]);

  // ── Generate sphere positions ───────────────────────────────────────────────

  const generateSpherePositions = useCallback((): SphericalPosition[] => {
    const n = paddedImages.length;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = 2 * Math.PI / goldenRatio;

    return paddedImages.map((_, i) => {
      const t = i / n;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;

      let phi = inclination * (180 / Math.PI);
      let theta = (azimuth * (180 / Math.PI)) % 360;

      const poleBonus = Math.pow(Math.abs(phi - 90) / 90, 0.6) * 35;
      phi = phi < 90
        ? Math.max(5, phi - poleBonus)
        : Math.min(175, phi + poleBonus);
      phi = 15 + (phi / 180) * 150;

      theta = (theta + (Math.random() - 0.5) * 20) % 360;
      phi = clamp(phi + (Math.random() - 0.5) * 10, 0, 180);

      return { theta, phi, radius: sphereRadius };
    });
  }, [paddedImages.length, sphereRadius]);

  useEffect(() => {
    setImagePositions(generateSpherePositions());
  }, [generateSpherePositions]);

  // ── Calculate world positions ───────────────────────────────────────────────

  const calculateWorldPositions = useCallback((): WorldPosition[] => {
    const positions = imagePositions.map((pos, index) => {
      const thetaRad = toRad(pos.theta);
      const phiRad = toRad(pos.phi);
      const rotXRad = toRad(rotation.x);
      const rotYRad = toRad(rotation.y);

      let x = pos.radius * Math.sin(phiRad) * Math.cos(thetaRad);
      let y = pos.radius * Math.cos(phiRad);
      let z = pos.radius * Math.sin(phiRad) * Math.sin(thetaRad);

      // Y-axis rotation
      const x1 = x * Math.cos(rotYRad) + z * Math.sin(rotYRad);
      const z1 = -x * Math.sin(rotYRad) + z * Math.cos(rotYRad);
      x = x1; z = z1;

      // X-axis rotation
      const y2 = y * Math.cos(rotXRad) - z * Math.sin(rotXRad);
      const z2 = y * Math.sin(rotXRad) + z * Math.cos(rotXRad);
      y = y2; z = z2;

      const fadeStart = -10;
      const fadeEnd = -30;
      const isVisible = z > fadeEnd;
      const fadeOpacity = z <= fadeStart
        ? Math.max(0, (z - fadeEnd) / (fadeStart - fadeEnd))
        : 1;

      const isPoleImage = pos.phi < 30 || pos.phi > 150;
      const distFromCenter = Math.sqrt(x * x + y * y);
      const distRatio = Math.min(distFromCenter / sphereRadius, 1);
      const distPenalty = isPoleImage ? 0.4 : 0.7;
      const centerScale = Math.max(0.3, 1 - distRatio * distPenalty);
      const depthScale = (z + sphereRadius) / (2 * sphereRadius);
      const scale = centerScale * Math.max(0.5, 0.8 + depthScale * 0.3);

      return {
        x, y, z, scale,
        zIndex: Math.round(1000 + z),
        isVisible, fadeOpacity,
        originalIndex: index,
      };
    });

    // Collision detection
    return positions.map((pos, i) => {
      if (!pos.isVisible) return pos;
      let adjustedScale = pos.scale;
      const imgSize = baseImageSize * adjustedScale;

      for (let j = 0; j < positions.length; j++) {
        if (i === j || !positions[j].isVisible) continue;
        const other = positions[j];
        const otherSize = baseImageSize * other.scale;
        const dx = pos.x - other.x;
        const dy = pos.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (imgSize + otherSize) / 2 + 25;
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          adjustedScale = Math.min(adjustedScale, adjustedScale * Math.max(0.4, 1 - (overlap / minDist) * 0.6));
        }
      }
      return { ...pos, scale: Math.max(0.25, adjustedScale) };
    });
  }, [imagePositions, rotation, sphereRadius, baseImageSize]);

  // ── Animation loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isMounted) return;

    const animate = () => {
      if (!isDraggingRef.current) {
        setVelocity(prev => {
          const next = { x: prev.x * 0.95, y: prev.y * 0.95 };
          if (!autoRotate && Math.abs(next.x) < 0.01 && Math.abs(next.y) < 0.01) return { x: 0, y: 0 };
          return next;
        });

        setRotation(prev => ({
          x: normalizeAngle(prev.x + clamp(velocityRef.current.x, -maxRotationSpeed, maxRotationSpeed)),
          y: normalizeAngle(prev.y + (autoRotate ? autoRotateSpeed : 0) + clamp(velocityRef.current.y, -maxRotationSpeed, maxRotationSpeed)),
          z: prev.z,
        }));
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);
    return () => { if (animationFrame.current) cancelAnimationFrame(animationFrame.current); };
  }, [isMounted, autoRotate, autoRotateSpeed]);

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const delta = { x: clamp(-dy * dragSensitivity, -maxRotationSpeed, maxRotationSpeed), y: clamp(dx * dragSensitivity, -maxRotationSpeed, maxRotationSpeed) };
      setRotation(prev => ({ x: normalizeAngle(prev.x + delta.x), y: normalizeAngle(prev.y + delta.y), z: prev.z }));
      setVelocity(delta);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => setIsDragging(false);

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - lastMousePos.current.x;
      const dy = touch.clientY - lastMousePos.current.y;
      const delta = { x: clamp(-dy * dragSensitivity, -maxRotationSpeed, maxRotationSpeed), y: clamp(dx * dragSensitivity, -maxRotationSpeed, maxRotationSpeed) };
      setRotation(prev => ({ x: normalizeAngle(prev.x + delta.x), y: normalizeAngle(prev.y + delta.y), z: prev.z }));
      setVelocity(delta);
      lastMousePos.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMounted, dragSensitivity]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
    lastMousePos.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  useEffect(() => { setIsMounted(true); }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const worldPositions = calculateWorldPositions();

  return (
    <>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Outer wrapper — sphere canvas only, gradient mask fades bottom so hint never overlaps */}
        <div
          ref={wrapperRef}
          style={{
            position: 'relative',
            width: '100%',
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
          }}
        >
          {/* gold base glow */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: containerSize * 0.7,
            height: containerSize * 0.7,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Sphere canvas */}
          {isMounted && (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              style={{
                position: 'relative',
                width: containerSize,
                height: containerSize,
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                perspective: '1000px',
                flexShrink: 0,
              }}
            >
              {/* ── Constellation lines ─────────────────────────────────────── */}
              <svg
                width={containerSize}
                height={containerSize}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  pointerEvents: 'none',
                  zIndex: 1,
                  overflow: 'visible',
                }}
              >
                <defs>
                  <filter id="sph-line-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g filter="url(#sph-line-glow)">
                  {worldPositions.map((posA, i) => {
                    if (!posA.isVisible) return null;
                    const x1 = containerSize / 2 + posA.x;
                    const y1 = containerSize / 2 + posA.y;
                    const maxDist = containerSize * 0.32;

                    return worldPositions.slice(i + 1).map((posB, j) => {
                      if (!posB.isVisible) return null;
                      const x2 = containerSize / 2 + posB.x;
                      const y2 = containerSize / 2 + posB.y;
                      const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
                      if (dist > maxDist) return null;

                      const distFade = 1 - dist / maxDist;
                      const depthFade = (posA.fadeOpacity + posB.fadeOpacity) / 2;
                      const opacity = distFade * depthFade * 0.65;

                      return (
                        <line
                          key={`${i}-${i + 1 + j}`}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#C8A96E"
                          strokeWidth={1.2}
                          strokeOpacity={opacity}
                        />
                      );
                    });
                  })}
                </g>
              </svg>

              {paddedImages.map((image, index) => {
                const position = worldPositions[index];
                if (!position || !position.isVisible) return null;

                const imgSize = baseImageSize * position.scale;
                const isHovered = hoveredIndex === index;
                const finalScale = isHovered ? Math.min(1.3, 1.3 / position.scale) : 1;

                return (
                  <div
                    key={image.id}
                    style={{
                      position: 'absolute',
                      width: imgSize,
                      height: imgSize,
                      left: containerSize / 2 + position.x,
                      top: containerSize / 2 + position.y,
                      opacity: position.fadeOpacity,
                      transform: `translate(-50%, -50%) scale(${finalScale})`,
                      zIndex: position.zIndex,
                      transition: 'transform 0.2s ease-out',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: isHovered
                          ? '2px solid rgba(200,169,110,0.95)'
                          : '1.5px solid rgba(200,169,110,0.5)',
                        boxShadow: isHovered
                          ? '0 0 28px rgba(200,169,110,0.8), 0 0 60px rgba(200,169,110,0.35), 0 8px 32px rgba(0,0,0,0.6)'
                          : '0 0 16px rgba(200,169,110,0.35), 0 0 40px rgba(200,169,110,0.15), 0 4px 20px rgba(0,0,0,0.5)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <img
                        src={thumb(image.url, 400)}
                        alt={image.alt}
                        draggable={false}
                        loading={index < 4 ? 'eager' : 'lazy'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hint pill — below the gradient fade zone, always visible */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 12,
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 10,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', borderRadius: 100,
            background: 'rgba(8,10,24,0.72)',
            border: '1px solid rgba(200,169,110,0.18)',
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(200,169,110,0.7)', letterSpacing: '0.1em' }}>
              Glisser pour explorer · Cliquer pour agrandir
            </span>
          </div>
        </div>
      </div>

      {selectedImage && <Lightbox img={selectedImage} onClose={() => setSelectedImage(null)} />}
    </>
  );
};

export default SphereGallery;
