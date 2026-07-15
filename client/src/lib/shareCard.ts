/**
 * Share-card helpers — PNG download + Web Share API (P1-1).
 * Safari / WeChat: prefer share with files; fall back to download + toast.
 */

import { track } from "./analytics";

export async function dataUrlToFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
  track("card_saved", { via: "download" });
}

export type ShareCardResult = "shared" | "downloaded" | "cancelled" | "unavailable";

/** Share PNG via Web Share API when possible; else download. */
export async function shareOrDownloadPng(opts: {
  dataUrl: string;
  filename: string;
  title: string;
  text: string;
  url?: string;
}): Promise<ShareCardResult> {
  const { dataUrl, filename, title, text, url } = opts;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = await dataUrlToFile(dataUrl, filename);
      const data: ShareData = { title, text };
      if (url) data.url = url;

      const withFiles: ShareData = { ...data, files: [file] };
      if (navigator.canShare?.(withFiles)) {
        await navigator.share(withFiles);
        track("share_click", { via: "web_share_file" });
        return "shared";
      }

      await navigator.share(data);
      track("share_click", { via: "web_share" });
      return "shared";
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError") return "cancelled";
      /* fall through to download */
    }
  }

  downloadDataUrl(dataUrl, filename);
  return "downloaded";
}
