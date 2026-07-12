import { useRef, useCallback, useState, useEffect } from 'react';
import gsap from 'gsap';
import GoldParticles from './GoldParticles';
import { Cat, Rabbit, Dog, Bird, Squirrel, Bug, Fish, Turtle } from 'lucide-react';

// icon头像映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  cat: Cat, rabbit: Rabbit, dog: Dog, bird: Bird,
  squirrel: Squirrel, bug: Bug, fish: Fish, turtle: Turtle,
};

// 优化后的铜钱图片CDN URL (480x480, 原始2048x2048压缩)
// WebP: ~48KB (vs 原始7MB) = 99.3%压缩率
const COIN_FRONT_WEBP = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/yDgdvSFbrknFvFrI.webp';
const COIN_FRONT_PNG = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/RYXOznObBogKMOPY.png';
const COIN_BACK_WEBP = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/ItDTYckNyckKRYED.webp';
const COIN_BACK_PNG = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663030286231/FsUVqbrUAovjUryY.png';

// 检测WebP支持
const supportsWebP = typeof document !== 'undefined' && document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
const COIN_FRONT_URL = supportsWebP ? COIN_FRONT_WEBP : COIN_FRONT_PNG;
const COIN_BACK_URL = supportsWebP ? COIN_BACK_WEBP : COIN_BACK_PNG;

// 全局图片预加载 - 只预加载正面（首屏可见）
if (typeof window !== 'undefined') {
  const imgFront = new Image();
  imgFront.src = COIN_FRONT_URL;
}

interface CoinButtonProps {
  onClick: () => void;
  disabled?: boolean;
  selectedAvatar?: string;
  onHoverSound?: () => void;
}

