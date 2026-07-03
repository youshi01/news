import Link from "next/link";
import type { NewsArticle } from "@/lib/types";
import { NewsImage } from "@/components/NewsImage";

type HeroStoryProps = {
  article: NewsArticle;
};

export function HeroStory({ article }: HeroStoryProps) {
  return (
    <article className="hero-story">
      <Link href={`/${article.locale}/news/${article.slug}`} className="hero-image">
        <NewsImage
          src={article.imageUrl}
          title={article.title}
          category={article.categorySlug}
          seed={article.slug}
          loading="eager"
        />
      </Link>
      <div className="hero-copy">
        <div className="kicker">{article.categorySlug}</div>
        <h1>
          <Link href={`/${article.locale}/news/${article.slug}`}>{article.title}</Link>
        </h1>
        <p>{article.description}</p>
      </div>
    </article>
  );
}
