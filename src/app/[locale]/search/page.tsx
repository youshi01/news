import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticles } from "@/lib/data";
import { normalizeLocale } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Search"
};

export default async function SearchPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { q } = await searchParams;
  const locale = normalizeLocale(localeParam);
  const query = (q || "").trim().toLowerCase();
  const articles = await getArticles(locale, 80);
  const results = query
    ? articles.filter((article) =>
        [article.title, article.description, article.summary, article.categorySlug]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    : articles;

  return (
    <main className="admin-page">
      <div className="section-heading">
        <h1>Search</h1>
        <span>{results.length} results</span>
      </div>
      <form className="search-form" action={`/${locale}/search`}>
        <Search size={18} />
        <input
          type="search"
          name="q"
          defaultValue={q || ""}
          placeholder="Search news, companies, sources..."
        />
        <button type="submit">Search</button>
      </form>
      <section className="news-grid">
        {results.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </section>
    </main>
  );
}
