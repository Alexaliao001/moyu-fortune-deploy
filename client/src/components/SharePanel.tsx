import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
// html2canvas 按需加载（~55KB gzip）—— 只在生成分享图片时加载
const loadHtml2Canvas = () => import('html2canvas').then(m => m.default);
import { toast } from 'sonner';
import { X, Download, Copy, Check, Share2, Fish } from 'lucide-react';

// 中文版分享渠道：国内常用App
const SHARE_PLATFORMS_ZH = [
  {
    id: 'wechat',
    color: '#07C160',
    getShareUrl: () => null,
  },
  {
    id: 'weibo',
    color: '#E6162D',
    getShareUrl: (text: string, url: string) => {
      const params = new URLSearchParams({ title: text, url });
      return `https://service.weibo.com/share/share.php?${params.toString()}`;
    },
  },
  {
    id: 'qq',
    color: '#12B7F5',
    getShareUrl: (text: string, url: string) => {
      return `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    },
  },
];

// 英文版分享渠道：海外常用App优先
const SHARE_PLATFORMS_EN = [
  {
    id: 'x',
    color: '#fff',
    getShareUrl: (text: string, url: string) => {
      const params = new URLSearchParams({ text, url });
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  {
    id: 'whatsapp',
    color: '#25D366',
    getShareUrl: (text: string, url: string) => {
      return `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    },
  },
  {
    id: 'telegram',
    color: '#2AABEE',
    getShareUrl: (text: string, url: string) => {
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    },
  },
];

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  userName?: string;
}

