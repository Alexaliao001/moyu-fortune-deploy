import { useRef, useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import gsap from 'gsap';
import { SlotIcon, SLOT_ICON_COMPONENTS } from './SlotIcons';

export interface SlotMachineRef {
  spin: () => void;
}

interface SlotMachineProps {
  onSpinComplete: (result: { level: string; emoji: string; percent: number; catUrl: string }) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  selectedAvatar?: string;
  onSpinStart?: () => void;
  onReelStop?: (index: number) => void;
  onLeverHoverSound?: () => void;
}

const SLOT_COUNT = SLOT_ICON_COMPONENTS.length; // 6 icons

const fortunes = [
  { level: '大吉', emoji: '', minPercent: 85, maxPercent: 99, weight: 5, theme: 'lucky' },
  { level: '中吉', emoji: '', minPercent: 70, maxPercent: 84, weight: 20, theme: 'lucky' },
  { level: '小吉', emoji: '', minPercent: 55, maxPercent: 69, weight: 35, theme: 'normal' },
  { level: '末吉', emoji: '', minPercent: 35, maxPercent: 54, weight: 25, theme: 'normal' },
  { level: '凶', emoji: '', minPercent: 10, maxPercent: 34, weight: 15, theme: 'bad' },
];

function triggerHaptic(pattern: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30, 10, 30] };
    navigator.vibrate(patterns[pattern]);
  }
}

function getRandomIndex(): number {
  return Math.floor(Math.random() * SLOT_COUNT);
}

