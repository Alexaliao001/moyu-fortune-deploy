import { useEffect, useRef, useCallback } from 'react';

interface BadLuckEffectProps {
  active: boolean;
}

interface Shard {
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  opacity: number;
  color: string;
  gravity: number;
}

const SHARD_COLORS = [
  '#6B7280', '#9CA3AF', '#4B5563', '#374151',
  '#D1D5DB', '#E5E7EB', '#555555', '#888888',
];

export default function BadLuckEffect({ active }: BadLuckEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const prevActiveRef = useRef(false);

  // 绘制碎片
  const drawShard = useCallback((ctx: CanvasRenderingContext2D, shard: Shard) => {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);
    ctx.globalAlpha = shard.opacity;

    // 不规则碎片形状
    ctx.beginPath();
    ctx.moveTo(-shard.width / 2, -shard.height / 2);
    ctx.lineTo(shard.width * 0.3, -shard.height * 0.4);
    ctx.lineTo(shard.width / 2, shard.height * 0.2);
    ctx.lineTo(shard.width * 0.1, shard.height / 2);
    ctx.lineTo(-shard.width * 0.4, shard.height * 0.3);
    ctx.closePath();

    ctx.fillStyle = shard.color;
    ctx.fill();

    // 微弱边缘高光
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }, []);

  // 屏幕震动
  const shakeScreen = useCallback(() => {
    const root = document.documentElement;
    let frame = 0;
    const totalFrames = 12;
    const intensity = 6;

    const shake = () => {
      if (frame >= totalFrames) {
        root.style.transform = '';
        return;
      }
      const x = (Math.random() - 0.5) * intensity * (1 - frame / totalFrames);
      const y = (Math.random() - 0.5) * intensity * (1 - frame / totalFrames);
      root.style.transform = `translate(${x}px, ${y}px)`;
      frame++;
      requestAnimationFrame(shake);
    };
    shake();
  }, []);

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      // 触发屏幕震动
      shakeScreen();

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

      // 创建灰色碎片 - 从顶部和两侧掉落
      const shards: Shard[] = [];
      for (let i = 0; i < 35; i++) {
        const fromTop = Math.random() > 0.3;
        shards.push({
          x: fromTop ? Math.random() * w : (Math.random() > 0.5 ? -10 : w + 10),
          y: fromTop ? -20 - Math.random() * h * 0.3 : Math.random() * h * 0.3,
          vy: 1 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.12,
          width: 6 + Math.random() * 14,
          height: 4 + Math.random() * 10,
          opacity: 0.5 + Math.random() * 0.4,
          color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)],
          gravity: 0.04 + Math.random() * 0.03,
        });
      }

      let frame = 0;
      const maxFrames = 180; // ~3秒

      const animate = () => {
        frame++;
        if (frame > maxFrames) {
          ctx.clearRect(0, 0, w, h);
          return;
        }

        ctx.clearRect(0, 0, w, h);

        // 前30帧加暗色闪烁叠加
        if (frame < 8) {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * (1 - frame / 8)})`;
          ctx.fillRect(0, 0, w, h);
        }

        shards.forEach(shard => {
          shard.y += shard.vy;
          shard.x += shard.vx;
          shard.vy += shard.gravity;
          shard.rotation += shard.rotationSpeed;

          // 渐隐
          if (frame > maxFrames * 0.6) {
            shard.opacity *= 0.97;
          }

          // 掉出屏幕底部后不再循环
          if (shard.y < h + 30 && shard.opacity > 0.01) {
            drawShard(ctx, shard);
          }
        });

        animFrameRef.current = requestAnimationFrame(animate);
      };

      cancelAnimationFrame(animFrameRef.current);
      animate();
    }
    prevActiveRef.current = active;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, drawShard, shakeScreen]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
