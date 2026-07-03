import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { HeroStory } from "@/components/HeroStory";
import { NewsGrid } from "@/components/NewsGrid";
import { TrendRail } from "@/components/TrendRail";
import { getArticles, getTrendingArticles } from "@/lib/data";
import { normalizeLocale, SUPPORTED_LOCALES } from "@/lib/locales";
import { absoluteUrl, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);

  return {
    title: "Top Stories",
    description: siteConfig.description,
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((item) => [item, absoluteUrl(`/${item}`)])
      )
    }
  };
}

export default async function LocaleHomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const articles = await getArticles(locale, 12);
  const trending = await getTrendingArticles(locale, 7);
  const [hero, ...rest] = articles;

  return (
    <main className="main-layout">
      <div className="content-column">
        <AdSlot placement="home_top" />
        {hero && <HeroStory article={hero} />}
        <div className="section-heading">
          <h2>Latest Briefing</h2>
          <span>Auto updated</span>
        </div>
        <AdSlot placement="home_feed_middle" />
        <NewsGrid articles={rest.length ? rest : articles} />
      </div>
      <TrendRail articles={trending} />
    </main>
  );
}