export default function CoinButton({ onClick, disabled, selectedAvatar = 'icon:cat', onHoverSound }: CoinButtonProps) {
  // 使用localStorage中保存的语言偏好（与i18n一致）
  const isEnglish = typeof window !== 'undefined' && 
    (localStorage.getItem('moyu-language') === 'en' || 
     (!localStorage.getItem('moyu-language') && navigator.language.startsWith('en')));
  const coinRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  // 铜钱始终初始显示正面
  const [showBack, setShowBack] = useState(false);
  // 图片加载状态 - 直接用img的onLoad事件检测，更可靠
  const [imagesReady, setImagesReady] = useState(false);
  const hoverAnimRef = useRef<gsap.core.Tween | null>(null);

  const isImageAvatar = selectedAvatar.startsWith('http');
  const isIconAvatar = selectedAvatar.startsWith('icon:');
  const IconComponent = isIconAvatar ? ICON_MAP[selectedAvatar.replace('icon:', '')] : null;

  // 悬浮微动效果 - 轻微上下浮动 + 光晕呼吸
  useEffect(() => {
    if (isHovered && !isFlipping && !disabled && coinRef.current) {
      // 轻微上下浮动
      hoverAnimRef.current = gsap.to(coinRef.current, {
        y: -4,
        duration: 0.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      // 光晕呼吸
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.6,
          scale: 1.08,
          duration: 1,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      // 停止微动，恢复位置
      if (hoverAnimRef.current) {
        hoverAnimRef.current.kill();
        hoverAnimRef.current = null;
      }
      if (coinRef.current && !isFlipping) {
        gsap.to(coinRef.current, { y: 0, duration: 0.3, ease: 'power2.out' });
      }
      if (glowRef.current) {
        gsap.killTweensOf(glowRef.current);
        gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.3 });
      }
    }
    return () => {
      if (hoverAnimRef.current) {
        hoverAnimRef.current.kill();
      }
    };
  }, [isHovered, isFlipping, disabled]);

  // 弹簧缩放动画 - 按下时
  const handlePointerDown = useCallback(() => {
    if (disabled || isFlipping) return;
    setIsPressed(true);
    if (coinRef.current) {
      gsap.to(coinRef.current, {
        scale: 0.85,
        duration: 0.15,
        ease: 'power2.in',
      });
    }
  }, [disabled, isFlipping]);

  // 弹簧缩放动画 - 松开时
  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    if (!isFlipping && coinRef.current) {
      gsap.to(coinRef.current, {
        scale: 1,
        duration: 0.4,
        ease: 'elastic.out(1.2, 0.4)',
      });
    }
  }, [isFlipping]);

  // 鼠标离开时恢复
  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    if (isPressed && !isFlipping && coinRef.current) {
      setIsPressed(false);
      gsap.to(coinRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [isPressed, isFlipping]);

  // 点击铜钱 = 触发抽签
  const handleClick = useCallback(() => {
    if (disabled || isFlipping) return;
    
    setIsFlipping(true);
    setIsHovered(false);
    
    // 触发金色粒子
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 100);
    
    if (coinRef.current) {
      // 始终从正面开始翻转，翻转结束后回到正面
      gsap.timeline()
        .to(coinRef.current, {
          scale: 0.88,
          duration: 0.08,
          ease: 'power3.in',
        })
        .to(coinRef.current, {
          rotateY: 180,
          scale: 1.1,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => setShowBack(true),
        })
        .to(coinRef.current, {
          rotateY: 360,
          scale: 1.05,
          duration: 0.25,
          ease: 'power2.inOut',
          onComplete: () => setShowBack(false),
        })
        .to(coinRef.current, {
          rotateY: 540,
          scale: 1.08,
          duration: 0.2,
          ease: 'power1.inOut',
          onComplete: () => setShowBack(true),
        })
        .to(coinRef.current, {
          rotateY: 720,
          scale: 1,
          duration: 0.25,
          ease: 'elastic.out(1, 0.6)',
          onComplete: () => {
            setShowBack(false); // 翻转结束始终回到正面
            gsap.set(coinRef.current, { rotateY: 0 });
            setIsFlipping(false);
          },
        });
    }
    
    setTimeout(() => onClick(), 150);
  }, [onClick, disabled, isFlipping]);

  // 铜钱尺寸
  const size = 120;
  const avatarRatio = 0.22;
  const avatarSize = size * avatarRatio;
  const avatarOffset = (size - avatarSize) / 2;

  // CSS铜钱占位符 - 图片加载前显示
  const CoinPlaceholder = () => (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: 'linear-gradient(145deg, #C8963E 0%, #A67C32 30%, #8B6528 60%, #6B4E1E 100%)',
        boxShadow: '0 8px 20px rgba(120, 80, 10, 0.5), 0 3px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,220,150,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
        border: '3px solid rgba(200,160,80,0.6)',
      }}
    >
      {/* 方孔 */}
      <div className="absolute rounded-sm" style={{
        top: '50%', left: '50%',
        width: avatarSize, height: avatarSize,
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(180deg, #5C3D1A 0%, #3D2810 100%)',
        border: '1.5px solid rgba(200,160,80,0.4)',
      }} />
      {/* 摸鱼大吉文字 */}
      <span className="absolute text-[11px] font-bold" style={{
        top: '12%', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(90,60,20,0.7)', fontFamily: 'serif',
      }}>摸</span>
      <span className="absolute text-[11px] font-bold" style={{
        bottom: '12%', left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(90,60,20,0.7)', fontFamily: 'serif',
      }}>吉</span>
      <span className="absolute text-[11px] font-bold" style={{
        top: '50%', right: '12%', transform: 'translateY(-50%)',
        color: 'rgba(90,60,20,0.7)', fontFamily: 'serif',
      }}>鱼</span>
      <span className="absolute text-[11px] font-bold" style={{
        top: '50%', left: '12%', transform: 'translateY(-50%)',
        color: 'rgba(90,60,20,0.7)', fontFamily: 'serif',
      }}>大</span>
      {/* 加载脉冲 */}
      <div className="absolute inset-0 rounded-full animate-pulse" style={{
        background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
      }} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 粒子效果容器 - 覆盖铜钱区域 */}
      <div className="relative" style={{ width: size + 60, height: size + 60 }}>
        <GoldParticles trigger={showParticles} originX={0.5} originY={0.5} />
        
        {/* 3D容器 */}
        <div
          className="absolute"
          style={{
            top: 30,
            left: 30,
            width: size,
            height: size,
            perspective: '800px',
          }}
        >
          {/* 呼吸光晕效果 - 持续脉冲引导用户点击 */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: -15,
              left: -15,
              width: size + 30,
              height: size + 30,
              background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, rgba(255,180,0,0.08) 40%, rgba(255,150,0,0.03) 60%, transparent 75%)',
              animation: disabled ? 'none' : 'coin-breathe 3s ease-in-out infinite',
            }}
          />
          {/* 交互光晕 - GSAP控制 */}
          <div
            ref={glowRef}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: -10,
              left: -10,
              width: size + 20,
              height: size + 20,
              background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,180,0,0.15) 50%, transparent 70%)',
              opacity: 0,
            }}
          />

          {/* 可旋转的铜钱容器 */}
          <div
            ref={coinRef}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerEnter={() => {
              if (!disabled) {
                setIsHovered(true);
                onHoverSound?.();
              }
            }}
            onPointerLeave={handlePointerLeave}
            role="button"
            tabIndex={0}
            className={`
              relative select-none outline-none
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{
              width: size,
              height: size,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* === 正面 === */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              {/* 占位符 - 图片加载前显示 */}
              {!imagesReady && <CoinPlaceholder />}
              
              <img
                src={COIN_FRONT_URL}
                alt="摸鱼大吉铜钱正面"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300"
                style={{
                  filter: `drop-shadow(0 8px 20px rgba(120, 80, 10, 0.5)) drop-shadow(0 3px 8px rgba(0,0,0,0.3))${disabled ? ' grayscale(0.5)' : ''}`,
                  opacity: imagesReady ? 1 : 0,
                }}
                onLoad={() => setImagesReady(true)}
                draggable={false}
                loading="eager"
                decoding="async"
              />
              <div 
                className="absolute rounded-[3px] overflow-hidden z-10"
                style={{ top: avatarOffset, left: avatarOffset, width: avatarSize, height: avatarSize }}
              >
                {isImageAvatar ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" draggable={false} />
                ) : isIconAvatar && IconComponent ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFF8E8 0%, #FFECC0 100%)' }}>
                    <IconComponent className="text-amber-700" style={{ width: avatarSize * 0.6, height: avatarSize * 0.6 }} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFF8E8 0%, #FFECC0 100%)' }}>
                    <span style={{ fontSize: avatarSize * 0.65 }}>{selectedAvatar}</span>
                  </div>
                )}
              </div>
            </div>

            {/* === 背面 === */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <img
                src={COIN_BACK_URL}
                alt="铜钱背面"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{
                  filter: `drop-shadow(0 8px 20px rgba(120, 80, 10, 0.5)) drop-shadow(0 3px 8px rgba(0,0,0,0.3))${disabled ? ' grayscale(0.5)' : ''}`,
                }}
                draggable={false}
                loading="lazy"
                decoding="async"
              />
              <div 
                className="absolute rounded-[3px] overflow-hidden z-10"
                style={{ top: avatarOffset, left: avatarOffset, width: avatarSize, height: avatarSize }}
              >
                {isImageAvatar ? (
                  <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} draggable={false} />
                ) : isIconAvatar && IconComponent ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFF8E8 0%, #FFECC0 100%)' }}>
                    <IconComponent className="text-amber-700" style={{ width: avatarSize * 0.6, height: avatarSize * 0.6, transform: 'scaleX(-1)' }} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFF8E8 0%, #FFECC0 100%)' }}>
                    <span style={{ fontSize: avatarSize * 0.65, transform: 'scaleX(-1)' }}>{selectedAvatar}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 点击提示 */}
      <div className="flex items-center gap-2 mt-1">
        <div className="h-[1px] w-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,200,100,0.3))' }} />
        <span 
          className="text-amber-200/50 text-[11px] tracking-[4px] uppercase font-medium"
          style={{ 
            textShadow: '0 1px 6px rgba(255,180,50,0.15), 0 1px 4px rgba(0,0,0,0.4)',
            fontFamily: 'var(--font-display)',
            animation: isHovered ? 'none' : 'pulse-glow-text 3s ease-in-out infinite',
          }}
        >
          {isEnglish ? 'Tap to Draw' : '点击抽签'}
        </span>
        <div className="h-[1px] w-6" style={{ background: 'linear-gradient(90deg, rgba(255,200,100,0.3), transparent)' }} />
      </div>
    </div>
  );
}
