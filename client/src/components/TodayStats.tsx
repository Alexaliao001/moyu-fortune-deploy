import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Dices, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { isFullBackend } from "@/lib/staticMode";

/** Real backend stats only (AGENTS.md 铁律 1). No Math.random. */
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;

    const diff = value - prev;
    const steps = 12;
    const stepDuration = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(prev + diff * eased));
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(value);
        prevRef.current = value;
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

export function TodayStats() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === "en" || i18n.language.startsWith("en");
  const full = isFullBackend();

  const { data, isError, isPending } = trpc.leaderboard.globalStats.useQuery(undefined, {
    enabled: full,
    retry: 1,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Iron law 1: no fake numbers. Hide entirely until we have real backend stats.
  if (!full) return null;
  if (isPending && !data) {
    return (
      <div className="flex items-center justify-center py-0.5">
        <span className="text-white/25 text-[10px]">
          {isEnglish ? "Loading stats…" : "统计加载中…"}
        </span>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-0.5">
        <span className="text-white/25 text-[10px]">
          {isEnglish ? "Beta · stats coming soon" : "内测中 · 统计暂缺"}
        </span>
      </div>
    );
  }

  const todayDraws = Number(data.todayDraws || 0);
  // Align with light uniqueDevices: drawers who have ≥1 draw
  const drawers = Number(
    (data as { drawers?: number }).drawers ?? data.totalUsers ?? 0
  );

  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Dices className="w-3 h-3 text-white/30" />
        <span className="text-white/40 text-[10px] tabular-nums">
          <AnimatedNumber value={todayDraws} />
          <span className="ml-0.5 text-white/30">{isEnglish ? "today" : "今日"}</span>
        </span>
      </div>

      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Users className="w-3 h-3 text-white/30" />
        <span className="text-white/40 text-[10px] tabular-nums">
          <AnimatedNumber value={drawers} />
          <span className="ml-0.5 text-white/30">
            {isEnglish ? "drawers" : "摸友"}
          </span>
        </span>
      </div>
    </div>
  );
}
