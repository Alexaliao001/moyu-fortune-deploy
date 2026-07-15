import { useState, useEffect, useCallback, useRef } from 'react';
import { History, Volume2, VolumeX, Trophy, Fish, Cat, Rabbit, Dog, Bird, Squirrel, Bug, Turtle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import SlotMachine, { SlotMachineRef } from '@/components/SlotMachine';
import FortuneResult from '@/components/FortuneResult';
import AmbienceEffects from '@/components/AmbienceEffects';
import AvatarPanel from '@/components/AvatarPanel';
import PosterGenerator from '@/components/PosterGenerator';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { trpc } from '@/lib/trpc';
import { useSound } from '@/hooks/useSound';
import { useOffline } from '@/hooks/useOffline';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { MoyuTips } from '@/components/MoyuTips';
import { TodayStats } from '@/components/TodayStats';
import CoinButton from '@/components/CoinButton';
import JackpotCelebration from '@/components/JackpotCelebration';
import BadLuckEffect from '@/components/BadLuckEffect';
import FloatingDecorations from '@/components/FloatingDecorations';
import SharePrompt from '@/components/SharePrompt';
import StreakBadge from '@/components/StreakBadge';
import { isStaticMode, pickFallbackSlogan } from '@/lib/staticMode';
import { getUserId } from '@/lib/localStorage';
import {
  percentInLevelRange,
  resolveDailyDraw,
  todayKey,
  warmupBackend,
  yesterdayKey,
} from '@/lib/dailyDraw';
import { track } from '@/lib/analytics';
import { enqueueDraw, flushDrawOutbox } from '@/lib/drawOutbox';

const TODAY_DRAW_KEY = 'moyu-today-draw';
const SHARE_PROMPTED_KEY = 'moyu-share-prompted';
const PENDING_SHARE_KEY = 'moyu-pending-share-prompt';

type ThemeType = 'default' | 'lucky' | 'normal' | 'bad';
type StoredTodayDraw = {
  date: string;
  level: string;
  emoji: string;
  percent: number;
  message: string;
  suggestedTime: string;
};

function readTodayDraw(): StoredTodayDraw | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TODAY_DRAW_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as StoredTodayDraw;
    return saved.date === todayKey() ? saved : null;
  } catch {
    return null;
  }
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  cat: Cat, rabbit: Rabbit, dog: Dog, bird: Bird,
  squirrel: Squirrel, bug: Bug, fish: Fish, turtle: Turtle,
};

const SUGGESTED_TIMES: Record<string, string[]> = {
  '大吉': ['4小时', '3.5小时', '4.5小时'],
  '中吉': ['3小时', '2.5小时', '3小时'],
  '小吉': ['2小时', '1.5小时', '2小时'],
  '末吉': ['1小时', '45分钟', '1.5小时'],
  '凶': ['30分钟', '20分钟', '15分钟'],
};

const SUGGESTED_TIMES_EN: Record<string, string[]> = {
  '大吉': ['4 hours', '3.5 hours', '4.5 hours'],
  '中吉': ['3 hours', '2.5 hours', '3 hours'],
  '小吉': ['2 hours', '1.5 hours', '2 hours'],
  '末吉': ['1 hour', '45 mins', '1.5 hours'],
  '凶': ['30 mins', '20 mins', '15 mins'],
};

