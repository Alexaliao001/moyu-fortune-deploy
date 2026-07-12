import { ReactNode, memo } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accent?: 'gold' | 'green' | 'red' | 'purple' | 'blue' | 'none';
  glow?: boolean;
  onClick?: () => void;
}

const accentStyles = {
  gold: {
    border: 'rgba(255,180,50,0.25)',
    shadow: '0 4px 24px rgba(255,150,30,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  green: {
    border: 'rgba(74,222,128,0.2)',
    shadow: '0 4px 24px rgba(74,222,128,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  red: {
    border: 'rgba(248,113,113,0.2)',
    shadow: '0 4px 24px rgba(248,113,113,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  purple: {
    border: 'rgba(167,139,250,0.2)',
    shadow: '0 4px 24px rgba(167,139,250,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  blue: {
    border: 'rgba(96,165,250,0.2)',
    shadow: '0 4px 24px rgba(96,165,250,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  none: {
    border: 'rgba(255,255,255,0.08)',
    shadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
};

function GlassCardInner({ children, className = '', accent = 'none', glow = false, onClick }: GlassCardProps) {
  const style = accentStyles[accent];
  
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.04) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${style.border}`,
        boxShadow: glow 
          ? `${style.shadow}, 0 0 40px ${style.border}`
          : style.shadow,
      }}
    >
      {/* 顶部高光 */}
      <div 
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 70%, transparent 95%)' }}
      />
      {children}
    </div>
  );
}

const GlassCard = memo(GlassCardInner);
export default GlassCard;
