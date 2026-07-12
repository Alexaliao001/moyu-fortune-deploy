import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, Sparkles } from 'lucide-react';

function generateStats() {
  const baseUsers = 1234;
  const randomOffset = Math.floor(Math.random() * 100);
  return {
    todayDraws: baseUsers + randomOffset,
    luckyPercent: Math.floor(Math.random() * 3) + 5,
    onlineNow: Math.floor(Math.random() * 50) + 20,
  };
}

// 数字滚动动画
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;
    
    const diff = value - prev;
    const steps = 12;
    const stepDuration = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(prev + diff * eased));
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(value);
        prevRef.current = value;
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export function TodayStats() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const [stats, setStats] = useState(generateStats);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateStats());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      {/* 在线人数 */}
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400/80"></span>
        </span>
        <span className="text-white/40 text-[10px] tabular-nums">
          <AnimatedNumber value={stats.onlineNow} />
          <span className="ml-0.5 text-white/30">{isEnglish ? 'online' : '在线'}</span>
        </span>
      </div>
      
      {/* 今日抽签 */}
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Dices className="w-3 h-3 text-white/30" />
        <span className="text-white/40 text-[10px] tabular-nums">
          <AnimatedNumber value={stats.todayDraws} />
          <span className="ml-0.5 text-white/30">{isEnglish ? 'draws' : '次'}</span>
        </span>
      </div>

      {/* 大吉率 - 金色强调 */}
      <div 
        className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-300"
        style={{
          background: 'rgba(255,213,79,0.06)',
          border: '1px solid rgba(255,213,79,0.06)',
        }}
      >
        <Sparkles className="w-3 h-3 text-amber-400/50" />
        <span className="text-amber-300/60 text-[10px] font-medium tabular-nums">
          <AnimatedNumber value={stats.luckyPercent} />%
        </span>
      </div>
    </div>
  );
}
