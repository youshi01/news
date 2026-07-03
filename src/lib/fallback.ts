import type { NewsArticle } from "@/lib/types";

export const fallbackArticles: NewsArticle[] = [
  {
    id: 1,
    locale: "en",
    slug: "ai-startups-race-to-localize-products-for-southeast-asia",
    title: "AI startups race to localize products for Southeast Asia",
    description:
      "Regional language support, low-cost inference, and mobile-first workflows are becoming the next battleground for AI tools.",
    summary:
      "AI product teams are moving beyond English-first launches as Indonesia, Vietnam, Thailand, and the Philippines become stronger growth markets.",
    contentHtml:
      "<p>AI product teams are moving beyond English-first launches as Southeast Asian markets become a stronger source of user growth.</p><p>The first wave of localized products focuses on translation, customer support, ecommerce operations, and creator tools. The next wave is likely to compete on local data, payment rails, and distribution partnerships.</p><p>For publishers, this trend creates a steady stream of stories around product launches, regulation, and market-specific adoption.</p>",
    mediaAssetId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    categorySlug: "ai",
    sourceName: "Signal Desk",
    sourceUrl: "https://example.com",
    publishedAt: new Date().toISOString(),
    heatScore: 86,
    readingMinutes: 2
  },
  {
    id: 2,
    locale: "en",
    slug: "security-teams-watch-new-phishing-campaigns-targeting-mobile-users",
    title: "Security teams watch new phishing campaigns targeting mobile users",
    description:
      "Mobile banking, messaging apps, and social commerce remain high-value targets across fast-growing digital markets.",
    summary:
      "Security alerts across the region point to more polished mobile phishing flows that mimic delivery, banking, and marketplace notifications.",
    contentHtml:
      "<p>Security alerts across the region point to more polished mobile phishing flows. The campaigns often mimic trusted delivery, banking, and marketplace notifications.</p><p>Newsrooms covering cybersecurity should track affected platforms, user impact, official advisories, and defensive guidance.</p>",
    mediaAssetId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    categorySlug: "security",
    sourceName: "Signal Desk",
    sourceUrl: "https://example.com",
    publishedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    heatScore: 73,
    readingMinutes: 2
  },
  {
    id: 3,
    locale: "en",
    slug: "regional-founders-shift-from-growth-at-all-costs-to-profitability",
    title: "Regional founders shift from growth at all costs to profitability",
    description:
      "Startup coverage is moving toward unit economics, capital efficiency, and cross-border expansion strategy.",
    summary:
      "Investors are watching which startups can grow across multiple Southeast Asian markets while keeping operations lean.",
    contentHtml:
      "<p>Investors are watching which startups can grow across multiple Southeast Asian markets while keeping operations lean.</p><p>The editorial opportunity is to connect funding news with practical business signals: burn rate, distribution, regulatory exposure, and country-by-country expansion.</p>",
    mediaAssetId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    categorySlug: "startups",
    sourceName: "Signal Desk",
    sourceUrl: "https://example.com",
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    heatScore: 64,
    readingMinutes: 2
  }
];
