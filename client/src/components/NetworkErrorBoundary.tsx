import { useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/hooks/useOffline';

interface NetworkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function NetworkErrorBoundary({ children, fallback }: NetworkErrorBoundaryProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const { isOffline } = useOffline();
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 当网络恢复时，自动重试
    if (!isOffline && hasError) {
      setHasError(false);
      setRetryCount(0);
    }
  }, [isOffline, hasError]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  if (hasError || (isOffline && fallback)) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-b from-orange-400 to-orange-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-orange-500" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isEnglish ? 'Connection Lost' : '网络连接失败'}
          </h2>
          
          <p className="text-gray-500 text-sm mb-4">
            {isEnglish 
              ? 'Please check your network connection and try again.'
              : '请检查您的网络连接后重试。'
            }
          </p>

          {retryCount > 0 && (
            <p className="text-xs text-gray-400 mb-4">
              {isEnglish 
                ? `Retry attempt: ${retryCount}`
                : `重试次数：${retryCount}`
              }
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-1" />
              {isEnglish ? 'Home' : '首页'}
            </Button>
            
            <Button
              onClick={handleRetry}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {isEnglish ? 'Retry' : '重试'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
