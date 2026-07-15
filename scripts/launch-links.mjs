const CHANNELS = [
  ["jike", "即刻"],
  ["xiaohongshu", "小红书"],
  ["v2ex", "V2EX"],
  ["twitter_zh", "Twitter 中文圈"],
];

export function launchLinks(
  campaign = "launch_20260715",
  origin = "https://chillworks.ai"
) {
  return CHANNELS.map(([source, label]) => {
    const url = new URL("/", origin);
    url.searchParams.set("ref", "card");
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "organic_social");
    url.searchParams.set("utm_campaign", campaign);
    return { source, label, url: url.toString() };
  });
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;
if (isMain) {
  const campaign =
    process.argv.find(arg => arg.startsWith("--campaign="))?.split("=")[1] ||
    "launch_20260715";
  const links = launchLinks(campaign);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ campaign, links }, null, 2));
  } else {
    console.log(`# ${campaign}`);
    for (const link of links) console.log(`- ${link.label}: ${link.url}`);
  }
}
