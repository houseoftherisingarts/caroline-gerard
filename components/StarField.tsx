import React, { useRef, useEffect } from 'react';

const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Background stars
    let stars: Array<{ 
      x: number; 
      y: number; 
      size: number; 
      speed: number; 
      opacity: number;
      color: string;
      pulseSpeed: number;
    }> = [];

    // Cursor particles
    const trail: Array<{
        x: number;
        y: number;
        size: number;
        vx: number;
        vy: number;
        opacity: number;
        color: string;
        life: number;
    }> = [];
    
    const numStars = 200;
    const colors = ['#ffffff', '#fef3c7', '#fde68a']; 

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.2 + 0.05,
          opacity: Math.random(),
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseSpeed: Math.random() * 0.02 + 0.005
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // Sparkle effect
      for(let i=0; i<2; i++) {
          trail.push({
              x: e.clientX,
              y: e.clientY,
              size: Math.random() * 4 + 1,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              opacity: 1,
              color: '#d4af37', 
              life: 1.0
          });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach((star) => {
        star.opacity += star.pulseSpeed;
        if (star.opacity > 1 || star.opacity < 0.2) {
          star.pulseSpeed = -star.pulseSpeed;
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, star.opacity));
        ctx.fillStyle = star.color;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed; 
        
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
      });

      for (let i = trail.length - 1; i >= 0; i--) {
          const p = trail[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02; 
          p.size *= 0.95; 
          
          if (p.life <= 0 || p.size < 0.1) {
              trail.splice(i, 1);
              continue;
          }

          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas 
    ref={canvasRef} 
    className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none" 
    style={{
      background: 'linear-gradient(to bottom, #020617 0%, #0f172a 40%, #1e1b4b 65%, #b4530980 85%, #fbbf2480 100%)'
    }}
  />;
};

export default StarField;