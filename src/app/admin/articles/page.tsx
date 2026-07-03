import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { articleStatusLabel, categoryLabel, localeLabel } from "@/lib/admin-labels";
import { getAdminArticles } from "@/lib/admin-data";
import { requireAdminPageSession } from "@/lib/admin-page-auth";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  await requireAdminPageSession();
  const articles = await getAdminArticles(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">内容运营</div>
          <h1>文章管理</h1>
        </div>
        <span className="text-button">{articles.length} 条记录</span>
      </div>
      <AdminNav />

      <section className="admin-card">
        <ul className="data-list admin-table-list">
          {articles.map((article) => (
            <li key={`${article.locale}-${article.slug}`}>
              <span>
                <strong>{article.title}</strong>
                <br />
                <small>
                  {localeLabel(article.locale)} / {categoryLabel(article.categorySlug)} / {articleStatusLabel(article.status)} / 热度 {article.heatScore}
                </small>
              </span>
              <span>{article.views} 次浏览 / {article.clicks} 次点击</span>
              <Link className="text-button" href={`/${article.locale}/news/${article.slug}`}>
                打开
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
