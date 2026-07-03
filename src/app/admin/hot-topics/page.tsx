import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { localeLabel, marketLabel } from "@/lib/admin-labels";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getHotTopics } from "@/lib/hot-topics";

export const dynamic = "force-dynamic";

export default async function AdminHotTopicsPage() {
  await requireAdminPageSession();
  const topics = await getHotTopics(100);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">热点新闻引擎</div>
          <h1>热点词</h1>
        </div>
        <span className="text-button">{topics.length} 个热点</span>
      </div>
      <AdminNav />

      {topics.length ? (
        <section className="admin-card">
          <ul className="data-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <span>
                  <strong>{topic.topic}</strong>
                  <br />
                  <small>
                    {marketLabel(topic.market)} / {localeLabel(topic.locale)} / 热度 {topic.heatScore}
                    {topic.approxTraffic ? ` / ${topic.approxTraffic}` : ""}
                  </small>
                </span>
                {topic.articleSlug ? (
                  <Link className="text-button" href={`/${topic.locale}/news/${topic.articleSlug}`}>
                    打开
                  </Link>
                ) : (
                  <span>未生成页面</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无热点词</h2>
          <p>配置 DATABASE_URL 后运行 npm run import:hot-news，这里就会出现热点数据。</p>
        </div>
      )}
    </main>
  );
}
