import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/Analytics";
import { AdSlot } from "@/components/AdSlot";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsImage } from "@/components/NewsImage";
import { getArticleBySlug, getArticles } from "@/lib/data";
import { formatDateTime } from "@/lib/date-format";
import { normalizeLocale, SUPPORTED_LOCALES } from "@/lib/locales";
import { absoluteUrl, siteConfig } from "@/lib/site";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = normalizeLocale(localeParam);
  const article = await getArticleBySlug(locale, slug);

  if (!article) {
    return {
      title: "Story not found"
    };
  }

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: absoluteUrl(`/${locale}/news/${article.slug}`),
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((item) => [
          item,
          absoluteUrl(`/${item}/news/${article.slug}`)
        ])
      )
    },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title: article.title,
      description: article.description,
      images: [article.imageUrl],
      publishedTime: article.publishedAt
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [article.imageUrl]
    }
  };
}

export default async function ArticlePage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = normalizeLocale(localeParam);
  const article = await getArticleBySlug(locale, slug);

  if (!article) {
    notFound();
  }

  const related = (await getArticles(locale, 8)).filter((item) => item.id !== article.id);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description,
    image: [article.imageUrl],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      "@type": "Organization",
      name: siteConfig.publisher
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name
    },
    mainEntityOfPage: absoluteUrl(`/${locale}/news/${article.slug}`)
  };

  return (
    <main className="article-page">
      <Analytics articleId={article.id} locale={locale} eventType="article_view" />
      <article>
        <header className="article-header">
          <div className="kicker">{article.categorySlug}</div>
          <h1>{article.title}</h1>
          <p className="article-description">{article.description}</p>
          <div className="source-row">
            <span>{article.sourceName}</span>
            <span>{article.readingMinutes} min read</span>
            <time dateTime={article.publishedAt}>
              {formatDateTime(article.publishedAt, {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </time>
          </div>
        </header>
        <AdSlot placement="article_after_title" />
        <div className="article-hero-image">
          <NewsImage
            src={article.imageUrl}
            title={article.title}
            category={article.categorySlug}
            seed={article.slug}
            loading="eager"
          />
        </div>
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />
        <AdSlot placement="article_middle" />
        <div className="source-box">
          <h2>Source</h2>
          <p>
            This automated briefing links back to the original source. Read the source
            for full context and updates.
          </p>
          <a className="text-button" href={article.sourceUrl} rel="nofollow noopener" target="_blank">
            Open source
          </a>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </article>
      <aside className="trend-rail">
        <div className="section-heading">
          <h2>Related</h2>
          <span>Internal links</span>
        </div>
        <div className="data-list">
          {related.slice(0, 5).map((item) => (
            <ArticleCard key={item.slug} article={item} compact />
          ))}
        </div>
      </aside>
    </main>
  );
}
