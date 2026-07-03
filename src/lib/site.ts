import { getRuntimeSiteUrl } from "@/lib/runtime-config";

function normalizeSiteUrl(input: string) {
  const trimmed = input.trim() || "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  try {
    return new URL(withProtocol).toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

export const siteConfig = {
  name: "Southeast Signal",
  shortName: "SE Signal",
  description:
    "Fast multilingual coverage of technology, business, AI, security, and internet trends across Southeast Asia.",
  url: normalizeSiteUrl(getRuntimeSiteUrl()),
  publisher: "Southeast Signal Desk"
};

export function absoluteUrl(path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}
