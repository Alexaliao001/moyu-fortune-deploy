import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { Copy, Download, RefreshCw, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface FortuneResultProps {
  level: string;
  emoji: string;
  percent: number;
  message: string;
  suggestedTime: string;
  energyPercent: number;
  beatPercent: number;
  visible: boolean;
  isLoadingSlogan?: boolean;
  catUrl?: string;
  onTryAgain?: () => void;
}

const levelConfig: Record<string, { titleEn: string; accent: string; accentBg: string; glow: string; ring: string }> = {
  '大吉': { 
    titleEn: 'Excellent', 
    accent: '#FFD54F',
    accentBg: 'rgba(255,213,79,0.12)',
    glow: '0 0 50px rgba(255,213,79,0.25), 0 0 100px rgba(255,180,0,0.1)',
    ring: 'rgba(255,213,79,0.4)',
  },
  '中吉': { 
    titleEn: 'Good', 
    accent: '#FFCA28',
    accentBg: 'rgba(255,202,40,0.1)',
    glow: '0 0 40px rgba(255,202,40,0.2)',
    ring: 'rgba(255,202,40,0.3)',
  },
  '小吉': { 
    titleEn: 'Fine', 
    accent: '#FFB74D',
    accentBg: 'rgba(255,183,77,0.08)',
    glow: '0 0 30px rgba(255,183,77,0.15)',
    ring: 'rgba(255,183,77,0.25)',
  },
  '末吉': { 
    titleEn: 'OK', 
    accent: '#FFCC80',
    accentBg: 'rgba(255,204,128,0.08)',
    glow: '0 0 20px rgba(255,204,128,0.1)',
    ring: 'rgba(255,204,128,0.2)',
  },
  '凶': { 
    titleEn: 'Hmm', 
    accent: '#90A4AE',
    accentBg: 'rgba(144,164,174,0.08)',
    glow: '0 0 20px rgba(144,164,174,0.1)',
    ring: 'rgba(144,164,174,0.2)',
  },
};

const WeChatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
  </svg>
);

const WeiboIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.194.573zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.401-.649.386-1.018.426-1.898.001-2.521-.797-1.17-2.982-1.109-5.49-.033 0 0-.785.345-.584-.28.381-1.236.324-2.27-.269-2.868-1.345-1.358-4.924.052-7.996 3.148C1.418 10.406 0 12.452 0 14.296c0 3.535 4.532 5.683 8.968 5.683 5.808 0 9.673-3.373 9.673-6.048 0-1.617-1.364-2.532-2.582-2.882zm1.991-4.627c-.074-.457-.39-.842-.831-1.013-.447-.174-.939-.088-1.297.225a1.382 1.382 0 0 0-.456 1.238c.074.458.39.844.831 1.014.447.175.939.088 1.297-.224.358-.313.53-.782.456-1.24zm2.74-.795c-.193-1.2-1.02-2.206-2.173-2.651-1.161-.449-2.462-.229-3.395.577a3.616 3.616 0 0 0-1.193 3.246c.193 1.201 1.019 2.207 2.173 2.651 1.16.449 2.462.23 3.395-.576a3.617 3.617 0 0 0 1.193-3.247z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const QQIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
    <path d="M21.395 15.035a39.548 39.548 0 0 0-1.51-4.228c.009-.09.017-.178.017-.27 0-5.473-3.907-9.907-8.727-9.907S2.448 5.064 2.448 10.537c0 .09.008.179.017.268a39.548 39.548 0 0 0-1.51 4.23c-.702 2.47-.696 4.17-.247 4.665.263.29.672.28 1.163.04a9.544 9.544 0 0 1 1.814-1.108 8.17 8.17 0 0 0 4.147 2.98c-.3.154-.498.426-.498.74 0 .564.69.858 1.541.858h1.3c.851 0 1.541-.294 1.541-.858 0-.314-.198-.586-.498-.74a8.17 8.17 0 0 0 4.147-2.98 9.544 9.544 0 0 1 1.814 1.108c.49.24.9.25 1.163-.04.449-.495.455-2.195-.247-4.665zM6.88 7.91c.04-.9.73-1.6 1.54-1.56.81.04 1.43.81 1.39 1.71-.04.9-.73 1.6-1.54 1.56-.81-.04-1.43-.81-1.39-1.71zm2.56 7.19c-1.34.02-2.6-.77-3.14-1.97-.13-.29.01-.63.31-.75.3-.13.64.01.77.3.36.79 1.19 1.32 2.08 1.31.89-.01 1.71-.55 2.06-1.35.13-.29.47-.43.76-.31.3.12.44.46.31.76-.54 1.21-1.82 2-3.15 2.01zm4.14-5.48c-.81.04-1.5-.66-1.54-1.56-.04-.9.58-1.67 1.39-1.71.81-.04 1.5.66 1.54 1.56.04.9-.58 1.67-1.39 1.71z"/>
  </svg>
);

