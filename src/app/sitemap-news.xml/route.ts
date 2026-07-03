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
  const articles = await getArticles(DEFAULT_LOCALE, 100);
  const recent = articles.filter((article) => {
    const age = Date.now() - safeDate(article.publishedAt).getTime();
    return age < 1000 * 60 * 60 * 48;
  });

  const urls = recent
    .map((article) => {
      const url = absoluteUrl(`/${article.locale}/news/${article.slug}`);

      return `
        <url>
          <loc>${escapeXml(url)}</loc>
          <news:news>
            <news:publication>
              <news:name>${escapeXml(siteConfig.name)}</news:name>
              <news:language>${escapeXml(article.locale)}</news:language>
            </news:publication>
            <news:publication_date>${safeDate(article.publishedAt).toISOString()}</news:publication_date>
            <news:title>${escapeXml(article.title)}</news:title>
          </news:news>
        </url>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
      ${urls}
    </urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8"
    }
  });
}
