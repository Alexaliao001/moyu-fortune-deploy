import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Gift, Users, Copy, Check, Lock, Share2, Sparkles } from "lucide-react";
import SharePanel from "@/components/SharePanel";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";

export default function Invite() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const { user, loading: authLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [sharePanelOpen, setSharePanelOpen] = useState(false);

  const { data: inviteCode, isLoading: codeLoading } = trpc.member.getInviteCode.useQuery(
    undefined,
    { enabled: true }
  );

  const { data: inviteStats, refetch: refetchStats } = trpc.member.getInviteStats.useQuery(
    undefined,
    { enabled: true }
  );

  const applyInviteCode = trpc.member.applyInviteCode.useMutation({
    onSuccess: (data) => {
      toast.success(isEnglish ? "Invite code applied!" : "成功使用邀请码！", {
        description: isEnglish ? `Thanks to ${data.inviterName}` : `感谢 ${data.inviterName} 的邀请`,
      });
      setInviteCodeInput("");
    },
    onError: (error) => {
      toast.error(isEnglish ? "Failed to apply code" : "使用邀请码失败", {
        description: error.message,
      });
    },
  });

  const claimReward = trpc.member.claimInviteReward.useMutation({
    onSuccess: (data) => {
      toast.success(isEnglish 
        ? `Claimed ${data.rewardDays} days membership!` 
        : `成功领取 ${data.rewardDays} 天会员！`
      );
      refetchStats();
    },
    onError: (error) => {
      toast.error(isEnglish ? "Failed to claim reward" : "领取奖励失败", {
        description: error.message,
      });
    },
  });

  const handleCopyCode = () => {
    if (inviteCode?.inviteCode) {
      navigator.clipboard.writeText(inviteCode.inviteCode);
      setCopied(true);
      toast.success(t('invite.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading) {
    return (
      <PageLayout title={isEnglish ? "Invite Friends" : "邀请好友"}>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-amber-400/30 border-t-amber-400 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout title={isEnglish ? "Invite Friends" : "邀请好友"}>
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Lock className="w-7 h-7 text-white/30" />
          </div>
          <div>
            <h2 className="text-white/80 font-bold text-lg mb-1">
              {isEnglish ? "Please Login" : "请先登录"}
            </h2>
            <p className="text-white/40 text-sm">
              {isEnglish ? "Login to join the referral program" : "登录后即可参与邀请活动"}
            </p>
          </div>
          <button
            onClick={() => window.location.href = getLoginUrl()}
            className="px-6 py-2.5 rounded-xl font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
              color: '#1a0800',
            }}
          >
            {isEnglish ? "Login Now" : "立即登录"}
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={isEnglish ? "Invite Friends" : "邀请好友"}>
      <div className="space-y-4 pt-2">
        
        {/* Hero奖励说明 */}
        <GlassCard accent="gold" glow>
          <div className="p-5 text-center">
            <div className="mb-2 flex justify-center"><Gift className="w-9 h-9 text-amber-400" /></div>
            <h2 className="text-white font-display text-xl mb-1">
              {isEnglish ? "Invite Friends, Get Rewards" : "邀请好友得会员"}
            </h2>
            <p className="text-white/50 text-xs">{t('invite.rewardDesc')}</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-xs font-bold">
                  {isEnglish ? "+3 days/invite" : "每邀请+3天"}
                </span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 text-xs font-bold">
                  {isEnglish ? "No limit" : "无上限"}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 我的邀请码 */}
        <GlassCard>
          <div className="p-4 space-y-3">
            <h3 className="text-white/80 text-xs font-bold tracking-wider">
              {isEnglish ? "YOUR INVITE CODE" : "我的邀请码"}
            </h3>
            
            {codeLoading ? (
              <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl px-4 py-3 text-center"
                  style={{ 
                    background: 'rgba(255,180,50,0.08)', 
                    border: '2px dashed rgba(255,180,50,0.3)',
                  }}
                >
                  <span className="text-xl font-bold text-amber-400 tracking-[0.3em] font-mono">
                    {inviteCode?.inviteCode || "..."}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ 
                    background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/50" />}
                </button>
              </div>
            )}
            
            <button
              onClick={() => setSharePanelOpen(true)}
              disabled={!inviteCode?.inviteCode}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-30"
              style={{
                background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                color: '#1a0800',
                boxShadow: '0 4px 20px rgba(255,150,30,0.3)',
              }}
            >
              <Share2 className="w-4 h-4 inline mr-2" />
              {isEnglish ? "Share Invite Card" : "分享邀请卡"}
            </button>
          </div>
        </GlassCard>

        {/* 使用邀请码 */}
        <GlassCard>
          <div className="p-4 space-y-3">
            <h3 className="text-white/80 text-xs font-bold tracking-wider">
              {isEnglish ? "USE INVITE CODE" : "使用邀请码"}
            </h3>
            <div className="flex gap-2">
              <input
                placeholder={isEnglish ? "8-digit code" : "输入8位邀请码"}
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono tracking-widest text-white placeholder:text-white/20 outline-none"
                style={{ 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <button
                onClick={() => applyInviteCode.mutate({ inviteCode: inviteCodeInput })}
                disabled={inviteCodeInput.length !== 8 || applyInviteCode.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/80 transition-all active:scale-95 disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {applyInviteCode.isPending 
                  ? (isEnglish ? "..." : "...") 
                  : (isEnglish ? "Apply" : "使用")
                }
              </button>
            </div>
          </div>
        </GlassCard>

        {/* 邀请统计 */}
        <GlassCard>
          <div className="p-4">
            <h3 className="text-white/80 text-xs font-bold tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-white/40" />
              {isEnglish ? "INVITE STATS" : "邀请统计"}
            </h3>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: inviteStats?.totalInvites || 0, label: isEnglish ? "Invited" : "已邀请", color: 'text-amber-400' },
                { value: inviteStats?.claimedRewards || 0, label: isEnglish ? "Claimed" : "已领天数", color: 'text-green-400' },
                { value: inviteStats?.pendingRewards || 0, label: isEnglish ? "Pending" : "待领天数", color: 'text-purple-400' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className={`text-2xl font-display ${stat.color}`}>{stat.value}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {inviteStats?.inviteList && inviteStats.inviteList.length > 0 ? (
              <div className="space-y-2">
                {inviteStats.inviteList.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div>
                      <p className="text-white/70 text-sm font-medium">{invite.inviteeName}</p>
                      <p className="text-white/25 text-[10px]">
                        {new Date(invite.createdAt).toLocaleDateString(isEnglish ? "en-US" : "zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400/60 text-xs">+{invite.rewardDays}{t('invite.days')}</span>
                      {invite.rewardClaimed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-white/30"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          {isEnglish ? "Claimed" : "已领取"}
                        </span>
                      ) : (
                        <button
                          onClick={() => claimReward.mutate({ invitationId: invite.id })}
                          disabled={claimReward.isPending}
                          className="px-3 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95"
                          style={{
                            background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                            color: '#1a0800',
                          }}
                        >
                          {isEnglish ? "Claim" : "领取"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-white/20 mb-2 mx-auto" />
                <p className="text-white/30 text-xs">{isEnglish ? "No invites yet" : "还没有邀请记录"}</p>
                <p className="text-white/20 text-[10px] mt-0.5">{isEnglish ? "Share your code!" : "快分享邀请码吧！"}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <SharePanel
        isOpen={sharePanelOpen}
        onClose={() => setSharePanelOpen(false)}
        inviteCode={inviteCode?.inviteCode || ''}
        userName={user?.name || (isEnglish ? 'Slacker Pro' : '摸鱼达人')}
      />
    </PageLayout>
  );
}
