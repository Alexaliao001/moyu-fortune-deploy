import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检查是否已经是 PWA 模式
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // 检查是否是 iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 检查是否已经显示过提示
    const hasShownPrompt = localStorage.getItem('pwa-install-prompt-shown');
    const lastShown = localStorage.getItem('pwa-install-prompt-last-shown');
    const now = Date.now();
    
    // 如果已经是 PWA 模式，不显示
    if (standalone) return;

    // 如果24小时内已经显示过，不再显示
    if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) return;

    // 监听 beforeinstallprompt 事件（Android/Desktop Chrome）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 延迟显示，让用户先体验应用
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS 需要手动提示
    if (iOS && !hasShownPrompt) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      
      setDeferredPrompt(null);
    }
    
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-shown', 'true');
    localStorage.setItem('pwa-install-prompt-last-shown', Date.now().toString());
  };

  // 不显示的情况
  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-sm mx-auto border border-orange-100">
        {/* 关闭按钮 */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">
              {isEnglish ? 'Add to Home Screen' : '添加到主屏幕'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {isEnglish 
                ? 'Install MoYu for quick access and offline use'
                : '安装摸了么，快速访问，离线可用'
              }
            </p>

            {isIOS ? (
              // iOS 安装指引
              <div className="mt-2 text-xs text-gray-600 bg-orange-50 rounded-lg p-2">
                <p className="flex items-center gap-1">
                  <span>1.</span>
                  <span>{isEnglish ? 'Tap' : '点击'}</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded text-xs">
                    ↑
                  </span>
                  <span>{isEnglish ? 'Share button' : '分享按钮'}</span>
                </p>
                <p className="mt-1">
                  <span>2.</span>
                  <span className="ml-1">
                    {isEnglish ? 'Select "Add to Home Screen"' : '选择"添加到主屏幕"'}
                  </span>
                </p>
              </div>
            ) : (
              // Android/Desktop 安装按钮
              <Button
                onClick={handleInstall}
                size="sm"
                className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                {isEnglish ? 'Install Now' : '立即安装'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
