/**
 * Path B API-only entry — guest product API, no Stripe/OAuth/MySQL.
 * Render Free: https://moyu-fortune.onrender.com
 */
import express from "express";
import { createServer } from "http";
import { ensureStoreReady } from "./store";
import { registerLightApi } from "./routes";

const app = express();
app.use(express.json({ limit: "256kb" }));
registerLightApi(app);

const STATUS_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>摸了么 · moyu-light</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg0:#1a0f08;--bg1:#2a1810;--copper:#e67a2e;--gold:#ffb32c;--glass:rgba(255,255,255,0.06);
  --line:rgba(255,180,50,0.22);--text:#fff8f0;--muted:rgba(255,248,240,0.55);
}
*{box-sizing:border-box}
body{
  margin:0;min-height:100vh;color:var(--text);
  font-family:"Noto Sans SC",system-ui,sans-serif;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(255,140,40,0.28), transparent 55%),
    radial-gradient(900px 500px at 90% 0%, rgba(255,200,80,0.16), transparent 50%),
    linear-gradient(165deg,var(--bg0),var(--bg1) 55%,#120b07);
}
.wrap{max-width:42rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
.brand{
  font-family:"ZCOOL KuaiLe","Noto Sans SC",sans-serif;
  font-size:clamp(2rem,6vw,2.75rem);letter-spacing:0.04em;
  background:linear-gradient(135deg,var(--gold),var(--copper));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  margin:0 0 .35rem;
}
.sub{color:var(--muted);margin:0 0 1.5rem;line-height:1.6;font-size:.95rem}
.card{
  background:var(--glass);border:1px solid var(--line);border-radius:1.25rem;
  padding:1.15rem 1.25rem;backdrop-filter:blur(16px);
  box-shadow:0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
}
.ok{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;color:#6ee7a8;margin:0 0 .75rem}
.ok i{width:.55rem;height:.55rem;border-radius:50%;background:#34d399;box-shadow:0 0 12px #34d399;display:inline-block}
ul{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.55rem}
li{
  display:flex;justify-content:space-between;gap:1rem;align-items:center;
  padding:.7rem .85rem;border-radius:.85rem;background:rgba(0,0,0,0.22);
  border:1px solid rgba(255,255,255,0.06);font-size:.88rem
}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#ffd089;font-size:.82rem}
a{color:var(--gold);text-decoration:none}
a:hover{text-decoration:underline}
.cta{
  display:inline-block;margin-top:1.25rem;padding:.85rem 1.2rem;border-radius:999px;
  background:linear-gradient(135deg,var(--gold),var(--copper));color:#1a0800;font-weight:700;
  box-shadow:0 8px 28px rgba(230,122,46,0.35)
}
.note{margin-top:1rem;color:var(--muted);font-size:.8rem;line-height:1.5}
</style>
</head>
<body>
<main class="wrap">
  <h1 class="brand">摸了么</h1>
  <p class="sub">轻后端 API · 铜橙玻璃同款状态页。产品站在
    <a href="https://chillworks.ai">chillworks.ai</a>，这里只提供 guest/deviceId 云端同步。</p>
  <section class="card">
    <p class="ok"><i></i>moyu-light · online</p>
    <ul>
      <li><span>健康检查</span><a href="/health"><code>/health</code></a></li>
      <li><span>抽签同步</span><code>POST /api/light/draw</code></li>
      <li><span>历史</span><code>GET /api/light/history</code></li>
      <li><span>排行榜</span><code>GET /api/light/leaderboard</code></li>
      <li><span>反馈</span><code>POST /api/light/feedback</code></li>
      <li><span>邀请</span><code>GET/POST /api/light/invite</code></li>
      <li><span>档案</span><code>GET/POST /api/light/profile</code></li>
    </ul>
    <a class="cta" href="https://chillworks.ai">打开 chillworks.ai →</a>
    <p class="note">Render Free 休眠后首次请求可能要等 30–60 秒。可选 <code>LIBSQL_URL</code> + <code>LIBSQL_AUTH_TOKEN</code> 开启 Turso 持久化。</p>
  </section>
</main>
</body>
</html>`;

app.get("/", (_req, res) => {
  res.type("html").send(STATUS_HTML);
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

ensureStoreReady()
  .catch(err => console.warn("[moyu-light] store ready warn", err))
  .finally(() => {
    createServer(app).listen(port, host, () => {
      console.log(`moyu-light listening on ${host}:${port}`);
    });
  });
