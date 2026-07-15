import { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { downloadDataUrl, shareOrDownloadPng } from "@/lib/shareCard";
import { buildShareUrl } from "@/lib/analytics";

interface PosterGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  fortuneData: {
    level: string;
    emoji: string;
    percent: number;
    message: string;
    suggestedTime: string;
    /** Real beat%; 0 / null / missing = hide (铁律 1) */
    beatPercent: number;
  };
  streak?: number;
}

/** Copper / dark-gold — match Home copper aesthetic (AGENTS P1-1). */
const LEVEL_INK: Record<string, string> = {
  大吉: "#FFD54F",
  中吉: "#FFB74D",
  小吉: "#E8A838",
  末吉: "#C4A574",
  凶: "#8B7355",
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const chars = text.split("");
  const lines: string[] = [];
  let current = "";
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function PosterGenerator({
  isOpen,
  onClose,
  fortuneData,
  streak = 0,
}: PosterGeneratorProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === "en" || i18n.language.startsWith("en");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const generatePoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsGenerating(true);
    const width = 750;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    const ink = LEVEL_INK[fortuneData.level] || LEVEL_INK["小吉"]!;
    const showBeat = fortuneData.beatPercent > 0;

    // Dark copper ground
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#1A0C05");
    bg.addColorStop(0.45, "#2A1408");
    bg.addColorStop(1, "#0E0603");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Soft gold bloom
    const bloom = ctx.createRadialGradient(
      width / 2,
      220,
      20,
      width / 2,
      280,
      420
    );
    bloom.addColorStop(0, "rgba(255,179,44,0.22)");
    bloom.addColorStop(1, "rgba(255,179,44,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, 600);

    // Outer copper frame
    ctx.strokeStyle = "rgba(255,179,44,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, width - 72, height - 72);
    ctx.strokeStyle = "rgba(255,179,44,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,200,120,0.55)";
    ctx.font =
      '500 22px "ZCOOL KuaiLe", "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillText(isEnglish ? "MOYU · DAILY DRAW" : "摸了么 · 每日一签", width / 2, 100);

    // Date
    const today = new Date();
    const dateStr = isEnglish
      ? today.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    ctx.fillStyle = "rgba(255,220,170,0.85)";
    ctx.font =
      '28px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
    ctx.fillText(dateStr, width / 2, 150);

    // Level
    ctx.fillStyle = ink;
    ctx.shadowColor = "rgba(255,150,30,0.45)";
    ctx.shadowBlur = 28;
    ctx.font =
      'bold 128px "ZCOOL KuaiLe", "PingFang SC", "Noto Sans SC", sans-serif';
    const levelDisplay = isEnglish
      ? ({
          大吉: "Excellent",
          中吉: "Good",
          小吉: "Fair",
          末吉: "Minor",
          凶: "Bad",
        }[fortuneData.level] || fortuneData.level)
      : fortuneData.level;
    ctx.fillText(levelDisplay, width / 2, 320);
    ctx.shadowBlur = 0;

    // Emoji + percent (never paint a fake 0%)
    ctx.font = '72px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillText(fortuneData.emoji || "🐟", width / 2, 420);
    if (fortuneData.percent > 0) {
      ctx.fillStyle = "rgba(255,230,180,0.95)";
      ctx.font =
        'bold 64px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
      ctx.fillText(`${fortuneData.percent}%`, width / 2, 510);
    }

    // Divider
    ctx.strokeStyle = "rgba(255,179,44,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 550);
    ctx.lineTo(width - 140, 550);
    ctx.stroke();

    // Message (签文)
    ctx.fillStyle = "rgba(255,236,210,0.92)";
    ctx.font =
      '36px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
    const lines = wrapText(ctx, fortuneData.message || "", width - 160);
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, 620 + i * 52);
    });

    let y = 620 + lines.length * 52 + 40;

    // Beat % only when real
    if (showBeat) {
      ctx.fillStyle = "rgba(255,179,44,0.18)";
      roundRect(ctx, 120, y, width - 240, 64, 16);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.font =
        'bold 28px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
      ctx.fillText(
        isEnglish
          ? `Beat ${fortuneData.beatPercent}% of today's draws`
          : `今日击败 ${fortuneData.beatPercent}% 摸友`,
        width / 2,
        y + 42
      );
      y += 96;
    } else {
      y += 24;
    }

    if (streak > 0) {
      ctx.fillStyle = "rgba(255,200,120,0.7)";
      ctx.font =
        '26px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
      ctx.fillText(
        isEnglish ? `🔥 ${streak}-day streak` : `🔥 连续 ${streak} 天`,
        width / 2,
        y + 8
      );
      y += 48;
    }

    // Site cipher: logo + chillworks.ai
    const logo = await loadImage("/icons/icon-96x96.png");
    const cipherY = Math.max(y + 40, height - 160);
    if (logo) {
      const s = 56;
      ctx.drawImage(logo, width / 2 - s / 2, cipherY - 70, s, s);
    }
    ctx.fillStyle = "rgba(255,200,120,0.75)";
    ctx.font =
      '600 26px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
    ctx.fillText("chillworks.ai", width / 2, cipherY + 10);
    ctx.fillStyle = "rgba(255,200,120,0.4)";
    ctx.font =
      '20px "Noto Sans SC", "PingFang SC", -apple-system, sans-serif';
    ctx.fillText(
      isEnglish ? "Entertainment only" : "仅供娱乐",
      width / 2,
      cipherY + 42
    );

    const url = canvas.toDataURL("image/png");
    setPosterUrl(url);
    setIsGenerating(false);
  }, [fortuneData, isEnglish, streak]);

  useEffect(() => {
    if (isOpen) void generatePoster();
  }, [isOpen, generatePoster]);

  const filename = isEnglish
    ? `moyu-fortune-${fortuneData.level}-${Date.now()}.png`
    : `摸了么-${fortuneData.level}-${Date.now()}.png`;

  const shareText = isEnglish
    ? fortuneData.percent > 0
      ? `Today's MoYu draw: ${fortuneData.level} ${fortuneData.percent}% — ${fortuneData.message}`
      : `Today's MoYu draw: ${fortuneData.level} — ${fortuneData.message}`
    : fortuneData.percent > 0
      ? `今日摸了么：${fortuneData.level} ${fortuneData.percent}% — ${fortuneData.message}`
      : `今日摸了么：${fortuneData.level} — ${fortuneData.message}`;

  const handleSave = () => {
    if (!posterUrl) return;
    downloadDataUrl(posterUrl, filename);
    toast.success(isEnglish ? "Card saved" : "签文卡片已保存");
  };

  const handleShare = async () => {
    if (!posterUrl || busy) return;
    setBusy(true);
    try {
      const result = await shareOrDownloadPng({
        dataUrl: posterUrl,
        filename,
        title: isEnglish ? "MoYu Fortune Card" : "摸了么 · 签文卡片",
        text: shareText,
        url: buildShareUrl("card"),
      });
      if (result === "shared") {
        toast.success(isEnglish ? "Shared" : "已调起分享");
      } else if (result === "downloaded") {
        toast.message(
          isEnglish ? "Saved — long-press to share in WeChat" : "已保存 · 微信内可长按图片分享",
          {
            description: isEnglish
              ? "This browser has no system share sheet"
              : "当前环境不支持系统分享，已下载图片",
          }
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #1e1008 0%, #120805 100%)",
          border: "1px solid rgba(255,179,44,0.25)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="font-display text-lg text-amber-100/90">
            {isEnglish ? "Fortune card" : "签文卡片"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <canvas ref={canvasRef} className="hidden" />
          {isGenerating ? (
            <div className="flex h-80 items-center justify-center text-amber-200/50 text-sm">
              {isEnglish ? "Drawing…" : "绘制中…"}
            </div>
          ) : posterUrl ? (
            <img
              src={posterUrl}
              alt={isEnglish ? "Fortune card" : "签文卡片"}
              className="mx-auto w-full max-w-[320px] rounded-xl shadow-2xl"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!posterUrl || busy}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-amber-100/90 disabled:opacity-40"
            style={{ background: "rgba(255,179,44,0.12)", border: "1px solid rgba(255,179,44,0.25)" }}
          >
            <Download className="h-4 w-4" />
            {isEnglish ? "Save PNG" : "保存图片"}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!posterUrl || busy}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)",
              color: "#1a0800",
            }}
          >
            <Share2 className="h-4 w-4" />
            {isEnglish ? "Share" : "分享"}
          </button>
        </div>
        <p className="pb-3 text-center text-[10px] text-white/25">
          {isEnglish
            ? "Safari / WeChat: share sheet or long-press the image"
            : "Safari / 微信：点分享调起系统，或长按图片保存"}
        </p>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
