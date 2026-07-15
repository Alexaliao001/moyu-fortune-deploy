import { readdir, readFile } from "node:fs/promises";

const publicDir = new URL("../dist/public/", import.meta.url);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);
const forbidden = [
  {
    label: "development leak",
    // Any absolute macOS home path in dist is a leak, whatever the username.
    pattern: /jsxDEV|fileName:|\/Users\/[a-z]+\/|%VITE_/,
  },
  {
    label: "audit residue",
    pattern:
      /todayDraws:1234|ratingValue|ChillWorksAI|__manus__|manuscdn/,
  },
  {
    label: "false commercial promise",
    pattern: /每日\s*3\s*次|无限抽|50\+\s*头像|AI\s*生成/,
  },
];

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(new URL(`${entry.name}/`, directory), `${relative}/`))
      );
    } else {
      files.push(relative);
    }
  }
  return files;
}

const files = await listFiles(publicDir);
const violations = [];
for (const file of files) {
  const extension = file.slice(file.lastIndexOf("."));
  if (!textExtensions.has(extension)) continue;
  const content = await readFile(new URL(file, publicDir), "utf8");
  for (const check of forbidden) {
    if (check.pattern.test(content)) {
      violations.push(`${check.label}: ${file}`);
    }
  }
}

const [indexHtml, fallbackHtml, cname] = await Promise.all([
  readFile(new URL("index.html", publicDir), "utf8"),
  readFile(new URL("404.html", publicDir), "utf8"),
  readFile(new URL("CNAME", publicDir), "utf8"),
]);
if (fallbackHtml !== indexHtml) violations.push("SPA fallback differs from index.html");
if (cname.trim() !== "chillworks.ai") violations.push("CNAME is not chillworks.ai");

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Release check passed (${files.length} public files)`);
