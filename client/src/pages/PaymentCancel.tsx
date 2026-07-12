import { Link } from "wouter";
import { XCircle, Home, ArrowLeft } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";

export default function PaymentCancel() {
  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <GlassCard className="w-full max-w-sm">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <XCircle className="w-8 h-8 text-white/30" />
            </div>
            
            <div>
              <h2 className="text-white/80 font-display text-xl mb-1">支付已取消</h2>
              <p className="text-white/40 text-sm">您已取消本次支付，订单未完成</p>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-white/40 text-xs">
                如果您在支付过程中遇到问题，请随时联系我们的客服获取帮助。
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link href="/membership">
                <button className="w-full py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                    color: '#1a0800',
                  }}
                >
                  <ArrowLeft className="w-4 h-4 inline mr-2" />
                  返回会员页面
                </button>
              </Link>
              <Link href="/">
                <button className="w-full py-2.5 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  返回首页
                </button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </PageLayout>
  );
}
