import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Inbox } from 'lucide-react';
import { getLoginUrl } from "@/const";
import { Crown, Lock, WifiOff, Cloud, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useOffline } from "@/hooks/useOffline";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";

const LEVEL_CONFIG: Record<string, { color: string; bg: string; titleEn: string }> = {
  "大吉": { color: '#FFD54F', bg: 'rgba(255,213,79,0.15)', titleEn: 'Great' },
  "中吉": { color: '#FFCA28', bg: 'rgba(255,202,40,0.12)', titleEn: 'Good' },
  "小吉": { color: '#FFB74D', bg: 'rgba(255,183,77,0.1)', titleEn: 'Fair' },
  "末吉": { color: '#FFCC80', bg: 'rgba(255,204,128,0.08)', titleEn: 'Minor' },
  "凶": { color: '#90A4AE', bg: 'rgba(144,164,174,0.1)', titleEn: 'Bad' },
};

export default function History() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const { isOffline, offlineRecords } = useOffline();

  const { data: subscriptionStatus } = trpc.stripe.getSubscriptionStatus.useQuery(
    undefined,
    { enabled: true && !isOffline }
  );

  const { data: historyData, isLoading } = trpc.member.getHistory.useQuery(
    { limit: pageSize, offset: page * pageSize },
    { enabled: true && !!subscriptionStatus?.hasSubscription && !isOffline }
  );

  const isVip = subscriptionStatus?.hasSubscription;

  const getLevelDisplay = (level: string) => {
    if (!isEnglish) return level;
    return LEVEL_CONFIG[level]?.titleEn || level;
  };

  const renderRecordItem = (record: any, index: number): React.ReactNode => {
    const config = LEVEL_CONFIG[record.level] || LEVEL_CONFIG['小吉'];
    return (
      <GlassCard key={record.id || index} className="mb-2">
        <div className="p-3 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{record.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}30` }}
              >
                {getLevelDisplay(record.level)}
              </span>
              <span className="text-white/50 text-xs">{record.percent}%</span>
              {record.synced === false && (
                <Cloud className="w-3 h-3 text-amber-400/50" />
              )}
            </div>
            <p className="text-white/60 text-xs line-clamp-1">
              {record.message || (isEnglish ? "No message" : "无文案")}
            </p>
            <p className="text-white/25 text-[10px] mt-0.5">
              {new Date(record.timestamp || record.createdAt).toLocaleString(isEnglish ? "en-US" : "zh-CN")}
            </p>
          </div>
          {record.avatar && (
            <span className="text-lg flex-shrink-0 opacity-60">{record.avatar}</span>
          )}
        </div>
      </GlassCard>
    );
  };

  // 离线模式
  if (isOffline) {
    return (
      <PageLayout title={isEnglish ? "History" : "历史记录"}>
        <OfflineIndicator isOffline={isOffline} />
        <div className="pt-4 space-y-3">
          <GlassCard accent="gold">
            <div className="p-3 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span className="text-white/70 text-xs">
                {isEnglish ? `${offlineRecords.length} cached records` : `${offlineRecords.length} 条缓存记录`}
              </span>
            </div>
          </GlassCard>
          {offlineRecords.length === 0 ? (
            <div className="text-center py-12">
              <WifiOff className="w-10 h-10 mx-auto text-white/15 mb-3" />
              <p className="text-white/30 text-sm">{isEnglish ? "No cached records" : "暂无缓存记录"}</p>
            </div>
          ) : (
            offlineRecords.map((record, index) => renderRecordItem(record, index))
          )}
        </div>
      </PageLayout>
    );
  }

  if (authLoading) {
    return (
      <PageLayout title={isEnglish ? "History" : "历史记录"}>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-amber-400/30 border-t-amber-400 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  // 未登录
  if (!user) {
    return (
      <PageLayout title={isEnglish ? "History" : "历史记录"}>
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
              {isEnglish ? "Login to view your fortune history" : "登录后即可查看抽签历史"}
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

        {offlineRecords.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-white/30 text-xs flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              {isEnglish ? "Local Cache" : "本地缓存"}
            </p>
            {offlineRecords.slice(0, 3).map((record, index) => renderRecordItem(record, index))}
          </div>
        )}
      </PageLayout>
    );
  }

  // 非会员
  if (!isVip) {
    return (
      <PageLayout title={isEnglish ? "History" : "历史记录"}>
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,180,50,0.15) 0%, rgba(255,120,30,0.1) 100%)',
              border: '1px solid rgba(255,180,50,0.2)',
            }}
          >
            <Crown className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white/80 font-bold text-lg mb-1">{t('history.memberOnly')}</h2>
            <p className="text-white/40 text-sm">{t('history.becomeMember')}</p>
          </div>
          <Link href="/membership">
            <button className="px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                color: '#1a0800',
              }}
            >
              <Crown className="w-4 h-4 inline mr-1" />
              {t('membership.subscribe')}
            </button>
          </Link>
        </div>

        {offlineRecords.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-white/30 text-xs flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              {isEnglish ? "Local Cache (Free)" : "本地缓存（免费）"}
            </p>
            {offlineRecords.slice(0, 5).map((record, index) => renderRecordItem(record, index))}
          </div>
        )}
      </PageLayout>
    );
  }

  // VIP会员 - 完整历史
  return (
    <PageLayout title={isEnglish ? "History" : "历史记录"}>
      <div className="space-y-3 pt-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <GlassCard key={i}>
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded animate-pulse w-1/3" />
                    <div className="h-2 bg-white/5 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : historyData?.history && historyData.history.length > 0 ? (
          <>
            {historyData.history.map((record: any, index: number) => renderRecordItem(record, index))}
            
            {/* 分页 */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white/30 text-xs">
                {isEnglish ? `Page ${page + 1}` : `第 ${page + 1} 页`}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!historyData?.history || historyData.history.length < pageSize}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 disabled:opacity-20 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Inbox className="w-10 h-10 text-white/20 mb-3 mx-auto" />
            <p className="text-white/30 text-sm">{isEnglish ? "No records yet" : "还没有抽签记录"}</p>
            <p className="text-white/20 text-xs mt-1">{isEnglish ? "Go draw your fortune!" : "快去抽签吧！"}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
