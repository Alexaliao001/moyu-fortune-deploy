import { useEffect, useRef, useCallback } from 'react';

interface JackpotCelebrationProps {
  active: boolean;
}

interface GoldIngot {
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

interface Firework {
  x: number;
  y: number;
  particles: FireworkParticle[];
  life: number;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  trail: { x: number; y: number }[];
  gravity: number;
  friction: number;
}

const FIREWORK_COLORS = [
  ['#FFD700', '#FFC107', '#FFB300', '#FF8F00'],
  ['#FF4444', '#FF6B6B', '#FF8A80', '#FFCDD2'],
  ['#FF6B35', '#FFB347', '#FFD700', '#FFF176'],
  ['#E040FB', '#EA80FC', '#FF80AB', '#FF4081'],
];

export default function JackpotCelebration({ active }: JackpotCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ingotsRef = useRef<GoldIngot[]>([]);
  const fireworksRef = useRef<Firework[]>([]);
  const animFrameRef = useRef<number>(0);
  const prevActiveRef = useRef(false);

  // 绘制金元宝
  const drawIngot = useCallback((ctx: CanvasRenderingContext2D, ingot: GoldIngot) => {
    ctx.save();
    ctx.translate(ingot.x, ingot.y);
    ctx.rotate(ingot.rotation);
    ctx.globalAlpha = ingot.opacity;
    
    const s = ingot.size;
    
    // 元宝形状 - 底部椭圆 + 上部弧形
    ctx.beginPath();
    
    // 底部弧线
    ctx.ellipse(0, s * 0.3, s * 0.5, s * 0.2, 0, 0, Math.PI);
    
    // 左侧上升
    ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.6, -s * 0.2, -s * 0.35, -s * 0.35);
    
    // 顶部凹陷
    ctx.bezierCurveTo(-s * 0.15, -s * 0.15, s * 0.15, -s * 0.15, s * 0.35, -s * 0.35);
    
    // 右侧下降
    ctx.bezierCurveTo(s * 0.6, -s * 0.2, s * 0.5, s * 0.1, s * 0.5, s * 0.3);
    
    ctx.closePath();
    
    // 金色渐变填充
    const gradient = ctx.createLinearGradient(-s * 0.5, -s * 0.35, s * 0.5, s * 0.3);
    gradient.addColorStop(0, '#FFE082');
    gradient.addColorStop(0.3, '#FFD54F');
    gradient.addColorStop(0.5, '#FFC107');
    gradient.addColorStop(0.7, '#FFB300');
    gradient.addColorStop(1, '#FF8F00');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 高光
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.1, s * 0.15, s * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#E8A530';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }, []);

  // 绘制烟花粒子
  const drawFireworkParticle = useCallback((ctx: CanvasRenderingContext2D, p: FireworkParticle) => {
    // 绘制尾迹
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.5;
      ctx.globalAlpha = p.opacity * 0.3;
      ctx.stroke();
    }
    
    // 绘制粒子
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fill();
    
    // 发光
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      
      const w = rect.width;
      const h = rect.height;

      // 创建金元宝 - 从顶部掉落
      const ingots: GoldIngot[] = [];
      for (let i = 0; i < 25; i++) {
        ingots.push({
          x: Math.random() * w,
          y: -20 - Math.random() * h * 0.5,
          vy: 1.5 + Math.random() * 2,
          vx: (Math.random() - 0.5) * 1.5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          size: 14 + Math.random() * 12,
          opacity: 0.8 + Math.random() * 0.2,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.03 + Math.random() * 0.03,
        });
      }
      ingotsRef.current = ingots;

      // 创建烟花 - 分批发射
      fireworksRef.current = [];
      const launchFirework = (delay: number) => {
        setTimeout(() => {
          const colorSet = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
          const fx = w * 0.2 + Math.random() * w * 0.6;
          const fy = h * 0.15 + Math.random() * h * 0.3;
          const particles: FireworkParticle[] = [];
          
          const count = 30 + Math.floor(Math.random() * 20);
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
            const speed = 2 + Math.random() * 4;
            particles.push({
              x: fx,
              y: fy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 1.5 + Math.random() * 2,
              opacity: 1,
              color: colorSet[Math.floor(Math.random() * colorSet.length)],
              trail: [{ x: fx, y: fy }],
              gravity: 0.03 + Math.random() * 0.02,
              friction: 0.97 + Math.random() * 0.02,
            });
          }
          
          fireworksRef.current.push({ x: fx, y: fy, particles, life: 0 });
        }, delay);
      };

      // 发射5波烟花
      launchFirework(0);
      launchFirework(400);
      launchFirework(800);
      launchFirework(1200);
      launchFirework(1800);

      let frame = 0;
      const maxFrames = 240; // ~4秒

      const animate = () => {
        frame++;
        if (frame > maxFrames) {
          ctx.clearRect(0, 0, w, h);
          return;
        }

        ctx.clearRect(0, 0, w, h);

        // 更新和绘制金元宝
        ingotsRef.current.forEach(ingot => {
          ingot.y += ingot.vy;
          ingot.x += ingot.vx + Math.sin(ingot.wobble) * 0.5;
          ingot.wobble += ingot.wobbleSpeed;
          ingot.rotation += ingot.rotationSpeed;
          ingot.vy += 0.05; // 重力

          // 渐隐
          if (frame > maxFrames * 0.7) {
            ingot.opacity *= 0.96;
          }

          // 循环 - 掉出屏幕底部后回到顶部
          if (ingot.y > h + 30) {
            ingot.y = -30;
            ingot.x = Math.random() * w;
            ingot.vy = 1.5 + Math.random() * 2;
          }

          drawIngot(ctx, ingot);
        });

        // 更新和绘制烟花
        fireworksRef.current.forEach(fw => {
          fw.life++;
          fw.particles.forEach(p => {
            // 保存尾迹
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 6) p.trail.shift();

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.vy *= p.friction;
            
            // 渐隐
            if (fw.life > 30) {
              p.opacity *= 0.96;
            }
            p.size *= 0.998;

            if (p.opacity > 0.01) {
              drawFireworkParticle(ctx, p);
            }
          });
        });

        // 清理已消失的烟花
        fireworksRef.current = fireworksRef.current.filter(fw => fw.life < 120);

        animFrameRef.current = requestAnimationFrame(animate);
      };

      cancelAnimationFrame(animFrameRef.current);
      animate();
    }
    prevActiveRef.current = active;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, drawIngot, drawFireworkParticle]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
