import { useEffect, useState, memo } from 'react';

type ThemeType = 'default' | 'lucky' | 'normal' | 'bad';

interface AmbienceEffectsProps {
  theme: ThemeType;
  showConfetti: boolean;
}

// 气泡效果 - 大吉主题
function GoldenBubbles() {
  const [bubbles] = useState(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 20 + 10,
      duration: Math.random() * 4 + 6,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="bubble absolute rounded-full"
          style={{
            left: `${bubble.left}%`,
            width: bubble.size,
            height: bubble.size,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.6), rgba(255,165,0,0.3))',
            boxShadow: 'inset 0 0 10px rgba(255,255,255,0.5)',
            '--duration': `${bubble.duration}s`,
            '--delay': `${bubble.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// 金币下落效果 - 大吉主题
function FallingCoins() {
  const [coins] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 15 + 20,
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 3,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin absolute"
          style={{
            left: `${coin.left}%`,
            width: coin.size,
            height: coin.size,
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
            '--duration': `${coin.duration}s`,
            '--delay': `${coin.delay}s`,
          } as React.CSSProperties}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[#8B6914] font-bold text-xs">
            ¥
          </span>
        </div>
      ))}
    </div>
  );
}

// 云朵漂浮效果 - 平运势主题
function FloatingClouds() {
  const [clouds] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 60 + 10,
      size: Math.random() * 60 + 40,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 3,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="cloud absolute opacity-60"
          style={{
            left: `${cloud.left}%`,
            top: `${cloud.top}%`,
            width: cloud.size,
            height: cloud.size * 0.6,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 70%, transparent 100%)',
            borderRadius: '50%',
            filter: 'blur(2px)',
            '--duration': `${cloud.duration}s`,
            '--delay': `${cloud.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// 水波纹效果 - 平运势主题
function WaterRipples() {
  const [ripples] = useState(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: Math.random() * 80 + 10,
      top: Math.random() * 80 + 10,
      delay: i * 1.5,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full"
          style={{
            left: `${ripple.left}%`,
            top: `${ripple.top}%`,
            width: 100,
            height: 100,
            border: '2px solid rgba(255,255,255,0.3)',
            animation: `ripple 4s ease-out infinite`,
            animationDelay: `${ripple.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// 闪电效果 - 凶运势主题
function LightningFlashes() {
  const [lightnings] = useState(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      left: Math.random() * 80 + 10,
      duration: Math.random() * 3 + 4,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {lightnings.map((lightning) => (
        <div
          key={lightning.id}
          className="lightning absolute top-0"
          style={{
            left: `${lightning.left}%`,
            width: 3,
            height: '40%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(200,200,255,0.5) 50%, transparent 100%)',
            filter: 'blur(1px)',
            '--duration': `${lightning.duration}s`,
            '--delay': `${lightning.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// 粒子下落效果 - 凶运势主题
function FallingParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 3,
      delay: Math.random() * 4,
      drift: (Math.random() - 0.5) * 40,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle absolute rounded-full bg-gray-400/40"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            '--duration': `${particle.duration}s`,
            '--delay': `${particle.delay}s`,
            '--drift': `${particle.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// 彩纸庆祝效果
function Confetti() {
  const [confettiPieces] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: ['#FFD700', '#FF6B00', '#FF69B4', '#00CED1', '#98FB98', '#FF4500', '#9370DB', '#FFB347'][
        Math.floor(Math.random() * 8)
      ],
      size: Math.random() * 8 + 6,
      duration: Math.random() * 2 + 2.5,
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti absolute"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            '--duration': `${piece.duration}s`,
            '--delay': `${piece.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function AmbienceEffectsInner({ theme, showConfetti }: AmbienceEffectsProps) {
  return (
    <>
      {/* 主题特效 */}
      {theme === 'lucky' && (
        <>
          <GoldenBubbles />
          <FallingCoins />
        </>
      )}
      {theme === 'normal' && (
        <>
          <FloatingClouds />
          <WaterRipples />
        </>
      )}
      {theme === 'bad' && (
        <>
          <LightningFlashes />
          <FallingParticles />
        </>
      )}

      {/* 彩纸庆祝 */}
      {showConfetti && <Confetti />}
    </>
  );
}

const AmbienceEffects = memo(AmbienceEffectsInner);
export default AmbienceEffects;