const SlotMachine = forwardRef<SlotMachineRef, SlotMachineProps>(({ onSpinComplete, isSpinning, setIsSpinning, onSpinStart, onReelStop, onLeverHoverSound }, ref) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spinningRef = useRef(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const handleHoverAnimRef = useRef<gsap.core.Timeline | null>(null);
  
  const [reelIndices, setReelIndices] = useState<number[][]>(() => [
    [getRandomIndex(), getRandomIndex()],
    [getRandomIndex(), getRandomIndex()],
    [getRandomIndex(), getRandomIndex()],
  ]);

  // 把手悬浮微动效果
  useEffect(() => {
    if (isHandleHovered && !isSpinning && handleRef.current && ballRef.current) {
      handleHoverAnimRef.current = gsap.timeline({ repeat: -1, yoyo: true })
        .to(ballRef.current, {
          y: -3,
          scale: 1.06,
          duration: 0.5,
          ease: 'sine.inOut',
        });
      
      gsap.to(handleRef.current, {
        x: 1.5,
        duration: 0.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      if (handleHoverAnimRef.current) {
        handleHoverAnimRef.current.kill();
        handleHoverAnimRef.current = null;
      }
      if (handleRef.current) {
        gsap.killTweensOf(handleRef.current);
        gsap.to(handleRef.current, { x: 0, duration: 0.2, ease: 'power2.out' });
      }
      if (ballRef.current) {
        gsap.killTweensOf(ballRef.current);
        gsap.to(ballRef.current, { y: 0, scale: 1, duration: 0.2, ease: 'power2.out' });
      }
    }
    return () => {
      if (handleHoverAnimRef.current) {
        handleHoverAnimRef.current.kill();
      }
    };
  }, [isHandleHovered, isSpinning]);

  const spin = useCallback(() => {
    if (spinningRef.current || isSpinning) return;
    
    spinningRef.current = true;
    setIsSpinning(true);
    setIsHandleHovered(false);
    triggerHaptic('medium');
    onSpinStart?.();

    const totalWeight = fortunes.reduce((sum, f) => sum + f.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedFortune = fortunes[0];
    for (const fortune of fortunes) {
      random -= fortune.weight;
      if (random <= 0) { selectedFortune = fortune; break; }
    }

    const percent = Math.floor(Math.random() * (selectedFortune.maxPercent - selectedFortune.minPercent + 1)) + selectedFortune.minPercent;

    if (handleRef.current) {
      gsap.timeline()
        .to(handleRef.current, { y: 50, duration: 0.2, ease: 'power2.in' })
        .to(handleRef.current, { y: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
    }

    const finalReels = [
      [getRandomIndex(), getRandomIndex()],
      [getRandomIndex(), getRandomIndex()],
      [getRandomIndex(), getRandomIndex()],
    ];

    const columnDelays = [0, 0.25, 0.5];
    
    reelRefs.current.forEach((reel, colIndex) => {
      if (!reel) return;
      const delay = columnDelays[colIndex];
      const scrollCount = 8 + colIndex * 3;
      const tl = gsap.timeline({ delay });
      
      for (let i = 0; i < scrollCount; i++) {
        const isLastScroll = i === scrollCount - 1;
        const duration = isLastScroll ? 0.12 : 0.035 + (i * 0.002);
        
        tl.to(reel, {
          y: -56,
          duration,
          ease: 'power1.in',
          onComplete: () => {
            setReelIndices(prev => {
              const newReels = [...prev];
              newReels[colIndex] = isLastScroll ? finalReels[colIndex] : [getRandomIndex(), getRandomIndex()];
              return newReels;
            });
          },
        });
        tl.set(reel, { y: 56 });
        if (isLastScroll) {
          tl.to(reel, { y: -12, duration: 0.08, ease: 'power2.out' });
          tl.to(reel, { y: 6, duration: 0.06, ease: 'power1.inOut' });
          tl.to(reel, { y: -3, duration: 0.05, ease: 'power1.inOut' });
          tl.to(reel, {
            y: 0,
            duration: 0.04,
            ease: 'power1.out',
            onComplete: () => {
              triggerHaptic('heavy');
              onReelStop?.(colIndex);
            },
          });
        } else {
          tl.to(reel, {
            y: 0,
            duration,
            ease: 'power1.out',
            onComplete: () => {
              if (i % 3 === 0) triggerHaptic('light');
            },
          });
        }
      }
    });

    setTimeout(() => {
      spinningRef.current = false;
      setIsSpinning(false);
      onSpinComplete({ level: selectedFortune.level, emoji: selectedFortune.emoji, percent, catUrl: '' });
    }, 2000);
  }, [isSpinning, setIsSpinning, onSpinStart, onReelStop, onSpinComplete]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  const handleLeverClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (spinningRef.current || isSpinning) return;
    
    if (handleRef.current) {
      gsap.timeline()
        .to(handleRef.current, { y: 60, duration: 0.25, ease: 'power2.in' })
        .call(() => spin())
        .to(handleRef.current, { y: 0, duration: 0.7, ease: 'elastic.out(1.2, 0.4)' });
    } else {
      spin();
    }
  }, [spin, isSpinning]);

  return (
    <div className="relative flex items-center">
      {/* 老虎机主体 */}
      <div className="relative cursor-pointer" onClick={spin}>
        {/* 外壳 - 精致金色3D边框 */}
        <div 
          className="rounded-[22px] relative"
          style={{
            padding: '3px',
            background: 'linear-gradient(180deg, #FFE4A8 0%, #F5C04A 15%, #E8A530 40%, #D49420 60%, #B87D15 85%, #8B6010 100%)',
            boxShadow: '0 12px 36px rgba(180, 120, 20, 0.3), 0 6px 16px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
          }}
        >
          {/* 顶部装饰条 - 摸鱼标牌 */}
          <div 
            className="absolute -top-[14px] left-1/2 -translate-x-1/2 z-20 px-4 py-[3px] rounded-full flex items-center gap-1.5"
            style={{
              background: 'linear-gradient(180deg, #FFD870 0%, #E8A530 100%)',
              boxShadow: '0 3px 10px rgba(180, 120, 20, 0.4), inset 0 1px 2px rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,220,120,0.6)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M6.5 12c3-6 13-6 14.5 0-1.5 6-11.5 6-14.5 0z" stroke="#5A3A10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 9.5L1 7l2 5-2 5 2.5-2.5" stroke="#5A3A10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="12" r="1" fill="#5A3A10"/>
            </svg>
            <span 
              className="text-[10px] font-bold tracking-[2px]"
              style={{ 
                color: '#5A3A10',
                fontFamily: 'var(--font-display)',
                textShadow: '0 1px 1px rgba(255,255,255,0.3)',
              }}
            >
              MOYU
            </span>
          </div>

          {/* 顶部高光 */}
          <div 
            className="absolute top-0 left-3 right-3 h-4 rounded-t-[20px] pointer-events-none z-10"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)' }}
          />
          
          {/* 左侧高光条 */}
          <div 
            className="absolute top-1 bottom-1 left-0 w-[2px] rounded-l-[22px] pointer-events-none z-10"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 50%, transparent 100%)' }}
          />

          {/* 内框 - 深棕色凹槽 */}
          <div 
            className="rounded-[19px] p-[3px] relative"
            style={{
              background: 'linear-gradient(180deg, #4A3510 0%, #6A5020 50%, #4A3510 100%)',
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.5), inset 0 -1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {/* 滚轮显示区域 */}
            <div 
              className="rounded-[16px] overflow-hidden relative flex"
              style={{
                background: 'linear-gradient(180deg, #FFFDF8 0%, #FFF9F0 30%, #FFF5E5 70%, #FFEFDA 100%)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04), inset 0 -1px 3px rgba(0,0,0,0.02)',
              }}
            >
              {/* 3列滚轮 */}
              {[0, 1, 2].map((colIndex) => (
                <div 
                  key={colIndex}
                  className="relative overflow-hidden"
                  style={{
                    width: '70px',
                    borderRight: colIndex < 2 ? '1px solid rgba(200, 180, 140, 0.2)' : 'none',
                  }}
                >
                  {/* 顶部内阴影 */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-3 z-10 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, transparent 100%)' }}
                  />
                  {/* 底部内阴影 */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-3 z-10 pointer-events-none"
                    style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.05) 0%, transparent 100%)' }}
                  />
                  
                  {/* 滚轮内容 - SVG图标替代emoji */}
                  <div ref={el => { reelRefs.current[colIndex] = el; }} className="flex flex-col items-center">
                    {reelIndices[colIndex].map((iconIndex, rowIndex) => (
                      <div key={rowIndex} className="w-full h-[56px] flex items-center justify-center">
                        <SlotIcon index={iconIndex} size={42} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 中间指示线 */}
              <div 
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] z-20 pointer-events-none"
                style={{ 
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,180,50,0.3) 20%, rgba(255,180,50,0.3) 80%, transparent 100%)',
                }}
              />
            </div>
          </div>

          {/* 底部装饰 - 两个小圆铆钉 */}
          <div className="flex justify-center gap-16 -mt-[1px] relative z-10">
            {[0, 1].map(i => (
              <div 
                key={i}
                className="w-[6px] h-[6px] rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #FFE090 0%, #C89820 50%, #8B6010 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 拉杆 */}
      <div 
        ref={handleRef} 
        className="cursor-pointer z-20 -ml-[5px]" 
        onClick={handleLeverClick}
        onPointerEnter={() => {
          if (!isSpinning) {
            setIsHandleHovered(true);
            onLeverHoverSound?.();
          }
        }}
        onPointerLeave={() => setIsHandleHovered(false)}
      >
        {/* 连接座 */}
        <div 
          className="w-[26px] h-[30px] rounded-r-[8px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #FFD080 0%, #E8A530 50%, #B87D15 100%)',
            boxShadow: '3px 3px 8px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3)',
          }}
        >
          <div 
            className="w-[16px] h-[16px] rounded-full"
            style={{
              background: 'linear-gradient(180deg, #D49420 0%, #8B6510 100%)',
              boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        
        {/* 杆身 */}
        <div 
          className="w-[8px] h-[55px] rounded-full ml-[9px] -mt-[4px]"
          style={{
            background: 'linear-gradient(90deg, #A07010 0%, #C89820 30%, #F5C850 50%, #C89820 70%, #A07010 100%)',
            boxShadow: '2px 0 6px rgba(0,0,0,0.12)',
          }}
        />
        
        {/* 球头 */}
        <div 
          ref={ballRef}
          className="w-[30px] h-[30px] rounded-full ml-[-2px] -mt-[3px] relative"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FFE090 0%, #F5C850 30%, #E8A530 50%, #C89820 70%, #A07010 100%)',
            boxShadow: `0 6px 16px rgba(0,0,0,0.25), 0 3px 8px rgba(160, 112, 16, 0.35), inset 0 4px 10px rgba(255,255,255,0.5), inset 0 -3px 8px rgba(0,0,0,0.12)${isHandleHovered ? ', 0 0 12px rgba(255,215,0,0.35)' : ''}`,
          }}
        >
          <div className="absolute top-1.5 left-2 w-4 h-2.5 bg-white/45 rounded-full blur-[2px]" style={{ transform: 'rotate(-30deg)' }} />
        </div>
      </div>
    </div>
  );
});

SlotMachine.displayName = 'SlotMachine';

export default SlotMachine;
