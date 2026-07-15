import React from "react";
import { useTranslation } from "react-i18next";
import { Inbox, WifiOff, Cloud, History as HistoryIcon } from "lucide-react";
import { Link } from "wouter";
import { useOffline } from "@/hooks/useOffline";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";
import { isStaticMode, isFullBackend } from "@/lib/staticMode";
import { hasLightApi, lightGetHistory, type LightDraw } from "@/lib/lightApi";
import { getUserId } from "@/lib/localStorage";
import { trpc } from "@/lib/trpc";
const LEVEL_CONFIG: Record<string, { color: string; bg: string; titleEn: string }> = {
  "大吉": { color: '#FFD54F', bg: 'rgba(255,213,79,0.15)', titleEn: 'Great' },
  "中吉": { color: '#FFCA28', bg: 'rgba(255,202,40,0.12)', titleEn: 'Good' },
  "小吉": { color: '#FFB74D', bg: 'rgba(255,183,77,0.1)', titleEn: 'Fair' },
  "末吉": { color: '#FFCC80', bg: 'rgba(255,204,128,0.08)', titleEn: 'Minor' },
  "凶": { color: '#90A4AE', bg: 'rgba(144,164,174,0.1)', titleEn: 'Bad' },
};

type Row = {
  id?: string | number;
  level: string;
  emoji: string;
  percent: number;
  message?: string;
  avatar?: string;
  timestamp?: number;
  createdAt?: string;
  synced?: boolean;
  source?: "local" | "cloud";
};

/**
 * History: IndexedDB always; Path C merges tRPC cloud; Path B merges light API.
 */
export default function History() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en' || i18n.language.startsWith('en');
  const { isOffline, offlineRecords } = useOffline();
  const staticMode = isStaticMode();
  const full = isFullBackend();
  const light = hasLightApi();
  const [lightCloud, setLightCloud] = React.useState<LightDraw[]>([]);
  const [lightLoading, setLightLoading] = React.useState(false);
  const deviceId = getUserId();

  const { data: trpcHistory, isLoading: trpcLoading } = trpc.member.getHistory.useQuery(
    { limit: 40, offset: 0, deviceId },
    { enabled: full && !isOffline, retry: 1 }
  );

  React.useEffect(() => {
    if (!light || isOffline) return;
    let cancelled = false;
    setLightLoading(true);
    lightGetHistory(getUserId(), 40)
      .then(rows => {
        if (!cancelled) setLightCloud(rows);
      })
      .finally(() => {
        if (!cancelled) setLightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [light, isOffline, offlineRecords.length]);

  const getLevelDisplay = (level: string) => {
    if (!isEnglish) return level;
    return LEVEL_CONFIG[level]?.titleEn || level;
  };

  const localRows: Row[] = offlineRecords.map(r => ({
    ...r,
    source: "local" as const,
  }));

  const cloudRows: Row[] = full
    ? (trpcHistory?.history || []).map(r => ({
        id: r.id,
        level: r.level,
        emoji: r.emoji,
        percent: r.percent,
        message: r.message || undefined,
        avatar: r.avatar || undefined,
        createdAt: r.createdAt ? String(r.createdAt) : undefined,
        timestamp: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
        synced: true,
        source: "cloud" as const,
      }))
    : lightCloud.map(r => ({
        id: r.id,
        level: r.level,
        emoji: r.emoji,
        percent: r.percent,
        message: r.message,
        avatar: r.avatar,
        createdAt: r.createdAt,
        timestamp: new Date(r.createdAt).getTime(),
        synced: true,
        source: "cloud" as const,
      }));

  const cloudLoading = full ? trpcLoading : lightLoading;
  const hasCloud = full || light;

  const localKeys = new Set(
    localRows.map(
      r => `${r.level}|${r.percent}|${(r.message || "").slice(0, 40)}|${String(r.timestamp || "").slice(0, 10)}`
    )
  );
  const merged = [
    ...localRows,
    ...cloudRows.filter(r => {
      const key = `${r.level}|${r.percent}|${(r.message || "").slice(0, 40)}|${String(r.timestamp || "").slice(0, 10)}`;
      return !localKeys.has(key);
    }),
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const renderRecordItem = (record: Row, index: number): React.ReactNode => {
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
              {record.source === "cloud" && (
                <Cloud className="w-3 h-3 text-sky-400/60" />
              )}
            </div>
            <p className="text-white/60 text-xs line-clamp-1">
              {record.message || (isEnglish ? "No message" : "无文案")}
            </p>
            <p className="text-white/25 text-[10px] mt-0.5">
              {new Date(record.timestamp || record.createdAt || Date.now()).toLocaleString(isEnglish ? "en-US" : "zh-CN")}
            </p>
          </div>
          {record.avatar && (
            <span className="text-lg flex-shrink-0 opacity-60">{record.avatar}</span>
          )}
        </div>
      </GlassCard>
    );
  };

  return (
    <PageLayout title={isEnglish ? "History" : "历史记录"}>
      <OfflineIndicator isOffline={isOffline} />
      <div className="pt-4 space-y-3">
        <GlassCard accent="gold">
          <div className="p-3 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-amber-400" />
            <span className="text-white/70 text-xs">
              {isEnglish
                ? `${merged.length} record(s)${hasCloud ? " · local + cloud" : staticMode ? " · device only" : ""}`
                : `${merged.length} 条记录${hasCloud ? " · 本机+云端" : staticMode ? " · 仅此设备" : ""}`}
            </span>
            {(isOffline || (staticMode && !hasCloud)) && <WifiOff className="w-3.5 h-3.5 text-amber-400/60 ml-auto" />}
          </div>
        </GlassCard>

        {staticMode && !hasCloud && (
          <p className="text-white/30 text-[11px] px-1 leading-relaxed">
            {isEnglish
              ? "Static site: history stays on this device. Cloud sync needs a backend (not enabled)."
              : "静态站：历史仅保存在本机。云端同步需后端（当前未启用）。"}
          </p>
        )}
        {hasCloud && (
          <p className="text-white/30 text-[11px] px-1 leading-relaxed">
            {isEnglish
              ? cloudLoading
                ? "Syncing cloud history…"
                : "Cloud history synced from Postgres."
              : cloudLoading
                ? "正在同步云端历史…"
                : "云端历史已从数据库同步。"}
          </p>
        )}

        {merged.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-10 h-10 mx-auto text-white/15 mb-3" />
            <p className="text-white/30 text-sm">{isEnglish ? "No records yet" : "还没有抽签记录"}</p>
            <p className="text-white/20 text-xs mt-1">{isEnglish ? "Go draw your fortune!" : "快去抽签吧！"}</p>
            <Link href="/">
              <button
                className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)',
                  color: '#1a0800',
                }}
              >
                {isEnglish ? "Draw now" : "去抽签"}
              </button>
            </Link>
          </div>
        ) : (
          merged.map((record, index) => renderRecordItem(record, index))
        )}
      </div>
    </PageLayout>
  );
}
