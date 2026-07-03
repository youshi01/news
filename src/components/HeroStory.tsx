import Link from "next/link";
import type { NewsArticle } from "@/lib/types";

type HeroStoryProps = {
  article: NewsArticle;
};

export function HeroStory({ article }: HeroStoryProps) {
  return (
    <article className="hero-story">
      <Link href={`/${article.locale}/news/${article.slug}`} className="hero-image">
        <img src={article.imageUrl} alt="" />
      </Link>
      <div className="hero-copy">
        <div className="kicker">{article.categorySlug}</div>
        <h1>
          <Link href={`/${article.locale}/news/${article.slug}`}>{article.title}</Link>
        </h1>
        <p>{article.description}</p>
        <div className="source-row">
          <span>{article.sourceName}</span>
          <span>Heat {article.heatScore}</span>
          <time dateTime={article.publishedAt}>
            {new Intl.DateTimeFormat("en", {
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }).format(new Date(article.publishedAt))}
          </time>
        </div>
      </div>
    </article>
  );
}
