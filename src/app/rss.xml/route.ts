import { getArticles } from "@/lib/data";
import { safeDate } from "@/lib/date-format";
import { DEFAULT_LOCALE } from "@/lib/locales";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const revalidate = 300;

function escapeXml(input = "") {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await getArticles(DEFAULT_LOCALE, 50);
  const items = articles
    .map((article) => {
      const url = absoluteUrl(`/${article.locale}/news/${article.slug}`);

      return `
        <item>
          <title>${escapeXml(article.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid>${escapeXml(url)}</guid>
          <description>${escapeXml(article.description)}</description>
          <pubDate>${safeDate(article.publishedAt).toUTCString()}</pubDate>
          <source url="${escapeXml(article.sourceUrl)}">${escapeXml(article.sourceName)}</source>
        </item>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>${escapeXml(siteConfig.name)}</title>
        <link>${escapeXml(siteConfig.url)}</link>
        <description>${escapeXml(siteConfig.description)}</description>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8"
    }
  });
}
