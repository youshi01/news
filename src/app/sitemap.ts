import type { MetadataRoute } from "next";
import { getAllArticleUrls } from "@/lib/data";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articleUrls = await getAllArticleUrls();
  const staticPages = SUPPORTED_LOCALES.flatMap((locale) => [
    {
      url: absoluteUrl(`/${locale}`),
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          SUPPORTED_LOCALES.map((item) => [item, absoluteUrl(`/${item}`)])
        )
      }
    },
    {
      url: absoluteUrl(`/${locale}/latest`),
      lastModified: new Date()
    },
    {
      url: absoluteUrl(`/${locale}/trending`),
      lastModified: new Date()
    }
  ]);

  return [
    ...staticPages,
    ...articleUrls.map((item) => ({
      url: absoluteUrl(`/${item.locale}/news/${item.slug}`),
      lastModified: new Date(item.updatedAt)
    }))
  ];
}
