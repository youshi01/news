export type NewsArticle = {
  id: number;
  locale: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  contentHtml: string;
  imageUrl: string;
  mediaAssetId?: number | null;
  categorySlug: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  heatScore: number;
  readingMinutes: number;
};

export type AdminStats = {
  pageViews: number;
  articleViews: number;
  clicks: number;
  avgDurationSeconds: number;
  topArticles: Array<{
    title: string;
    locale: string;
    views: number;
    clicks: number;
  }>;
  recentEvents: Array<{
    eventType: string;
    path: string;
    locale: string | null;
    createdAt: string;
  }>;
};
