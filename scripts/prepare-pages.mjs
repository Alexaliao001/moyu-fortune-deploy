import { copyFile } from "node:fs/promises";

const publicDir = new URL("../dist/public/", import.meta.url);
await copyFile(new URL("index.html", publicDir), new URL("404.html", publicDir));
console.log("Prepared GitHub Pages SPA fallback");
