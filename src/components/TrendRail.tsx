import Link from "next/link";
import type { NewsArticle } from "@/lib/types";

type TrendRailProps = {
  articles: NewsArticle[];
};

export function TrendRail({ articles }: TrendRailProps) {
  return (
    <aside className="trend-rail" aria-label="Trending stories">
      <div className="section-heading">
        <h2>Trending</h2>
        <span>Live signal</span>
      </div>
      <ol>
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/${article.locale}/news/${article.slug}`}>
              <strong>{article.title}</strong>
              <span>{article.categorySlug} / Heat {article.heatScore}</span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
