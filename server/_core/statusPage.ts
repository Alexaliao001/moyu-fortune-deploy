import { ENV } from "./env";

/** MoYu copper-glass backend status page (browser-friendly). */
export function renderApiStatusPage(): string {
  const db = Boolean(ENV.databaseUrl);
  const stripe = Boolean(ENV.stripeSecretKey);
  const webhook = Boolean(ENV.stripeWebhookSecret);
  const llm = Boolean(ENV.forgeApiKey);

  const pill = (on: boolean, label: string) =>
    `<span class="pill ${on ? "on" : "off"}">${on ? "●" : "○"} ${label}</span>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>摸了么 · moyu-fortune API</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
:root{--bg0:#1a0f08;--bg1:#2a1810;--copper:#e67a2e;--gold:#ffb32c;--glass:rgba(255,255,255,0.06);--line:rgba(255,180,50,0.22);--text:#fff8f0;--muted:rgba(255,248,240,0.55)}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;color:var(--text);font-family:"Noto Sans SC",system-ui,sans-serif;background:radial-gradient(1200px 600px at 10% -10%,rgba(255,140,40,0.28),transparent 55%),radial-gradient(900px 500px at 90% 0%,rgba(255,200,80,0.16),transparent 50%),linear-gradient(165deg,var(--bg0),var(--bg1) 55%,#120b07)}
.wrap{max-width:44rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
.brand{font-family:"ZCOOL KuaiLe",sans-serif;font-size:clamp(2rem,6vw,2.75rem;background:linear-gradient(135deg,var(--gold),var(--copper));-webkit-background-clip:text;background-clip:text;color:transparent;margin:0 0 .35rem}
.sub{color:var(--muted);margin:0 0 1.25rem;line-height:1.6;font-size:.95rem}
.card{background:var(--glass);border:1px solid var(--line);border-radius:1.25rem;padding:1.15rem 1.25rem;backdrop-filter:blur(16px);box-shadow:0 12px 40px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.06);margin-bottom:1rem}
.ok{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;color:#6ee7a8;margin:0 0 .75rem}
.ok i{width:.55rem;height:.55rem;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399}
.pills{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0 1rem}
.pill{font-size:.78rem;padding:.35rem .65rem;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2)}
.pill.on{color:#6ee7a8;border-color:rgba(52,211,153,0.35)}
.pill.off{color:var(--muted)}
ul{list-style:none;padding:0;margin:0;display:grid;gap:.55rem}
li{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.7rem .85rem;border-radius:.85rem;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.06);font-size:.88rem}
code{font-family:ui-monospace,Menlo,monospace;color:#ffd089;font-size:.82rem}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
.cta{display:inline-block;margin-top:1rem;padding:.85rem 1.2rem;border-radius:999px;background:linear-gradient(135deg,var(--gold),var(--copper));color:#1a0800;font-weight:700;box-shadow:0 8px 28px rgba(230,122,46,0.35)}
.note{margin-top:1rem;color:var(--muted);font-size:.8rem;line-height:1.5}
</style>
</head>
<body>
<main class="wrap">
  <h1 class="brand">摸了么 · 全量后端</h1>
  <p class="sub">Path C API · 前端在 <a href="https://chillworks.ai">chillworks.ai</a>，本域只提供 tRPC + Stripe + Postgres。</p>
  <section class="card">
    <p class="ok"><i></i>moyu-fortune · path-c-1.0 · online</p>
    <div class="pills">
      ${pill(db, "Postgres")}
      ${pill(stripe, "Stripe")}
      ${pill(webhook, "Webhook")}
      ${pill(llm, "LLM")}
    </div>
    <ul>
      <li><span>健康检查</span><a href="/health"><code>GET /health</code></a></li>
      <li><span>系统状态</span><code>GET /api/trpc/system.health</code></li>
      <li><span>访客登录</span><code>POST /api/trpc/auth.registerGuest</code></li>
      <li><span>会员 / Stripe</span><code>POST /api/trpc/stripe.createCheckoutSession</code></li>
      <li><span>轻量 API</span><a href="/api/light/health"><code>/api/light/*</code></a></li>
    </ul>
    <a class="cta" href="https://chillworks.ai/membership">打开会员页 →</a>
    <p class="note">Render Free 休眠后首次打开可能要等 30–60 秒。若空白，刷新或先访问 <a href="/health">/health</a> 唤醒。</p>
  </section>
</main>
</body>
</html>`;
}
