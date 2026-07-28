import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Galaxy canvas
//
// Two independent behaviours:
//  1. The galaxy drifts its center in a slow elliptical orbit on its own
//     while spinning — completely autonomous.
//  2. A small cluster of ~45 stars orbits the current mouse position.
// ---------------------------------------------------------------------------

interface GalaxyStar {
  r: number;
  angle: number;
  speed: number;         // differential rotation per frame
  yFlatten: number;
  z: number;
  size: number;
  isGold: boolean;
  twinkleOffset: number;
}

interface MouseOrbitStar {
  angle: number;         // current orbit angle
  orbitSpeed: number;
  orbitRadius: number;
  size: number;
  isGold: boolean;
  twinkleOffset: number;
}

interface BgStar {
  x: number; y: number; size: number; alpha: number;
}

const GalaxyCanvas = () => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const targetMouse  = useRef({ x: -1, y: -1 }); // pixel, -1 = not yet moved
  const smoothMouse  = useRef({ x: -1, y: -1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      targetMouse.current = { x: e.clientX, y: e.clientY };
      if (smoothMouse.current.x === -1) smoothMouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Spiral galaxy stars (2 arms, heavily scattered at outer radii) ─────
    const galaxyStars: GalaxyStar[] = [];
    for (let i = 0; i < 1200; i++) {
      const arm          = i % 2;
      const armAngle     = arm * Math.PI;
      const r            = Math.pow(Math.random(), 0.4); // 0–1, still denser at center
      const spiralOffset = r * 4.5;
      // Outer stars scatter much more — fills the space between arms
      const scatter      = (Math.random() - 0.5) * (0.6 + r * 5.0);
      galaxyStars.push({
        r,
        angle:         armAngle + spiralOffset + scatter,
        speed:         (0.00003 + Math.random() * 0.00004) * (i % 2 === 0 ? 1 : -1),
        yFlatten:      (Math.random() - 0.5) * 0.06,
        z:             Math.random(),
        size:          Math.random() < 0.05 ? Math.random() * 2.0 + 1.2 : Math.random() * 1.0 + 0.2,
        isGold:        Math.random() < 0.08,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    // ── Field stars: random coverage for edges/corners ────────────────────
    // These also expand with galaxyScale to fill the screen
    interface FieldStar { angle: number; r: number; size: number; baseAlpha: number; twinkleOffset: number; }
    const fieldStars: FieldStar[] = Array.from({ length: 800 }, () => ({
      angle:         Math.random() * Math.PI * 2,
      r:             Math.sqrt(Math.random()), // uniform area distribution
      size:          Math.random() * 0.7 + 0.15,
      baseAlpha:     Math.random() * 0.20 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // ── Mouse-orbit cluster ───────────────────────────────────────────────
    const orbitStars: MouseOrbitStar[] = Array.from({ length: 45 }, () => ({
      angle:         Math.random() * Math.PI * 2,
      orbitSpeed:    (0.006 + Math.random() * 0.010) * (Math.random() < 0.5 ? 1 : -1),
      orbitRadius:   18 + Math.random() * 48,
      size:          Math.random() * 1.2 + 0.3,
      isGold:        Math.random() < 0.22,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // ── Static dim background ─────────────────────────────────────────────
    const bgStars: BgStar[] = Array.from({ length: 200 }, () => ({
      x:     Math.random(),
      y:     Math.random(),
      size:  Math.random() * 0.6 + 0.1,
      alpha: Math.random() * 0.20 + 0.03,
    }));

    let t          = 0;
    let globalSpin = 0;

    const draw = () => {
      t          += 0.016;
      globalSpin += 0.00018;

      // Lerp mouse (only when it has been set)
      if (smoothMouse.current.x !== -1) {
        smoothMouse.current.x += (targetMouse.current.x - smoothMouse.current.x) * 0.06;
        smoothMouse.current.y += (targetMouse.current.y - smoothMouse.current.y) * 0.06;
      }

      const W        = canvas.width;
      const H        = canvas.height;
      const cx       = W / 2;
      const cy       = H / 2;
      // Half-diagonal: ensures stars at r=1 reach the screen corners
      const halfDiag = Math.sqrt(cx * cx + cy * cy);

      // ── Explosion at t=0: expand immediately from 0.28 to 1.0 over 3 s ──
      const rawProgress = Math.max(0, Math.min(t / 3, 1));
      const eased       = 1 - Math.pow(1 - rawProgress, 2.5);
      const galaxyScale = 0.28 + 0.72 * eased;

      // ── 3-D hologram rotation ────────────────────────────────────────
      // Primary Y-axis spin: full 360° every 20 s
      const spinY = t * (Math.PI * 2 / 20);
      // Slow X-axis tilt: oscillates so all faces are eventually visible
      const tiltX = Math.PI * 0.30 + Math.sin(t * 0.13) * Math.PI * 0.22;
      const cosY  = Math.cos(spinY); const sinY = Math.sin(spinY);
      const cosX  = Math.cos(tiltX); const sinX = Math.sin(tiltX);

      // Project a disc-plane point (px, pz) + vertical offset py → screen (sx, sy)
      // depth rz2 used for depth-cueing
      const project3d = (px: number, pz: number, py: number) => {
        const rx  =  px * cosY + pz * sinY;  // rotate around Y
        const rz  = -px * sinY + pz * cosY;
        const ry2 =  py * cosX - rz * sinX;  // rotate around X
        const rz2 =  py * sinX + rz * cosX;
        return { sx: cx + rx, sy: cy + ry2, rz2 };
      };

      // ── Clear ────────────────────────────────────────────────────────
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      // ── Static background stars ───────────────────────────────────────
      for (const s of bgStars) {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.fill();
      }

      // ── Central gold glow (always centred) ───────────────────────────
      const glowR = Math.min(W, H) * 0.25 * galaxyScale;
      const g1    = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(glowR, 1));
      g1.addColorStop(0,    'rgba(212,175,55,0.18)');
      g1.addColorStop(0.45, 'rgba(100,60,200,0.08)');
      g1.addColorStop(1,    'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const hazeR = halfDiag * 0.8 * galaxyScale;
      const g2    = ctx.createRadialGradient(cx, cy, glowR * 0.4, cx, cy, Math.max(hazeR, 2));
      g2.addColorStop(0,    'transparent');
      g2.addColorStop(0.5,  'rgba(30,27,75,0.16)');
      g2.addColorStop(1,    'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // ── Field stars — also projected through the hologram rotation ────
      for (const s of fieldStars) {
        const fr = s.r * halfDiag * galaxyScale;
        const { sx: fx, sy: fy } = project3d(
          Math.cos(s.angle) * fr,
          Math.sin(s.angle) * fr,
          0,
        );
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + s.twinkleOffset);
        ctx.beginPath();
        ctx.arc(fx, fy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,218,255,${s.baseAlpha * tw})`;
        ctx.fill();
      }

      // ── Spiral galaxy stars — 3-D projected ──────────────────────────
      for (const star of galaxyStars) {
        star.angle += star.speed;

        const eff = star.angle + globalSpin;
        const r3d = star.r * halfDiag * galaxyScale;
        // Disc in XZ plane, slightly squished on Z; yFlatten = vertical scatter
        const { sx: x, sy: y, rz2 } = project3d(
          Math.cos(eff) * r3d,
          Math.sin(eff) * r3d * 0.7,
          star.yFlatten * H * 0.06 * galaxyScale,
        );

        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.8 + star.twinkleOffset);
        // Depth cue: stars "behind" centre (rz2 > 0) are slightly dimmer
        const depthMod = 0.65 + 0.35 * (-rz2 / (halfDiag * galaxyScale + 1));
        const alpha   = twinkle * (0.35 + star.z * 0.65) * depthMod;

        const color = star.isGold
          ? `rgba(212,175,55,${alpha})`
          : star.z > 0.72
            ? `rgba(255,255,255,${alpha})`
            : star.z > 0.42
              ? `rgba(200,218,255,${alpha})`
              : `rgba(148,180,255,${alpha * 0.75})`;

        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (star.size > 1.2 || star.isGold) {
          const hr2  = star.size * (star.isGold ? 6 : 5);
          const halo = ctx.createRadialGradient(x, y, 0, x, y, hr2);
          halo.addColorStop(0, star.isGold
            ? `rgba(212,175,55,${alpha * 0.45})`
            : `rgba(200,218,255,${alpha * 0.28})`);
          halo.addColorStop(1, 'transparent');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, hr2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Mouse orbit cluster ───────────────────────────────────────────
      const mx = smoothMouse.current.x !== -1 ? smoothMouse.current.x : cx;
      const my = smoothMouse.current.y !== -1 ? smoothMouse.current.y : cy;

      for (const s of orbitStars) {
        s.angle += s.orbitSpeed;
        const ox = mx + Math.cos(s.angle) * s.orbitRadius;
        const oy = my + Math.sin(s.angle) * s.orbitRadius;
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + s.twinkleOffset);
        const al = tw * 0.75;
        const col = s.isGold ? `rgba(212,175,55,${al})` : `rgba(220,230,255,${al * 0.8})`;

        ctx.beginPath();
        ctx.arc(ox, oy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        const gh = ctx.createRadialGradient(ox, oy, 0, ox, oy, s.size * 5);
        gh.addColorStop(0, s.isGold ? `rgba(212,175,55,${al * 0.35})` : `rgba(200,218,255,${al * 0.25})`);
        gh.addColorStop(1, 'transparent');
        ctx.fillStyle = gh;
        ctx.beginPath();
        ctx.arc(ox, oy, s.size * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
};

// ---------------------------------------------------------------------------
// IntroScreen
// ---------------------------------------------------------------------------

const IntroScreen = ({ onDone }: { onDone: () => void }) => {
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  const handleEnter = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    setTimeout(onDone, 800);
  };

  useEffect(() => {
    const onWheel = () => handleEnter();
    window.addEventListener('wheel', onWheel, { once: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
      style={{
        background: '#020617',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}
    >
      <GalaxyCanvas />

      {/* Edge vignette + bottom fade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(to right,  rgba(2,6,23,0.85), transparent 25%, transparent 75%, rgba(2,6,23,0.85)),
            linear-gradient(to bottom, rgba(2,6,23,0.4) 0%, transparent 35%, transparent 55%, rgba(2,6,23,0.95) 100%)
          `,
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 text-center flex flex-col items-center"
        style={{ animation: 'fadeInUp 1.2s ease forwards' }}
      >
        <div style={{ width: 1, height: 64, background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.55))', marginBottom: '2.5rem' }} />

        <h1
          className="font-serif text-white"
          style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 1.05, letterSpacing: '-0.01em' }}
        >
          Caroline{' '}
          <span style={{ color: '#d4af37', fontWeight: 600 }}>Gérard</span>
        </h1>

        <p style={{ color: 'rgba(212,175,55,0.7)', letterSpacing: '0.45em', fontSize: '0.75rem', fontWeight: 300, marginTop: '1.25rem', textTransform: 'uppercase' }}>
          Auteure
        </p>

        <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(212,175,55,0.55), transparent)', margin: '2.5rem 0' }} />

        <button
          onClick={handleEnter}
          style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            padding: '1rem 2.5rem',
            borderRadius: 999,
            cursor: 'pointer',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.75)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow   = '0 0 32px rgba(212,175,55,0.25)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.35)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow   = 'none';
          }}
        >
          Entrer
        </button>
      </div>
    </div>
  );
};

export default IntroScreen;
