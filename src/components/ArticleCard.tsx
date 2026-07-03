import Link from "next/link";
import { formatDateTime } from "@/lib/date-format";
import type { NewsArticle } from "@/lib/types";
import { NewsImage } from "@/components/NewsImage";

type ArticleCardProps = {
  article: NewsArticle;
  compact?: boolean;
};

export function ArticleCard({ article, compact }: ArticleCardProps) {
  return (
    <article className={compact ? "article-card compact" : "article-card"}>
      <Link href={`/${article.locale}/news/${article.slug}`} className="image-link">
        <NewsImage
          src={article.imageUrl}
          title={article.title}
          category={article.categorySlug}
          seed={article.slug}
        />
      </Link>
      <div className="article-card-body">
        <div className="meta-row">
          <span>{article.categorySlug}</span>
          <span>{article.readingMinutes} min read</span>
        </div>
        <h3>
          <Link href={`/${article.locale}/news/${article.slug}`}>{article.title}</Link>
        </h3>
        {!compact && <p>{article.description}</p>}
        <div className="source-row">
          <span>{article.sourceName}</span>
          <time dateTime={article.publishedAt}>
            {formatDateTime(article.publishedAt, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </time>
        </div>
      </div>
    </article>
  );
}
