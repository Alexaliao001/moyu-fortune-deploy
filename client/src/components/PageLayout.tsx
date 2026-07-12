import { ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import FloatingDecorations from '@/components/FloatingDecorations';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
}

export default function PageLayout({ children, title, showBack = true, rightSlot }: PageLayoutProps) {
  return (
    <div className="min-h-screen theme-default theme-texture relative overflow-hidden">
      {/* 浮动装饰 */}
      <FloatingDecorations theme="default" />
      
      {/* 背景光晕 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(255,170,50,0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(255,120,50,0.3) 0%, transparent 70%)' }} />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col max-w-[480px] mx-auto px-5 safe-area-padding">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between py-3 flex-shrink-0">
          {showBack ? (
            <Link href="/">
              <button className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/8 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Link>
          ) : <div className="w-9" />}
          
          {title && (
            <h1 className="text-white/90 font-display text-base tracking-wide">{title}</h1>
          )}
          
          <div className="flex items-center gap-1">
            {rightSlot}
            <LanguageSwitch />
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