export default function FortuneResult({
  level,
  emoji,
  percent,
  message,
  beatPercent,
  visible,
  isLoadingSlogan = false,
  onTryAgain,
}: FortuneResultProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);

  const config = levelConfig[level] || levelConfig['小吉'];
  const titleDisplay = isEnglish ? config.titleEn : level;

  useEffect(() => {
    if (visible && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.85, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.7)' }
      );
      
      // 百分比数字滚动动画
      if (percentRef.current) {
        const counter = { val: 0 };
        gsap.to(counter, {
          val: percent,
          duration: 1.2,
          delay: 0.3,
          ease: 'power2.out',
          onUpdate: () => {
            if (percentRef.current) {
              percentRef.current.textContent = Math.round(counter.val) + '%';
            }
          },
        });
      }
    }
  }, [visible, percent]);

  const getShareText = () => {
    if (isEnglish) {
      return `🐱 Today's Slacking Fortune: ${titleDisplay} ${emoji}\nSlacking Index: ${percent}%\n${message}\n\nCheck your slacking fortune at MoYu 👉`;
    }
    return `🐱 今日摸鱼运势：${level} ${emoji}\n摸鱼指数：${percent}%\n${message}\n\n来「摸了么」测测你的摸鱼运势 👉`;
  };

  const copyResult = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
      toast.success(isEnglish ? 'Copied! Share it now!' : '已复制，快去分享吧！');
    });
  };

  const shareToWeibo = () => {
    const text = encodeURIComponent(
      isEnglish
        ? `🐱 Today's Slacking Fortune: ${titleDisplay} ${emoji} Slacking Index: ${percent}% ${message} #SlackingFortune #WorkLifeBalance`
        : `🐱 今日摸鱼运势：${level} ${emoji} 摸鱼指数：${percent}% ${message} #摸鱼运势# #打工人#`
    );
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://service.weibo.com/share/share.php?title=${text}&url=${url}`, '_blank');
  };

  const shareToX = () => {
    const text = encodeURIComponent(
      `🐱 Today's Slacking Fortune: ${titleDisplay} ${emoji}\nSlacking Index: ${percent}%\n${message}\n\n#SlackingFortune #WorkLifeBalance`
    );
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToWeChat = () => {
    toast.info(isEnglish ? 'Take a screenshot to share on WeChat' : '请截图后分享到微信朋友圈', {
      description: isEnglish ? 'Long press to save image' : '长按图片可保存到相册',
      duration: 3000,
    });
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(getShareText() + ' ' + window.location.origin);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const shareToQQ = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${text}`, '_blank');
  };

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    try {
      toast.info(isEnglish ? 'Generating image...' : '正在生成图片...');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1008',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${isEnglish ? 'MoYu-Fortune' : '摸鱼运势'}-${level}-${percent}%.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(isEnglish ? 'Image saved!' : '图片已保存!');
    } catch (err) {
      console.error('Save image failed:', err);
      toast.info(isEnglish ? 'Take a screenshot to save' : '请截图保存', {
        description: isEnglish ? 'Long press to save image' : '长按图片可保存到相册',
      });
    }
  };

  if (!visible) return null;

  return (
    <div ref={cardRef} className="space-y-2.5">
      {/* 主运势卡片 */}
      <div
        className="relative rounded-[20px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${config.ring}`,
          boxShadow: config.glow,
        }}
      >
        {/* 顶部高光弧线 */}
        <div 
          className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
          }}
        />
        
        {/* 装饰性角标 */}
        <div 
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
          style={{
            background: config.accentBg,
            color: config.accent,
            border: `1px solid ${config.ring}`,
          }}
        >
          {isEnglish ? 'TODAY' : '今日'}
        </div>
        
        <div className="relative py-5 px-6">
          {/* 运势等级 - 超大字 */}
          <h2 
            className="text-center text-white font-display mb-0.5 relative z-10"
            style={{
              fontSize: '60px',
              lineHeight: 1,
              textShadow: `0 3px 16px rgba(0,0,0,0.3), 0 0 30px ${config.accentBg}`,
              letterSpacing: '0.06em',
            }}
          >
            {titleDisplay}
          </h2>
          
          {/* 百分比 */}
          <div className="flex items-center justify-center gap-2 relative z-10">
            <span 
              ref={percentRef}
              className="font-black text-white font-display"
              style={{
                fontSize: '42px',
                textShadow: '0 3px 10px rgba(0,0,0,0.2)',
              }}
            >
              0%
            </span>
          </div>
        </div>
      </div>

      {/* 摸鱼文案 */}
      <div 
        className="glass-card px-4 py-2.5 text-center"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        {isLoadingSlogan ? (
          <span className="inline-flex items-center gap-1.5 text-white/70 text-[13px]">
            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-1">{isEnglish ? 'Generating...' : '生成中...'}</span>
          </span>
        ) : (
          <p className="text-white/85 text-[13px] font-medium leading-relaxed">
            「{message}」
          </p>
        )}
      </div>

      {/* 打败打工人 */}
      <div className="flex justify-center">
        <div 
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-white/70 text-[12px]">
            {isEnglish 
              ? <>Beat <span className="font-bold" style={{ color: config.accent }}>{beatPercent}%</span> of workers</>
              : <>打败了 <span className="font-bold" style={{ color: config.accent }}>{beatPercent}%</span> 的打工人</>
            }
          </span>
        </div>
      </div>

      {/* 分享按钮 - 按语言/地区显示不同渠道 */}
      <div className="flex justify-center gap-5 pt-0.5">
        {(isEnglish ? [
          // 英文版：海外常用App优先
          { icon: <XIcon />, label: 'X', onClick: shareToX, bg: 'linear-gradient(145deg, #333 0%, #000 100%)', shadow: 'rgba(0, 0, 0, 0.3)' },
          { icon: <WhatsAppIcon />, label: 'WhatsApp', onClick: shareToWhatsApp, bg: 'linear-gradient(145deg, #25D366 0%, #128C7E 100%)', shadow: 'rgba(37, 211, 102, 0.3)' },
          { icon: <TelegramIcon />, label: 'Telegram', onClick: shareToTelegram, bg: 'linear-gradient(145deg, #2AABEE 0%, #229ED9 100%)', shadow: 'rgba(42, 171, 238, 0.3)' },
          { icon: <Copy className="w-[18px] h-[18px] text-white/80" />, label: t('share.copy'), onClick: copyResult, bg: 'rgba(255,255,255,0.12)', shadow: 'rgba(0,0,0,0.1)' },
        ] : [
          // 中文版：国内常用App
          { icon: <WeChatIcon />, label: t('share.wechat'), onClick: shareToWeChat, bg: 'linear-gradient(145deg, #2DC100 0%, #07C160 100%)', shadow: 'rgba(7, 193, 96, 0.3)' },
          { icon: <WeiboIcon />, label: t('share.weibo'), onClick: shareToWeibo, bg: 'linear-gradient(145deg, #FF8140 0%, #E6162D 100%)', shadow: 'rgba(230, 22, 45, 0.3)' },
          { icon: <QQIcon />, label: 'QQ', onClick: shareToQQ, bg: 'linear-gradient(145deg, #12B7F5 0%, #0099FF 100%)', shadow: 'rgba(18, 183, 245, 0.3)' },
          { icon: <Copy className="w-[18px] h-[18px] text-white/80" />, label: t('share.copy'), onClick: copyResult, bg: 'rgba(255,255,255,0.12)', shadow: 'rgba(0,0,0,0.1)' },
        ]).map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ 
                background: item.bg,
                boxShadow: `0 3px 12px ${item.shadow}`,
              }}
            >
              {item.icon}
            </div>
            <span className="text-white/40 text-[9px]">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-2.5">
        <button
          onClick={handleSaveImage}
          className="btn-glass flex items-center gap-1.5 px-4 py-2 text-[11px]"
        >
          <Download className="w-3.5 h-3.5" />
          {isEnglish ? 'Save' : '保存图片'}
        </button>
        <button
          onClick={onTryAgain}
          className="btn-glass flex items-center gap-1.5 px-4 py-2 text-[11px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isEnglish ? 'Again' : '再来一次'}
        </button>
      </div>
    </div>
  );
}
