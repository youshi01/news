import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { getTrendingArticles } from "@/lib/data";
import { normalizeLocale } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Trending News"
};

export default async function TrendingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const articles = await getTrendingArticles(locale, 24);

  return (
    <main className="admin-page">
      <div className="section-heading">
        <h1>Trending News</h1>
        <span>Ranked by signal</span>
      </div>
      <section className="news-grid">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </section>
    </main>
  );
}
