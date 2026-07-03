import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticles } from "@/lib/data";
import { normalizeLocale } from "@/lib/locales";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `${slug} News`
  };
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = normalizeLocale(localeParam);
  const articles = (await getArticles(locale, 30)).filter(
    (article) => article.categorySlug === slug
  );

  return (
    <main className="admin-page">
      <div className="section-heading">
        <h1>{slug} News</h1>
        <span>Category</span>
      </div>
      {articles.length ? (
        <section className="news-grid">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <h2>No stories yet</h2>
          <p>When the automated feed imports stories for this category, they will appear here.</p>
        </div>
      )}
    </main>
  );
}
