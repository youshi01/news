import { ArticleCard } from "@/components/ArticleCard";
import type { NewsArticle } from "@/lib/types";

type NewsGridProps = {
  articles: NewsArticle[];
};

export function NewsGrid({ articles }: NewsGridProps) {
  return (
    <section className="news-grid" aria-label="Latest stories">
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </section>
  );
}