export default function SharePanel({
  isOpen,
  onClose,
  inviteCode,
  userName,
}: SharePanelProps) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const displayName = userName || (isEnglish ? 'Slacker Pro' : '摸鱼达人');
  
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}?invite=${inviteCode}` 
    : '';
  
  const shareText = isEnglish
    ? `I found an amazing slacking fortune teller! Use my invite code ${inviteCode} to sign up, we both get 3 days membership! Check your slacking fortune~`
    : `我在「摸了么」发现了超准的摸鱼运势！用我的邀请码 ${inviteCode} 注册，我们都能获得3天会员！快来测测你今天能不能摸鱼~`;

  useEffect(() => {
    if (isOpen) {
      gsap.to(overlayRef.current, { opacity: 1, visibility: 'visible', duration: 0.3 });
      gsap.to(panelRef.current, { y: 0, duration: 0.4, ease: 'back.out(1.2)' });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      generateShareImage();
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0, duration: 0.3,
        onComplete: () => { gsap.set(overlayRef.current, { visibility: 'hidden' }); },
      });
      gsap.to(panelRef.current, { y: '100%', duration: 0.3, ease: 'power2.in' });
    }
  }, [isOpen]);

  const generateShareImage = async () => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true });
      setGeneratedImage(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('生成分享图片失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.download = `${isEnglish ? 'MoYu-Invite' : '摸了么邀请卡'}-${inviteCode}.png`;
    link.href = generatedImage;
    link.click();
    toast.success(isEnglish ? 'Image saved' : '图片已保存');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(isEnglish ? 'Link copied' : '链接已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = isEnglish ? SHARE_PLATFORMS_EN : SHARE_PLATFORMS_ZH;

  const handleShare = async (platform: typeof SHARE_PLATFORMS_ZH[0]) => {
    if (platform.id === 'wechat') {
      if (generatedImage) {
        handleDownload();
        toast.info(t('share.wechatSaveHint'), { description: t('share.wechatSaveDesc') });
      }
      return;
    }
    const shareUrlResult = platform.getShareUrl(shareText, shareUrl);
    if (shareUrlResult) window.open(shareUrlResult, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = { 
          title: isEnglish ? 'MoYu - Slacking Fortune' : '摸了么 - 今日摸鱼运势', 
          text: shareText, 
          url: shareUrl 
        };
        if (generatedImage && navigator.canShare) {
          const response = await fetch(generatedImage);
          const blob = await response.blob();
          const file = new File([blob], `${isEnglish ? 'MoYu-Invite' : '摸了么邀请卡'}-${inviteCode}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) shareData.files = [file];
        }
        await navigator.share(shareData);
      } catch (_e) { /* cancelled */ }
    } else {
      handleCopyLink();
    }
  };

  // 平台图标组件
  const WeChatSvg = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#07C160">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
    </svg>
  );

  const WeiboSvg = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E6162D">
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.194.573z"/>
    </svg>
  );

  const XSvg = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  const WhatsAppSvg = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  const TelegramSvg = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2AABEE">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );

  const QQSvg = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#12B7F5">
      <path d="M21.395 15.035a39.548 39.548 0 0 0-1.51-4.228c.009-.09.017-.178.017-.27 0-5.473-3.907-9.907-8.727-9.907S2.448 5.064 2.448 10.537c0 .09.008.179.017.268a39.548 39.548 0 0 0-1.51 4.23c-.702 2.47-.696 4.17-.247 4.665.263.29.672.28 1.163.04a9.544 9.544 0 0 1 1.814-1.108 8.17 8.17 0 0 0 4.147 2.98c-.3.154-.498.426-.498.74 0 .564.69.858 1.541.858h1.3c.851 0 1.541-.294 1.541-.858 0-.314-.198-.586-.498-.74a8.17 8.17 0 0 0 4.147-2.98 9.544 9.544 0 0 1 1.814 1.108c.49.24.9.25 1.163-.04.449-.495.455-2.195-.247-4.665zM6.88 7.91c.04-.9.73-1.6 1.54-1.56.81.04 1.43.81 1.39 1.71-.04.9-.73 1.6-1.54 1.56-.81-.04-1.43-.81-1.39-1.71zm2.56 7.19c-1.34.02-2.6-.77-3.14-1.97-.13-.29.01-.63.31-.75.3-.13.64.01.77.3.36.79 1.19 1.32 2.08 1.31.89-.01 1.71-.55 2.06-1.35.13-.29.47-.43.76-.31.3.12.44.46.31.76-.54 1.21-1.82 2-3.15 2.01zm4.14-5.48c-.81.04-1.5-.66-1.54-1.56-.04-.9.58-1.67 1.39-1.71.81-.04 1.5.66 1.54 1.56.04.9-.58 1.67-1.39 1.71z"/>
    </svg>
  );

  // 平台名称和图标映射
  const platformConfig: Record<string, { svg: React.ReactNode; bg: string; name: string }> = {
    wechat: { svg: <WeChatSvg />, bg: 'rgba(7,193,96,0.12)', name: t('share.wechat') },
    weibo: { svg: <WeiboSvg />, bg: 'rgba(230,22,45,0.12)', name: t('share.weibo') },
    qq: { svg: <QQSvg />, bg: 'rgba(18,183,245,0.12)', name: 'QQ' },
    x: { svg: <XSvg />, bg: 'rgba(255,255,255,0.08)', name: 'X' },
    whatsapp: { svg: <WhatsAppSvg />, bg: 'rgba(37,211,102,0.12)', name: 'WhatsApp' },
    telegram: { svg: <TelegramSvg />, bg: 'rgba(42,171,238,0.12)', name: 'Telegram' },
  };

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 invisible opacity-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl"
        style={{ 
          transform: 'translateY(100%)',
          background: 'rgba(25,20,15,0.98)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,180,50,0.1)',
          borderBottom: 'none',
          boxShadow: '0 -10px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* 拖动手柄 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-white/20 hover:text-white/50 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* 标题 */}
        <div className="text-center pb-4 px-6">
          <h3 className="text-white font-display text-lg">{t('share.inviteTitle')}</h3>
          <p className="text-white/40 text-xs mt-0.5">{t('share.inviteSubtitle')}</p>
        </div>

        {/* 分享卡片预览 */}
        <div className="px-6 pb-4">
          <div className="relative">
            <div
              ref={cardRef}
              className="rounded-2xl p-5 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FF9800 0%, #FF6D00 50%, #E65100 100%)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fish className="w-6 h-6 text-white" />
                  <span className="text-white font-bold text-lg">{t('share.cardBrand')}</span>
                </div>
                <div className="px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span className="text-white text-xs">{t('share.cardTag')}</span>
                </div>
              </div>

              <div className="bg-white/90 rounded-xl p-4 mb-3">
                <p className="text-gray-800 text-center mb-2.5 text-sm">
                  <span className="font-bold text-orange-600">{displayName}</span>
                  <span className="text-gray-600"> {t('share.cardInvite')}</span>
                </p>
                
                <div className="border-2 border-orange-200 border-dashed rounded-lg py-2.5 px-3 text-center mb-2.5" style={{ background: 'rgba(255,152,0,0.05)' }}>
                  <p className="text-[10px] text-gray-400 mb-0.5">{t('share.cardCodeLabel')}</p>
                  <p className="text-xl font-bold text-orange-600 tracking-[0.3em]">{inviteCode}</p>
                </div>

                <p className="text-[10px] text-center text-gray-400">
                  {t('share.cardReward')}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <p className="text-white/70 text-[10px]">{t('share.cardSlogan')}</p>
              </div>
            </div>

            {isGenerating && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(25,20,15,0.8)' }}>
                <div className="w-8 h-8 rounded-full border-3 border-amber-400/30 border-t-amber-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 pb-4 flex gap-2.5">
          <button
            onClick={handleDownload}
            disabled={!generatedImage}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white/60 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Download className="w-4 h-4" />
            {t('share.saveCard')}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white/60 text-sm font-medium transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {t('share.copyLink')}
          </button>
        </div>

        {/* 分享到平台 */}
        <div className="px-6 pb-4">
          <p className="text-white/25 text-[10px] tracking-wider mb-3">{t('share.shareTo')}</p>
          <div className="flex justify-center gap-8">
            {platforms.map((p) => {
              const cfg = platformConfig[p.id];
              if (!cfg) return null;
              return (
                <button
                  key={p.id}
                  onClick={() => handleShare(p)}
                  className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ background: cfg.bg, border: `1px solid ${p.color}22` }}
                  >
                    {cfg.svg}
                  </div>
                  <span className="text-white/30 text-[10px]">{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 系统分享 */}
        <div className="px-6 pb-6">
          <button
            onClick={handleNativeShare}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
              color: '#1a0800',
              boxShadow: '0 4px 20px rgba(255,150,30,0.25)',
            }}
          >
            <Share2 className="w-4 h-4 inline mr-2" />
            {t('share.moreWays')}
          </button>
        </div>

        <div className="h-6" />
      </div>
    </>
  );
}
