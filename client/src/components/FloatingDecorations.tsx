import { useMemo, memo } from 'react';

/**
 * 浮动装饰元素 - 精致氛围层
 * 包含：锦鲤、祥云、ZZZ、星尘微粒、气泡
 */

interface FloatingDecorationsProps {
  theme?: 'default' | 'lucky' | 'normal' | 'bad';
}

// 锦鲤SVG - 更精致的鱼形
function KoiFish({ color = '#FFD54F', opacity = 0.15, size = 32, flip = false }: { color?: string; opacity?: number; size?: number; flip?: boolean }) {
  return (
    <svg 
      width={size} 
      height={size * 0.55} 
      viewBox="0 0 50 28" 
      fill="none" 
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined }}
    >
      {/* 鱼身 */}
      <ellipse cx="22" cy="14" rx="16" ry="9" fill={color} />
      {/* 鱼尾 */}
      <path d="M36 14c0 0 8-10 12-10c-2 5-2 10-2 10s0 5 2 10c-4 0-12-10-12-10z" fill={color} opacity="0.8" />
      {/* 鱼鳍 */}
      <path d="M18 5c2-4 6-4 8-2c-3 1-5 3-8 2z" fill={color} opacity="0.6" />
      <path d="M20 23c2 3 5 3 7 1c-3-0.5-5-2-7-1z" fill={color} opacity="0.5" />
      {/* 鱼眼 */}
      <circle cx="12" cy="12" r="2" fill="rgba(0,0,0,0.3)" />
      <circle cx="11.5" cy="11.5" r="0.8" fill="rgba(255,255,255,0.5)" />
      {/* 鱼鳞纹理 */}
      <path d="M16 10c2 0 3 2 3 4s-1 4-3 4" stroke={color} strokeWidth="0.5" opacity="0.4" fill="none" />
      <path d="M20 9c2 0 3 2.5 3 5s-1 5-3 5" stroke={color} strokeWidth="0.5" opacity="0.3" fill="none" />
      <path d="M24 10c2 0 2.5 2 2.5 4s-0.5 4-2.5 4" stroke={color} strokeWidth="0.5" opacity="0.2" fill="none" />
    </svg>
  );
}

