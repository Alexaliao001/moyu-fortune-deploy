import { Copy, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";
import { buildShareUrl, track } from "@/lib/analytics";

export default function Invite() {
  const { i18n } = useTranslation();
  const isEnglish =
    i18n.language === "en" || i18n.language.startsWith("en");
  const url = buildShareUrl("invite_page");
  const text = isEnglish
    ? "One draw a day — see whether today is a good day to take it easy."
    : "每天一签，测测今天能不能摸。";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("share_click", { channel: "copy", source: "invite_page" });
      toast.success(isEnglish ? "Link copied" : "分享链接已复制");
    } catch {
      toast.error(isEnglish ? "Copy failed" : "复制失败，请长按链接复制");
    }
  };

  const systemShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: isEnglish ? "MoYu" : "摸了么",
        text,
        url,
      });
      track("share_click", { channel: "web_share", source: "invite_page" });
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "AbortError") {
        toast.error(isEnglish ? "Share failed" : "分享未完成");
      }
    }
  };

  return (
    <PageLayout title={isEnglish ? "Share MoYu" : "分享摸了么"}>
      <div className="space-y-5 pt-3">
        <div className="text-center">
          <div className="text-5xl">🐟</div>
          <h2 className="mt-3 font-display text-2xl text-white">
            {isEnglish ? "Share the daily ritual" : "把今天这一签发给朋友"}
          </h2>
          <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-white/45">
            {isEnglish
              ? "No membership rewards or referral commissions. The link only helps us measure anonymous return traffic."
              : "没有会员奖励，也没有邀请返利。链接只用于统计匿名分享回流。"}
          </p>
        </div>

        <GlassCard accent="gold">
          <div className="p-5">
            <p className="text-center text-lg font-semibold text-amber-100/90">
              {text}
            </p>
            <p className="mt-3 break-all rounded-xl bg-black/20 p-3 text-center text-[11px] leading-relaxed text-white/35">
              {url}
            </p>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white/70"
          >
            <Copy className="h-4 w-4" />
            {isEnglish ? "Copy" : "复制链接"}
          </button>
          <button
            type="button"
            onClick={() => void systemShare()}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#1a0800]"
            style={{
              background:
                "linear-gradient(135deg, #FFB32C 0%, #FF8C00 100%)",
            }}
          >
            <Share2 className="h-4 w-4" />
            {isEnglish ? "Share" : "系统分享"}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
