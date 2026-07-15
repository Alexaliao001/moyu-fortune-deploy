import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initDrawOutbox } from "./lib/drawOutbox";
import { getUserId, getUserName } from "./lib/localStorage";

initAnalytics();
initDrawOutbox();

const CHUNK_RELOAD_KEY = "moyu-chunk-reload";

/** After a deploy, stale SW/cache can fail entry/dynamic imports — reload once. */
function reloadOnceOnChunkError(reason: string) {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    console.warn("[moyu] chunk load failed, reloading once:", reason);
    window.location.reload();
  } catch {
    /* ignore */
  }
}

function looksLikeChunkFailure(msg: string) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|ChunkLoadError/i.test(
    msg
  );
}

window.addEventListener("vite:preloadError", event => {
  event.preventDefault();
  reloadOnceOnChunkError("vite:preloadError");
});

window.addEventListener("unhandledrejection", event => {
  const msg = String(
    (event.reason && (event.reason.message || event.reason)) || event.reason || ""
  );
  if (looksLikeChunkFailure(msg)) {
    event.preventDefault();
    reloadOnceOnChunkError(msg);
  }
});

window.addEventListener(
  "error",
  event => {
    const t = event.target as HTMLElement | null;
    if (t && (t.tagName === "SCRIPT" || t.tagName === "LINK")) {
      const src =
        (t as HTMLScriptElement).src || (t as HTMLLinkElement).href || "";
      if (src.includes("/assets/js/") || src.includes("/assets/css/")) {
        reloadOnceOnChunkError(src);
      }
    }
  },
  true
);

function trpcBase(): string {
  const raw = (import.meta.env.VITE_MOYU_API_BASE as string | undefined)?.trim();
  if (raw && raw !== "undefined") return raw.replace(/\/$/, "");
  return "";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${trpcBase()}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers(init?.headers);
        headers.set("X-Device-Id", getUserId());
        headers.set("X-Device-Name", getUserName());
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// After a successful boot settles, allow another one-shot reload on a later deploy.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}, 15_000);
