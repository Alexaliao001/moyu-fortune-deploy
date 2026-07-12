import { Home, Fish } from "lucide-react";
import { useLocation } from "wouter";
import PageLayout from "@/components/PageLayout";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <PageLayout showBack={false}>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Fish className="w-14 h-14 text-white/20 mb-4 mx-auto" />
        <h1 className="text-5xl font-display text-white/20 mb-2">404</h1>
        <h2 className="text-white/60 font-bold text-lg mb-2">这条鱼游走了...</h2>
        <p className="text-white/30 text-sm mb-6">
          页面不存在，可能已经被摸走了
        </p>
        <button
          onClick={() => setLocation("/")}
          className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
            color: '#1a0800',
          }}
        >
          <Home className="w-4 h-4 inline mr-2" />
          回到首页
        </button>
      </div>
    </PageLayout>
  );
}