// 祥云SVG
function AuspiciousCloud({ opacity = 0.08, size = 60 }: { opacity?: number; size?: number }) {
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 100 45" fill="none" style={{ opacity }}>
      <path
        d="M15 35c-6 0-11-4-11-10 0-5 4-9 9-10 1-7 7-12 15-12 6 0 11 3 14 8 2-1 4-1.5 6-1.5 7 0 12 5 12 11 0 0.5 0 1-0.1 1.5 4 1.5 7 5.5 7 10 0 6-5 11-12 11H15z"
        fill="rgba(255,255,255,0.8)"
      />
      <path d="M25 30c-3 0-5-2-5-5s2-5 5-5" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" fill="none" />
      <path d="M45 28c-2 0-4-2-4-4s2-4 4-4" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

function FloatingDecorationsInner({ theme = 'default' }: FloatingDecorationsProps) {
  const decorations = useMemo(() => {
    const items: Array<{
      type: 'fish' | 'cloud' | 'zzz' | 'dust' | 'bubble';
      x: number;
      y: number;
      size: number;
      delay: number;
      duration: number;
      opacity: number;
      flip?: boolean;
    }> = [];

    // 锦鲤 - 3条，更明显
    items.push({
      type: 'fish',
      x: 5,
      y: 30,
      size: 30,
      delay: 0,
      duration: 7,
      opacity: 0.18,
      flip: false,
    });
    items.push({
      type: 'fish',
      x: 75,
      y: 50,
      size: 24,
      delay: 3,
      duration: 8,
      opacity: 0.14,
      flip: true,
    });
    items.push({
      type: 'fish',
      x: 40,
      y: 70,
      size: 20,
      delay: 5,
      duration: 9,
      opacity: 0.1,
      flip: false,
    });

    // 祥云 - 3朵，更明显
    items.push({ type: 'cloud', x: -5, y: 10, size: 80, delay: 0, duration: 35, opacity: 0.07 });
    items.push({ type: 'cloud', x: 55, y: 4, size: 60, delay: 12, duration: 40, opacity: 0.06 });
    items.push({ type: 'cloud', x: 25, y: 72, size: 65, delay: 20, duration: 38, opacity: 0.06 });

    // ZZZ - 1组，右上角
    items.push({
      type: 'zzz',
      x: 82,
      y: 16,
      size: 12,
      delay: 1,
      duration: 3.5,
      opacity: 0.15,
    });

    // 气泡 - 5个，从底部缓缓上升
    for (let i = 0; i < 5; i++) {
      items.push({
        type: 'bubble',
        x: Math.random() * 80 + 10,
        y: 90,
        size: Math.random() * 6 + 3,
        delay: Math.random() * 10,
        duration: Math.random() * 8 + 12,
        opacity: Math.random() * 0.08 + 0.04,
      });
    }

    // 星尘微粒 - 12个，更明显
    for (let i = 0; i < 12; i++) {
      items.push({
        type: 'dust',
        x: Math.random() * 90 + 5,
        y: Math.random() * 85 + 5,
        size: Math.random() * 3 + 2,
        delay: Math.random() * 6,
        duration: Math.random() * 3 + 3,
        opacity: Math.random() * 0.2 + 0.08,
      });
    }

    return items;
  }, []);

  const fishColor = theme === 'bad' ? 'rgba(180,180,200,0.6)' : theme === 'lucky' ? '#FFD54F' : '#FFB74D';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      {decorations.map((item, index) => {
        if (item.type === 'fish') {
          return (
            <div
              key={`fish-${index}`}
              className="absolute"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                animation: `float-gentle ${item.duration}s ease-in-out infinite`,
                animationDelay: `${item.delay}s`,
              }}
            >
              <KoiFish color={fishColor} opacity={item.opacity} size={item.size} flip={item.flip} />
            </div>
          );
        }

        if (item.type === 'cloud') {
          return (
            <div
              key={`cloud-${index}`}
              className="absolute"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                animation: `drift-horizontal ${item.duration}s linear infinite`,
                animationDelay: `${item.delay}s`,
              }}
            >
              <AuspiciousCloud opacity={item.opacity} size={item.size} />
            </div>
          );
        }

        if (item.type === 'zzz') {
          return (
            <div
              key={`zzz-${index}`}
              className="absolute"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
            >
              {[0, 1, 2].map((z) => (
                <span
                  key={z}
                  className="absolute font-display font-bold"
                  style={{
                    fontSize: item.size + z * 3,
                    color: `rgba(255,200,120,${0.12 + z * 0.03})`,
                    animation: `zzz-float ${item.duration}s ease-out infinite`,
                    animationDelay: `${item.delay + z * 0.8}s`,
                    left: z * 8,
                    top: -z * 10,
                  }}
                >
                  Z
                </span>
              ))}
            </div>
          );
        }

        if (item.type === 'bubble') {
          return (
            <div
              key={`bubble-${index}`}
              className="absolute rounded-full"
              style={{
                left: `${item.x}%`,
                bottom: '0%',
                width: item.size,
                height: item.size,
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${item.opacity * 2}) 0%, rgba(255,200,120,${item.opacity}) 50%, transparent 70%)`,
                border: `0.5px solid rgba(255,255,255,${item.opacity})`,
                animation: `bubble-rise ${item.duration}s ease-in-out infinite`,
                animationDelay: `${item.delay}s`,
              }}
            />
          );
        }

        if (item.type === 'dust') {
          return (
            <div
              key={`dust-${index}`}
              className="absolute rounded-full"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: item.size,
                height: item.size,
                background: theme === 'lucky' 
                  ? `radial-gradient(circle, rgba(255,213,79,${item.opacity}) 0%, transparent 70%)`
                  : theme === 'bad'
                  ? `radial-gradient(circle, rgba(180,180,200,${item.opacity * 0.6}) 0%, transparent 70%)`
                  : `radial-gradient(circle, rgba(255,200,120,${item.opacity}) 0%, transparent 70%)`,
                animation: `sparkle ${item.duration}s ease-in-out infinite`,
                animationDelay: `${item.delay}s`,
                filter: 'blur(0.5px)',
              }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// memo包装避免父组件重渲染时重建所有装饰DOM
const FloatingDecorations = memo(FloatingDecorationsInner);
export default FloatingDecorations;
