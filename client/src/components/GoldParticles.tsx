import { useEffect, useRef, useCallback } from 'react';

interface GoldParticlesProps {
  trigger: boolean;
  originX?: number;
  originY?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'circle' | 'star' | 'sparkle';
  gravity: number;
}

const GOLD_COLORS = [
  '#FFD700', '#FFC107', '#FFB300', '#FFA000',
  '#FFE082', '#FFECB3', '#F5C842', '#E8B830',
  '#FFE4B5', '#FFDAB9',
];

export default function GoldParticles({ trigger, originX = 0.5, originY = 0.5 }: GoldParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevTriggerRef = useRef(false);

  const createParticles = useCallback((canvas: HTMLCanvasElement) => {
    const cx = canvas.width * originX;
    const cy = canvas.height * originY;
    const particles: Particle[] = [];

    // 主爆发粒子 - 从中心向四周散开
    for (let i = 0; i < 35; i++) {
      const angle = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2 + Math.random() * 4,
        opacity: 0.8 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
        shape: Math.random() > 0.6 ? 'star' : Math.random() > 0.3 ? 'sparkle' : 'circle',
        gravity: 0.06 + Math.random() * 0.04,
      });
    }

    // 上升光点 - 向上飘散
    for (let i = 0; i < 15; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 2,
        vy: -(1.5 + Math.random() * 3),
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.6 + Math.random() * 0.4,
        rotation: 0,
        rotationSpeed: 0,
        life: 0,
        maxLife: 50 + Math.random() * 25,
        color: GOLD_COLORS[Math.floor(Math.random() * 3)],
        shape: 'circle',
        gravity: -0.01,
      });
    }

    // 小闪光点
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 40;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 1.5,
        opacity: 1,
        rotation: 0,
        rotationSpeed: 0,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        color: '#FFFFFF',
        shape: 'sparkle',
        gravity: 0,
      });
    }

    return particles;
  }, [originX, originY]);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // 发光效果
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.fill();
    } else if (p.shape === 'star') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        if (i === 0) {
          ctx.moveTo(Math.cos(outerAngle) * p.size, Math.sin(outerAngle) * p.size);
        } else {
          ctx.lineTo(Math.cos(outerAngle) * p.size, Math.sin(outerAngle) * p.size);
        }
        ctx.lineTo(Math.cos(innerAngle) * p.size * 0.4, Math.sin(innerAngle) * p.size * 0.4);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // sparkle - 十字闪光
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.moveTo(0, -p.size);
      ctx.lineTo(0, p.size);
      ctx.stroke();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    // 检测 trigger 从 false → true 的上升沿
    if (trigger && !prevTriggerRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);

      particlesRef.current = createParticles(canvas);

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current = particlesRef.current.filter(p => {
          p.life++;
          if (p.life > p.maxLife) return false;

          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.98;
          p.rotation += p.rotationSpeed;

          // 渐隐
          const lifeRatio = p.life / p.maxLife;
          if (lifeRatio > 0.6) {
            p.opacity *= 0.95;
          }
          p.size *= 0.995;

          drawParticle(ctx, p);
          return true;
        });

        if (particlesRef.current.length > 0) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      cancelAnimationFrame(animFrameRef.current);
      animate();
    }
    prevTriggerRef.current = trigger;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [trigger, createParticles, drawParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
