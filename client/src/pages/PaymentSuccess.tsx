import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { CheckCircle, Home, Crown } from "lucide-react";
import confetti from "canvas-confetti";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";
import { trpc } from "@/lib/trpc";
import { isFullBackend } from "@/lib/staticMode";

export default function PaymentSuccess() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const sessionId = params.get("session_id");
  const full = isFullBackend();
  const confirm = trpc.stripe.confirmCheckoutSession.useMutation();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFB32C", "#FF8C00", "#22c55e"],
    });
  }, []);

  useEffect(() => {
    if (full && sessionId) {
      confirm.mutate({ sessionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, sessionId]);

  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <GlassCard accent="green" glow className="w-full max-w-sm">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            
            <div>
              <h2 className="text-white font-display text-2xl mb-1">
                {isEnglish ? 'Payment Successful!' : '支付成功！'}
              </h2>
              <p className="text-white/50 text-sm">
                {isEnglish ? 'Thank you! Your order has been completed.' : '感谢您的支持，您的订单已完成'}
              </p>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,180,50,0.08)', border: '1px solid rgba(255,180,50,0.15)' }}>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Crown className="w-4 h-4" />
                <span className="font-bold text-sm">
                  {isEnglish ? 'You are now a MoYu Member' : '您已成为摸鱼会员'}
                </span>
              </div>
              <p className="text-amber-400/60 text-xs mt-1">
                {isEnglish ? 'Enjoy unlimited draws and exclusive perks!' : '现在可以享受无限次抽签和专属特权啦！'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link href="/">
                <button className="w-full py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                    color: '#1a0800',
                  }}
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  {isEnglish ? 'Back to Fortune' : '返回首页抽签'}
                </button>
              </Link>
              <Link href="/membership">
                <button className="w-full py-2.5 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Crown className="w-4 h-4 inline mr-2" />
                  {isEnglish ? 'View Membership' : '查看会员权益'}
                </button>
              </Link>
            </div>

            {sessionId && (
              <p className="text-white/15 text-[10px]">
                {isEnglish ? 'Order: ' : '订单号：'}{sessionId.slice(0, 20)}...
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </PageLayout>
  );
}
