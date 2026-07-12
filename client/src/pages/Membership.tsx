import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Crown, Check, Sparkles, Infinity, Zap, Shield, Star } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";

export default function Membership() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const { user, loading: authLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("LIFETIME_MEMBERSHIP");

  const PLANS = [
    {
      key: "MONTHLY_MEMBERSHIP",
      name: isEnglish ? "Monthly" : "月卡",
      price: isEnglish ? "$2.99" : "¥19.9",
      period: isEnglish ? "/mo" : "/月",
      description: isEnglish ? "Try it out" : "适合尝鲜体验",
      features: isEnglish ? [
        "Unlimited draws",
        "History records",
        "Ad-free experience",
        "VIP avatars",
      ] : [
        "无限次抽签",
        "历史运势记录",
        "去除广告",
        "专属头像解锁",
      ],
      popular: false,
      accent: 'blue' as const,
      icon: <Crown className="w-5 h-5" />,
    },
    {
      key: "LIFETIME_MEMBERSHIP",
      name: isEnglish ? "Lifetime" : "永久卡",
      price: isEnglish ? "$6.99" : "¥49.9",
      period: "",
      description: isEnglish ? "One-time, forever" : "一次付款，永久使用",
      features: isEnglish ? [
        "Unlimited draws forever",
        "All member benefits",
        "Exclusive lifetime avatars",
        "Free updates forever",
      ] : [
        "永久无限次抽签",
        "全部会员权益",
        "永久会员专属头像",
        "终身免费更新",
      ],
      popular: true,
      accent: 'gold' as const,
      icon: <Infinity className="w-5 h-5" />,
      savings: isEnglish ? "Save 80%+" : "省80%+",
    },
  ];

  const { data: subscriptionStatus, isLoading: subLoading } = trpc.stripe.getSubscriptionStatus.useQuery(
    undefined,
    { enabled: true }
  );

  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.success(isEnglish ? "Redirecting to payment" : "正在跳转到支付页面", {
          description: isEnglish ? "Please complete payment in new window" : "请在新窗口完成支付",
        });
        window.open(data.checkoutUrl, "_blank");
      }
      setLoadingPlan(null);
    },
    onError: (error) => {
      toast.error(isEnglish ? "Failed to create order" : "创建订单失败", {
        description: error.message,
      });
      setLoadingPlan(null);
    },
  });

  const handleSubscribe = (planKey: string) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    setLoadingPlan(planKey);
    createCheckoutSession.mutate({ productKey: planKey as any });
  };

  if (authLoading || subLoading) {
    return (
      <PageLayout title={isEnglish ? "Membership" : "会员中心"}>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-amber-400/30 border-t-amber-400 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  const isLifetimeMember = subscriptionStatus?.plan === "lifetime";
  const hasSubscription = subscriptionStatus?.hasSubscription;

  return (
    <PageLayout title={isEnglish ? "Membership" : "会员中心"}>
      <div className="space-y-5 pt-2">
        
        {/* Hero区域 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-1"
            style={{
              background: 'linear-gradient(135deg, rgba(255,180,50,0.2) 0%, rgba(255,120,30,0.15) 100%)',
              border: '1px solid rgba(255,180,50,0.3)',
              boxShadow: '0 0 40px rgba(255,150,30,0.15)',
            }}
          >
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-white font-display text-2xl">
            {isEnglish ? "Unlock Full Power" : "解锁全部摸鱼能力"}
          </h2>
          <p className="text-white/50 text-sm max-w-[280px] mx-auto leading-relaxed">
            {isEnglish 
              ? "Unlimited draws, exclusive avatars, and premium features"
              : "无限抽签、专属头像、高级功能一应俱全"
            }
          </p>
        </div>

        {/* 当前订阅状态 */}
        {hasSubscription && (
          <GlassCard accent="gold" glow>
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)' }}
              >
                {isLifetimeMember ? <Infinity className="w-6 h-6 text-white" /> : <Crown className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">
                    {isLifetimeMember ? (isEnglish ? "Lifetime Member" : "永久会员") : (isEnglish ? "Monthly Member" : "月卡会员")}
                  </span>
                  {isLifetimeMember && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      FOREVER
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs mt-0.5">
                  {isLifetimeMember 
                    ? (isEnglish ? "Thank you for your support!" : "感谢您的支持！永久有效")
                    : (isEnglish 
                      ? `Valid until: ${subscriptionStatus?.currentPeriodEnd ? new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("en-US") : "Unknown"}`
                      : `有效期至：${subscriptionStatus?.currentPeriodEnd ? new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("zh-CN") : "未知"}`
                    )
                  }
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 权益对比 */}
        <GlassCard>
          <div className="p-4">
            <h3 className="text-white/80 text-xs font-bold tracking-wider mb-3">
              {isEnglish ? "MEMBER BENEFITS" : "会员权益"}
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: <Zap className="w-4 h-4" />, free: isEnglish ? "3 draws/day" : "每日3次", vip: isEnglish ? "Unlimited" : "无限次", label: isEnglish ? "Daily Draws" : "每日抽签" },
                { icon: <Star className="w-4 h-4" />, free: "5", vip: isEnglish ? "50+" : "50+", label: isEnglish ? "Avatars" : "头像数量" },
                { icon: <Shield className="w-4 h-4" />, free: "✗", vip: "✓", label: isEnglish ? "History" : "历史记录" },
                { icon: <Sparkles className="w-4 h-4" />, free: "✗", vip: "✓", label: isEnglish ? "Ad-free" : "无广告" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-amber-400/70">{item.icon}</span>
                  <span className="text-white/60 text-xs flex-1">{item.label}</span>
                  <span className="text-white/30 text-xs w-16 text-center">{item.free}</span>
                  <span className="text-amber-400 text-xs font-bold w-16 text-center">{item.vip}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                <span className="w-4" />
                <span className="flex-1" />
                <span className="text-white/20 text-[10px] w-16 text-center">{isEnglish ? "Free" : "免费"}</span>
                <span className="text-amber-400/60 text-[10px] w-16 text-center">VIP</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 会员计划选择 */}
        <div className="space-y-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.key;
            return (
              <GlassCard 
                key={plan.key} 
                accent={isSelected ? plan.accent : 'none'}
                glow={isSelected && plan.popular}
                onClick={() => setSelectedPlan(plan.key)}
              >
                <div className="p-4 relative">
                  {/* 推荐标签 */}
                  {plan.popular && (
                    <div className="absolute -top-px right-4">
                      <div className="px-3 py-1 rounded-b-lg text-[10px] font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                          color: '#1a0800',
                        }}
                      >
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {isEnglish ? "BEST VALUE" : "最划算"}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* 选择指示器 */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      isSelected 
                        ? 'border-amber-400 bg-amber-400' 
                        : 'border-white/20'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-amber-400/70">{plan.icon}</span>
                        <span className="text-white font-bold">{plan.name}</span>
                        {plan.savings && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                            {plan.savings}
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs">{plan.description}</p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className="text-white font-display text-xl">{plan.price}</span>
                      {plan.period && <span className="text-white/30 text-xs">{plan.period}</span>}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* 购买按钮 */}
        {!hasSubscription && (
          <button
            onClick={() => handleSubscribe(selectedPlan)}
            disabled={!!loadingPlan}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
              color: '#1a0800',
              boxShadow: '0 4px 20px rgba(255,150,30,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {loadingPlan ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                {isEnglish ? "Processing..." : "处理中..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                {isEnglish ? "Subscribe Now" : "立即开通"}
              </span>
            )}
          </button>
        )}

        {/* 社会证明 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ))}
            <span className="text-white/40 text-xs ml-1">4.9/5</span>
          </div>
          <p className="text-white/25 text-[11px]">
            {isEnglish 
               ? "Join our growing community of slackers"
               : "加入摸鱼达人的行列"
             }
          </p>
          <p className="text-white/20 text-[10px]">
            {isEnglish ? "Secure payment via Stripe • Cancel anytime" : "Stripe 安全支付 · 随时取消"}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