const LEVEL_THEMES: Record<string, ThemeType> = {
  '大吉': 'lucky',
  '中吉': 'lucky',
  '小吉': 'normal',
  '末吉': 'normal',
  '凶': 'bad',
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBadLuck, setShowBadLuck] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('default');
  const [avatarPanelOpen, setAvatarPanelOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [isLoadingSlogan, setIsLoadingSlogan] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [hasTodayDraw, setHasTodayDraw] = useState(
    () => readTodayDraw() !== null
  );
  const [streak, setStreak] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('moyu-streak');
        if (saved) {
          const { count, lastDate } = JSON.parse(saved);
          const today = todayKey();
          const yesterday = yesterdayKey();
          if (lastDate === today || lastDate === yesterday) return count;
        }
      } catch { /* ignore */ }
    }
    return 0;
  });
  const slotMachineRef = useRef<SlotMachineRef>(null);
  const restoredRef = useRef(false);
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moyu-avatar') || 'icon:cat';
    }
    return 'icon:cat';
  });

  const [fortuneData, setFortuneData] = useState({
    level: '',
    emoji: '',
    percent: 0,
    message: '',
    suggestedTime: '',
    energyPercent: 0,
    beatPercent: 0,
    catUrl: '',
  });

  const generateSloganMutation = trpc.fortune.generateSlogan.useMutation();
  const utils = trpc.useUtils();
  const { play, stop, toggleMute, isMuted } = useSound();
  const { isOffline, saveRecord } = useOffline();
  const { user } = useAuth();
  const staticMode = isStaticMode();

  useEffect(() => {
    warmupBackend();
    void flushDrawOutbox();
  }, []);

  useEffect(() => {
    if (selectedAvatar && typeof window !== 'undefined') {
      localStorage.setItem('moyu-avatar', selectedAvatar);
    }
  }, [selectedAvatar]);

  // 回访：恢复今日结果，但先停留在主页，由用户主动查看。
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = readTodayDraw();
    if (!saved) {
      setHasTodayDraw(false);
      return;
    }
    const daily = resolveDailyDraw(getUserId(), saved.date);
    const percent =
      saved.percent > 0 && percentInLevelRange(daily.level, saved.percent)
        ? saved.percent
        : daily.percent;
    setFortuneData({
      level: daily.level,
      emoji: daily.emoji,
      percent,
      message: saved.message || pickFallbackSlogan(isEnglish, daily.level, percent),
      suggestedTime: saved.suggestedTime || '',
      energyPercent: percent,
      beatPercent: 0,
      catUrl: '',
    });
    setHasTodayDraw(true);
  }, [isEnglish]);

  const openTodayResult = useCallback(() => {
    if (!hasTodayDraw || !fortuneData.level) return;
    setShowSharePrompt(false);
    setTheme(LEVEL_THEMES[fortuneData.level] || 'default');
    setShowResult(true);
    if (!isOffline && fortuneData.beatPercent <= 0) {
      void utils.leaderboard.beatPercent
        .fetch({ percent: fortuneData.percent })
        .then(res => {
          if (res.beatPercent != null && res.beatPercent > 0) {
            setFortuneData(prev => ({ ...prev, beatPercent: res.beatPercent! }));
          }
        })
        .catch(() => undefined);
    }
  }, [
    fortuneData.beatPercent,
    fortuneData.level,
    fortuneData.percent,
    hasTodayDraw,
    isOffline,
    utils,
  ]);

  const handleSpinComplete = useCallback(async (result: { level: string; emoji: string; percent: number; catUrl?: string }) => {
    setShowSharePrompt(false);
    const timesMap = isEnglish ? SUGGESTED_TIMES_EN : SUGGESTED_TIMES;
    const times = timesMap[result.level] || timesMap['小吉'];
    const seedOffset = result.percent % times.length;
    const suggestedTime = times[seedOffset] || times[0];
    const energyPercent = result.percent;
    const day = todayKey();

    if (import.meta.env.DEV && !percentInLevelRange(result.level, result.percent)) {
      console.warn('[moyu] percent outside level range', result);
    }

    setFortuneData({
      level: result.level,
      emoji: result.emoji,
      percent: result.percent,
      message: t('fortune.drawing'),
      suggestedTime,
      energyPercent,
      beatPercent: 0,
      catUrl: result.catUrl || '',
    });

    if (!isOffline) {
      void utils.leaderboard.beatPercent
        .fetch({ percent: result.percent })
        .then(res => {
          if (res.beatPercent != null && res.beatPercent > 0) {
            setFortuneData(prev => ({ ...prev, beatPercent: res.beatPercent! }));
          }
        })
        .catch(() => undefined);
    }

    const newTheme = LEVEL_THEMES[result.level] || 'default';
    setTheme(newTheme);
    setShowResult(true);
    setHasTodayDraw(true);
    track('draw', { level: result.level, percent: result.percent });

    if (result.level === '大吉') {
      play('jackpot');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else if (result.level === '中吉') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } else if (result.level === '凶') {
      setShowBadLuck(true);
      setTimeout(() => setShowBadLuck(false), 3500);
    }

    setIsLoadingSlogan(true);
    let finalMessage = pickFallbackSlogan(isEnglish, result.level, result.percent);
    setFortuneData(prev => ({ ...prev, message: finalMessage }));
    setIsLoadingSlogan(false);

    if (!isOffline && !staticMode) {
      void generateSloganMutation
        .mutateAsync({
          level: result.level,
          percent: result.percent,
          language: isEnglish ? 'en' : 'zh',
        })
        .then(sloganResult => {
          finalMessage = sloganResult.slogan;
          setFortuneData(prev => ({ ...prev, message: sloganResult.slogan }));
          try {
            const raw = localStorage.getItem(TODAY_DRAW_KEY);
            if (raw) {
              const prev = JSON.parse(raw);
              localStorage.setItem(
                TODAY_DRAW_KEY,
                JSON.stringify({ ...prev, message: sloganResult.slogan })
              );
            }
          } catch { /* ignore */ }
        })
        .catch(() => {
          /* keep local slogan */
        });
    }

    try {
      await saveRecord({
        date: day,
        level: result.level,
        emoji: result.emoji,
        percent: result.percent,
        message: finalMessage,
        suggestedTime,
        avatar: selectedAvatar,
      });
    } catch { /* 静默失败 */ }

    try {
      localStorage.setItem(
        TODAY_DRAW_KEY,
        JSON.stringify({
          date: day,
          level: result.level,
          emoji: result.emoji,
          percent: result.percent,
          message: finalMessage,
          suggestedTime,
        })
      );
    } catch { /* ignore */ }

    // Device-first ledger: always enqueue + flush (no cookie/user gate)
    if (!staticMode) {
      enqueueDraw({
        date: day,
        level: result.level,
        emoji: result.emoji,
        percent: result.percent,
        message: finalMessage,
        suggestedTime,
        avatar: selectedAvatar,
      });
      if (!isOffline) void flushDrawOutbox();
    }

    try {
      const today = day;
      const yesterday = yesterdayKey();
      const saved = localStorage.getItem('moyu-streak');
      let newCount = 1;
      if (saved) {
        const { count, lastDate } = JSON.parse(saved);
        if (lastDate === yesterday) newCount = count + 1;
        else if (lastDate === today) newCount = count;
      }
      localStorage.setItem('moyu-streak', JSON.stringify({ count: newCount, lastDate: today }));
      setStreak(newCount);
    } catch { /* ignore */ }

    try {
      if (!localStorage.getItem(SHARE_PROMPTED_KEY)) {
        sessionStorage.setItem(PENDING_SHARE_KEY, '1');
      }
    } catch { /* ignore */ }
  }, [generateSloganMutation, selectedAvatar, isEnglish, t, isOffline, saveRecord, staticMode, utils, play]);

  const dismissResult = useCallback(() => {
    setShowResult(false);
    setTheme('default');
    try {
      if (sessionStorage.getItem(PENDING_SHARE_KEY) === '1') {
        sessionStorage.removeItem(PENDING_SHARE_KEY);
        localStorage.setItem(SHARE_PROMPTED_KEY, '1');
        setShowSharePrompt(true);
      }
    } catch { /* ignore */ }
  }, []);

  const themeClass = {
    default: 'theme-default',
    lucky: 'theme-lucky',
    normal: 'theme-normal',
    bad: 'theme-bad',
  }[theme];

  return (
    <div className={`mobile-fullscreen ${themeClass} theme-texture transition-all duration-700 relative`}>
      {/* 离线提示 */}
      <OfflineIndicator isOffline={isOffline} />
      
      {/* 氛围特效 */}
      <AmbienceEffects theme={theme} showConfetti={showConfetti} />
      
      {/* 浮动装饰 */}
      <FloatingDecorations theme={theme} />
      
      {/* 大吉庆祝 */}
      <JackpotCelebration active={showConfetti && theme === 'lucky' && fortuneData.level === '大吉'} />
      
      {/* 凶结果效果 */}
      <BadLuckEffect active={showBadLuck && theme === 'bad'} />

      {/* 主内容 */}
      <div className="relative z-10 h-full flex flex-col max-w-[400px] mx-auto px-5 safe-area-padding">
        
        {/* ===== 头部 ===== */}
        <header className="flex items-center justify-between py-2 flex-shrink-0 animate-fade-in-up">
          {showResult ? (
            <button
              type="button"
              onClick={dismissResult}
              aria-label={isEnglish ? 'Back to home' : '返回主页'}
              title={isEnglish ? 'Back to home' : '返回主页'}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.09] active:scale-90 transition-all"
            >
              <Fish className="w-4.5 h-4.5 text-amber-400/80" style={{ filter: 'drop-shadow(0 0 6px rgba(255,180,50,0.35))' }} />
            </button>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center" aria-hidden="true">
              <Fish className="w-4.5 h-4.5 text-amber-400/70" style={{ filter: 'drop-shadow(0 0 6px rgba(255,180,50,0.3))' }} />
            </div>
          )}

          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <NotificationBell />
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              title={isMuted ? t('sound.on') : t('sound.off')}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setAvatarPanelOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              {selectedAvatar.startsWith('http') ? (
                <img src={selectedAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : selectedAvatar.startsWith('icon:') ? (
                (() => {
                  const iconId = selectedAvatar.replace('icon:', '');
                  const IconComp = ICON_MAP[iconId];
                  return IconComp ? <IconComp className="w-4 h-4 text-amber-400/80" /> : <Cat className="w-4 h-4 text-amber-400/80" />;
                })()
              ) : (
                <Cat className="w-4 h-4 text-amber-400/80" />
              )}
            </button>
          </div>
        </header>

        {/* ===== 标题区 ===== */}
        <div className="flex-shrink-0 text-center pt-0.5 pb-1 animate-fade-in-up delay-100">
          {/* 主标题 - 带装饰线 */}
          <div className="relative inline-block">
            <h1 
              className="font-display text-white leading-none relative z-10"
              style={{
                fontSize: isEnglish ? '24px' : '28px',
                textShadow: '0 2px 16px rgba(0,0,0,0.5), 0 0 40px rgba(255,200,100,0.08)',
                letterSpacing: isEnglish ? '0.5px' : '5px',
                fontWeight: 700,
              }}
            >
              {isEnglish ? 'Can I Slack Today?' : '今天能摸吗？'}
            </h1>
            {/* 标题下方装饰线 */}
            <div 
              className="mx-auto mt-1.5 h-[1px] w-3/4"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,100,0.25) 30%, rgba(255,200,100,0.25) 70%, transparent 100%)',
              }}
            />
          </div>
          <p 
            className="text-white/15 text-[8px] mt-2 tracking-[5px] uppercase font-medium"
          >
            {isEnglish ? 'Daily fortune for slackers' : '每天一签 · 摸鱼运势'}
          </p>
          {/* 连续签到徽章 */}
          {streak > 0 && (
            <div className="mt-2 animate-fade-in-up">
              <StreakBadge streak={streak} />
            </div>
          )}
        </div>

        {/* ===== 中间内容 - 弹性填充 ===== */}
        <div className="flex-1 flex flex-col gap-1 mobile-scroll scrollbar-hide py-0.5">
          
          {/* 老虎机 */}
          <div 
            className={`flex-shrink-0 transition-all duration-300 flex justify-center animate-fade-in-up delay-200 ${showResult ? 'scale-[0.7] -mb-8' : 'mt-6'}`}
          >
            <SlotMachine
              ref={slotMachineRef}
              onSpinComplete={handleSpinComplete}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
              selectedAvatar={selectedAvatar}
              locked={hasTodayDraw}
              onLockedClick={openTodayResult}
              onSpinStart={() => {
                setShowSharePrompt(false);
                play('spin');
              }}
              onReelStop={(index) => {
                if (index === 2) {
                  stop('spin');
                  play('stop');
                }
              }}
              onLeverHoverSound={() => play('leverTouch')}
            />
          </div>

          {/* 运势结果 */}
          {showResult && (
            <div className="space-y-1 flex-shrink-0">
              <FortuneResult
                level={fortuneData.level}
                emoji={fortuneData.emoji}
                percent={fortuneData.percent}
                message={fortuneData.message}
                suggestedTime={fortuneData.suggestedTime}
                energyPercent={fortuneData.energyPercent}
                beatPercent={fortuneData.beatPercent}
                visible={showResult}
                isLoadingSlogan={isLoadingSlogan}
                catUrl={fortuneData.catUrl}
                onBack={dismissResult}
                onOpenCard={() => setPosterOpen(true)}
                onOpenAvatar={() => setAvatarPanelOpen(true)}
                streak={streak}
              />
            </div>
          )}

          {/* 未抽签时 */}
          {!showResult && (
            <div className="space-y-2 flex-shrink-0">
              {/* 铜钱 */}
              <div className="flex justify-center animate-fade-in-up delay-300">
                <CoinButton 
                  onClick={() => {
                    setShowSharePrompt(false);
                    if (slotMachineRef.current) {
                      slotMachineRef.current.spin();
                    }
                  }}
                  disabled={isSpinning}
                  mode={hasTodayDraw ? 'view' : 'draw'}
                  selectedAvatar={selectedAvatar}
                  onHoverSound={() => play('coinTouch')}
                />
              </div>
              
              {/* 今日动态 */}
              <div className="animate-fade-in-up delay-400">
                <TodayStats />
              </div>
              
              {/* 摸鱼贴士 */}
              <div className="animate-fade-in-up delay-500">
                <MoyuTips />
              </div>
              
              {/* 铁律 3/4：不展示每日次数门禁，抽签与卡片永不收费 */}
              {staticMode && (
                <div className="text-center">
                  <span className="text-amber-200/25 text-[10px]">
                    {isEnglish ? 'Static demo · unlimited local draws' : '静态演示 · 本机无限次抽签'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== 底部 ===== */}
        <div className="flex-shrink-0 pb-2 space-y-2">
          {/* 功能按钮 - 精致毛玻璃胶囊 */}
          <div className="flex gap-2">
            {[
              { href: '/history', icon: <History className="w-[18px] h-[18px]" />, label: t('history.title') },
              { href: '/leaderboard', icon: <Trophy className="w-[18px] h-[18px]" />, label: isEnglish ? 'Board' : '排行', secondary: true },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex-1">
                <button 
                  className="w-full flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-[0.95] group hover:bg-white/[0.09]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: item.secondary
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(255,180,50,0.08)',
                    backdropFilter: 'blur(8px)',
                    opacity: item.secondary ? 0.75 : 1,
                  }}
                >
                  <span className="text-amber-400/60 group-hover:text-amber-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,180,50,0.5)] transition-all duration-200">{item.icon}</span>
                  <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors duration-200 font-medium tracking-wide">{item.label}</span>
                </button>
              </Link>
            ))}
          </div>
          
          {/* 底部品牌 */}
          <div className="text-center flex items-center justify-center gap-2 pb-1">
            <a
              href="/"
              className="text-white/20 text-[9px] hover:text-white/40 transition-colors"
            >
              {t('app.footer')}
            </a>
            <span className="text-white/10">·</span>
            <Link
              href="/privacy"
              className="text-white/20 text-[9px] hover:text-white/40 transition-colors"
            >
              {isEnglish ? "Privacy" : "隐私"}
            </Link>
            <span className="text-white/10">·</span>
            <Link
              href="/membership"
              className="text-white/20 text-[9px] hover:text-white/40 transition-colors"
            >
              {isEnglish ? "Support plan" : "支持计划"}
            </Link>
            <span className="text-white/10">·</span>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="text-white/20 text-[9px] hover:text-white/40 transition-colors flex items-center gap-0.5"
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {t('feedback.button')}
            </button>
            {user?.role === 'admin' && (
              <>
                <span className="text-white/10">·</span>
                <Link href="/admin/feedback" className="text-white/20 text-[9px] hover:text-white/40 transition-colors">
                  {isEnglish ? 'Admin' : '管理'}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 头像面板 - 条件渲染减少首屏DOM */}
      {avatarPanelOpen && (
        <AvatarPanel
          isOpen={avatarPanelOpen}
          onClose={() => setAvatarPanelOpen(false)}
          selectedAvatar={selectedAvatar}
          onSelectAvatar={setSelectedAvatar}
        />
      )}

      {/* 海报生成器 - 条件渲染 */}
      {posterOpen && (
      <PosterGenerator
          isOpen={posterOpen}
          onClose={() => setPosterOpen(false)}
          fortuneData={fortuneData}
          streak={streak}
        />
      )}

      {/* 反馈弹窗 - 条件渲染 */}
      {feedbackOpen && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
        />
      )}

      {/* 分享引导弹窗 */}
      <SharePrompt
        visible={showSharePrompt}
        onClose={() => setShowSharePrompt(false)}
        onShare={() => setPosterOpen(true)}
        level={fortuneData.level}
        emoji={fortuneData.emoji}
      />
    </div>
  );
}
