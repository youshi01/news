import { getRuntimeSiteUrl } from "@/lib/runtime-config";

export const siteConfig = {
  name: "Southeast Signal",
  shortName: "SE Signal",
  description:
    "Fast multilingual coverage of technology, business, AI, security, and internet trends across Southeast Asia.",
  url: getRuntimeSiteUrl(),
  publisher: "Southeast Signal Desk"
};

export function absoluteUrl(path = "") {
  const base = siteConfig.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
