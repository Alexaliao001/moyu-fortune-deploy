import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Crown, History, Gift, Volume2, VolumeX, MessageSquare, Clock, Trophy, Timer, Fish, Cat, Rabbit, Dog, Bird, Squirrel, Bug, Turtle } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
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

type ThemeType = 'default' | 'lucky' | 'normal' | 'bad';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  cat: Cat, rabbit: Rabbit, dog: Dog, bird: Bird,
  squirrel: Squirrel, bug: Bug, fish: Fish, turtle: Turtle,
};

const FALLBACK_MESSAGES_ZH = [
  "今天老板不在，放心大胆摸！",
  "摸鱼一时爽，一直摸一直爽！",
  "工作是做不完的，但摸鱼的时光是有限的。",
  "今天适合带薪拉屎，记得带手机。",
  "假装很忙，实际在神游。",
  "今天的KPI就是不被发现在摸鱼。",
  "灵魂已经下班，肉体还在工位。",
];

const FALLBACK_MESSAGES_EN = [
  "Boss is out today, slack away!",
  "Slacking feels good, keep slacking!",
  "Work never ends, but slacking time is precious.",
  "Perfect day for a paid bathroom break.",
  "Look busy, think about vacation.",
  "Today's KPI: Don't get caught slacking.",
  "Soul clocked out, body still at desk.",
];

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
  const [streak] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moyu-streak');
      if (saved) {
        const { count, lastDate } = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === today || lastDate === yesterday) return count;
      }
    }
    return 0;
  });
  const slotMachineRef = useRef<SlotMachineRef>(null);
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
  const { play, stop, toggleMute, isMuted } = useSound();
  const { isOffline, saveRecord } = useOffline();
  const { user } = useAuth();

  const { data: drawLimit, refetch: refetchDrawLimit } = trpc.member.checkDrawLimit.useQuery(
    undefined,
    { enabled: true }
  );

  const recordDrawMutation = trpc.member.recordDraw.useMutation();

  useEffect(() => {
    if (selectedAvatar && typeof window !== 'undefined') {
      localStorage.setItem('moyu-avatar', selectedAvatar);
    }
  }, [selectedAvatar]);

  const handleSpinComplete = useCallback(async (result: { level: string; emoji: string; percent: number; catUrl?: string }) => {
    const timesMap = isEnglish ? SUGGESTED_TIMES_EN : SUGGESTED_TIMES;
    const times = timesMap[result.level] || timesMap['小吉'];
    const suggestedTime = times[Math.floor(Math.random() * times.length)];
    const energyPercent = Math.min(100, Math.max(10, result.percent + Math.floor(Math.random() * 20) - 10));
    const beatPercent = Math.floor(Math.random() * 20) + 75;

    setFortuneData({
      level: result.level,
      emoji: result.emoji,
      percent: result.percent,
      message: t('fortune.drawing'),
      suggestedTime,
      energyPercent,
      beatPercent,
      catUrl: result.catUrl || '',
    });

    const newTheme = LEVEL_THEMES[result.level] || 'default';
    setTheme(newTheme);
    setShowResult(true);

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
    let finalMessage = '';
    try {
      const sloganResult = await generateSloganMutation.mutateAsync({
        level: result.level,
        percent: result.percent,
        language: isEnglish ? 'en' : 'zh',
      });
      finalMessage = sloganResult.slogan;
      setFortuneData(prev => ({ ...prev, message: sloganResult.slogan }));
    } catch (error) {
      console.error('生成文案失败:', error);
      const fallbackMessages = isEnglish ? FALLBACK_MESSAGES_EN : FALLBACK_MESSAGES_ZH;
      finalMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
      setFortuneData(prev => ({ ...prev, message: finalMessage }));
    } finally {
      setIsLoadingSlogan(false);
    }

    try {
      await saveRecord({
        date: new Date().toISOString().split('T')[0],
        level: result.level,
        emoji: result.emoji,
        percent: result.percent,
        message: finalMessage,
        suggestedTime,
        avatar: selectedAvatar,
      });
    } catch (e) { /* 静默失败 */ }

    if (user && !isOffline) {
      try {
        await recordDrawMutation.mutateAsync({
          level: result.level,
          emoji: result.emoji,
          percent: result.percent,
          message: finalMessage,
          suggestedTime,
          avatar: selectedAvatar,
        });
        refetchDrawLimit();
      } catch (e) { /* 静默失败 */ }
    }

    // 更新连续签到
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem('moyu-streak');
      let newCount = 1;
      if (saved) {
        const { count, lastDate } = JSON.parse(saved);
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) newCount = count + 1;
        else if (lastDate === today) newCount = count;
      }
      localStorage.setItem('moyu-streak', JSON.stringify({ count: newCount, lastDate: today }));
    } catch (_e) { /* ignore */ }

    // 首次抽签后显示分享引导
    const hasShownPrompt = sessionStorage.getItem('moyu-share-prompted');
    if (!hasShownPrompt) {
      setShowSharePrompt(true);
      sessionStorage.setItem('moyu-share-prompted', '1');
    }
  }, [generateSloganMutation, recordDrawMutation, user, selectedAvatar, refetchDrawLimit, isEnglish, t, isOffline, saveRecord]);

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
          <div className="w-8 h-8 flex items-center justify-center">
            <Fish className="w-4.5 h-4.5 text-amber-400/70" style={{ filter: 'drop-shadow(0 0 6px rgba(255,180,50,0.3))' }} />
          </div>

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
            {isEnglish ? 'Fortune Telling for Slackers' : 'MOYU FORTUNE · 摸鱼运势'}
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
              onSpinStart={() => play('spin')}
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
                onTryAgain={() => setShowResult(false)}
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
                    if (slotMachineRef.current) {
                      slotMachineRef.current.spin();
                    }
                  }}
                  disabled={isSpinning}
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
              
              {/* 抽签限制 */}
              {user && drawLimit && !drawLimit.isVip && (
                <div className="text-center">
                  <span className="text-amber-200/30 text-[10px]">
                    {t('fortune.remainingDraws', { count: drawLimit.remaining })}
                    {drawLimit.remaining === 0 && (
                      <Link href="/membership" className="text-amber-300/60 ml-1 underline">
                        {t('membership.subscribe')}
                      </Link>
                    )}
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
              { href: '/leaderboard', icon: <Trophy className="w-[18px] h-[18px]" />, label: isEnglish ? 'Ranking' : '排行榜' },
              { href: '/golden-time', icon: <Timer className="w-[18px] h-[18px]" />, label: isEnglish ? 'Golden Time' : '黄金时段' },
              { href: '/invite', icon: <Gift className="w-[18px] h-[18px]" />, label: t('invite.title') },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex-1">
                <button 
                  className="w-full flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-[0.95] group hover:bg-white/[0.09]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,180,50,0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-amber-400/60 group-hover:text-amber-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,180,50,0.5)] transition-all duration-200">{item.icon}</span>
                  <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors duration-200 font-medium tracking-wide">{item.label}</span>
                </button>
              </Link>
            ))}
          </div>
          
          {/* VIP CTA - 金色渐变按钮 */}
          <Link href="/membership">
            <button 
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-white rounded-2xl relative overflow-hidden transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #FFB300 0%, #FF8F00 40%, #F57C00 100%)',
                boxShadow: '0 4px 20px rgba(255,152,0,0.25), 0 1px 4px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.3)',
                letterSpacing: '0.8px',
              }}
            >
              {/* 流光效果 */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  animation: 'btn-shimmer 3s ease-in-out infinite',
                }}
              />
              <Crown className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{t('membership.unlockMore')}</span>
            </button>
          </Link>

          {/* 底部品牌 */}
          <div className="text-center flex items-center justify-center gap-2 pb-1">
            <a
              href="/"
              className="text-white/20 text-[9px] hover:text-white/40 transition-colors"
            >
              {t('app.footer')}
            </a>
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
