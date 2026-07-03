import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticles } from "@/lib/data";
import { normalizeLocale } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Latest News"
};

export default async function LatestPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam);
  const articles = await getArticles(locale, 24);

  return (
    <main className="admin-page">
      <div className="section-heading">
        <h1>Latest News</h1>
        <span>Newest first</span>
      </div>
      <section className="news-grid">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </section>
    </main>
  );
}
