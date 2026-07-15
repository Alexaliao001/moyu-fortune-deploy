import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, Heart, Infinity, ShieldCheck } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";
import { track } from "@/lib/analytics";

export default function Membership() {
  const { i18n } = useTranslation();
  const isEnglish =
    i18n.language === "en" || i18n.language.startsWith("en");

  useEffect(() => {
    track("membership_view");
  }, []);

  const promises = isEnglish
    ? [
        {
          icon: ShieldCheck,
          title: "The daily ritual stays free",
          text: "Draws, results and share cards will never be paywalled.",
        },
        {
          icon: Infinity,
          title: "One payment, if launched",
          text: "The planned ¥49.9 option is a one-time purchase, not a subscription.",
        },
        {
          icon: Clock3,
          title: "Validate before selling",
          text: "We will publish exact benefits only after the 7-day product test.",
        },
      ]
    : [
        {
          icon: ShieldCheck,
          title: "每日仪式永久免费",
          text: "抽签、签文结果和分享卡片永远不设付费墙。",
        },
        {
          icon: Infinity,
          title: "若开放，只做一次买断",
          text: "拟定价格 ¥49.9，不做月卡、季卡或自动续费。",
        },
        {
          icon: Clock3,
          title: "先验证，再售卖",
          text: "7 天验证结束前，不承诺尚未完成的头像、皮肤或其他权益。",
        },
      ];

  return (
    <PageLayout title={isEnglish ? "Support plan" : "支持计划"}>
      <div className="space-y-5 pt-3">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,180,50,0.2), rgba(255,120,30,0.12))",
              border: "1px solid rgba(255,180,50,0.28)",
            }}
          >
            <Heart className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="font-display text-2xl text-white">
            {isEnglish ? "Built on honest value" : "先把产品做好，再谈付费"}
          </h2>
          <p className="mx-auto mt-2 max-w-[310px] text-sm leading-relaxed text-white/45">
            {isEnglish
              ? "MoYu is running a public 7-day validation. Purchases are paused during the test."
              : "摸了么正在进行 7 天真实验证。验证期暂停购买，不用虚构权益提前逼单。"}
          </p>
        </div>

        <GlassCard accent="gold">
          <div className="space-y-4 p-5">
            {promises.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/85">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.05] py-3.5 text-sm font-semibold text-white/35"
        >
          {isEnglish ? "Unavailable during validation" : "验证期暂不开放购买"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-white/25">
          {isEnglish
            ? "Entertainment only · no recurring billing · no paid re-draws"
            : "仅供娱乐 · 不做订阅 · 不售卖重抽 · 不出售个人数据"}
        </p>
      </div>
    </PageLayout>
  );
}
