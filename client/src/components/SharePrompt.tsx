import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { Share2, X, Sparkles } from 'lucide-react';

interface SharePromptProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  level: string;
  emoji: string;
}

const levelTitleEn: Record<string, string> = {
  '大吉': 'Excellent',
  '中吉': 'Good',
  '小吉': 'Fair',
  '末吉': 'Minor',
  '平': 'Neutral',
  '小凶': 'Minor Bad',
  '凶': 'Bad',
};

/**
 * 首次抽签后的分享引导弹窗
 * 设计原则：不打断体验，但给足分享动力
 */
export default function SharePrompt({ visible, onClose, onShare, level, emoji }: SharePromptProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');

  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDismissed(false);
      return;
    }
    if (dismissed) return;
    const timer = setTimeout(() => {
      if (overlayRef.current && cardRef.current) {
        gsap.to(overlayRef.current, { opacity: 1, visibility: 'visible', duration: 0.3 });
        gsap.fromTo(
          cardRef.current,
          { y: 60, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, dismissed]);

  const handleClose = () => {
    if (overlayRef.current && cardRef.current) {
      gsap.to(cardRef.current, { y: 30, opacity: 0, duration: 0.25 });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          gsap.set(overlayRef.current!, { visibility: 'hidden' });
          setDismissed(true);
          onClose();
        },
      });
    } else {
      setDismissed(true);
      onClose();
    }
  };

  const handleShare = () => {
    handleClose();
    setTimeout(() => onShare(), 300);
  };

  if (dismissed || !visible) return null;

  const titleDisplay = isEnglish ? (levelTitleEn[level] || level) : level;

  const getTitle = () => {
    if (isEnglish) {
      if (level === '大吉') return 'Amazing! Great Fortune!';
      if (level === '凶') return 'Be careful today...';
      return `Today's Fortune: ${titleDisplay}`;
    }
    if (level === '大吉') return '太棒了！大吉大利！';
    if (level === '凶') return '今天要小心哦...';
    return `今日运势：${level}`;
  };

  const socialProof = isEnglish
    ? 'Share your card — draws stay free forever'
    : '分享你的签文卡片 · 抽签永远免费';

  const shareButtonText = isEnglish ? 'Share with Friends' : '分享给朋友';
  const rewardHint = isEnglish ? 'Entertainment only' : '仅供娱乐';
  const closeLabel = isEnglish ? 'Close share prompt' : '关闭分享提示';
  const shareLabel = isEnglish ? 'Share fortune card' : '分享签文卡片';

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 invisible opacity-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={handleClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-5 pointer-events-none">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? 'Share prompt' : '分享引导'}
          className="pointer-events-auto w-full max-w-[360px] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(30,25,20,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,180,50,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,180,50,0.08)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label={closeLabel}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="p-5 text-center">
            <div className="text-4xl mb-2">{emoji}</div>

            <h3 className="text-white font-display text-lg mb-1">{getTitle()}</h3>

            <p className="text-white/40 text-xs mb-4">{socialProof}</p>

            <button
              type="button"
              onClick={handleShare}
              aria-label={shareLabel}
              className="w-full py-3 rounded-xl font-bold text-sm relative overflow-hidden transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                color: '#1a0800',
                boxShadow: '0 4px 20px rgba(255,150,30,0.3)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  animation: 'btn-shimmer 2s ease-in-out infinite',
                }}
              />
              <Share2 className="w-4 h-4 inline mr-2 relative z-10" />
              <span className="relative z-10">{shareButtonText}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400/70 text-[10px]">{rewardHint}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
