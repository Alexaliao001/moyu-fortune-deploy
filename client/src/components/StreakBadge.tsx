import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

/**
 * 连续签到天数徽章
 * 显示在标题下方，激励用户每日回来
 */
function StreakBadgeInner({ streak, className = '' }: StreakBadgeProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');

  if (streak <= 0) return null;

  // 根据连续天数显示不同等级
  const getLevel = () => {
    if (streak >= 30) return { label: isEnglish ? 'Master' : '摸鱼大师', color: '#FFD700', glow: 'rgba(255,215,0,0.3)' };
    if (streak >= 14) return { label: isEnglish ? 'Pro' : '摸鱼达人', color: '#FF8C00', glow: 'rgba(255,140,0,0.25)' };
    if (streak >= 7) return { label: isEnglish ? 'Skilled' : '摸鱼能手', color: '#FF6B35', glow: 'rgba(255,107,53,0.2)' };
    if (streak >= 3) return { label: isEnglish ? 'Rookie' : '摸鱼新手', color: '#FFB74D', glow: 'rgba(255,183,77,0.15)' };
    return { label: '', color: '#FFCC80', glow: 'rgba(255,204,128,0.1)' };
  };

  const level = getLevel();
  const streakText = isEnglish ? `${streak}-day streak` : `${streak}天连签`;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${className}`}
      style={{
        background: 'rgba(255,100,30,0.1)',
        border: '1px solid rgba(255,100,30,0.15)',
        boxShadow: `0 2px 12px ${level.glow}`,
      }}
    >
      <Flame className="w-3 h-3" style={{ color: level.color }} />
      <span className="text-[10px] font-bold" style={{ color: level.color }}>
        {streakText}
      </span>
      {level.label && (
        <>
          <span className="text-white/10 text-[8px]">·</span>
          <span className="text-white/40 text-[9px]">{level.label}</span>
        </>
      )}
    </div>
  );
}

const StreakBadge = memo(StreakBadgeInner);
export default StreakBadge;
