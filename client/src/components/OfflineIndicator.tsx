import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 animate-slide-down">
      <WifiOff className="w-3.5 h-3.5" />
      <span>{isEnglish ? 'Offline mode - Viewing cached data' : '离线模式 - 正在查看缓存数据'}</span>
    </div>
  );
}
