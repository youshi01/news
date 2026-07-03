import Link from "next/link";
import { AdminNav } from "@/components/AdminNav";
import { localeLabel, marketLabel } from "@/lib/admin-labels";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getHotTopics } from "@/lib/hot-topics";
import { importHotNewsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHotTopicsPage({
  searchParams
}: {
  searchParams: Promise<{ import?: string; detail?: string }>;
}) {
  await requireAdminPageSession();
  const importStatus = await searchParams;
  const topics = await getHotTopics(100);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">热点新闻引擎</div>
          <h1>热点词</h1>
        </div>
        <form action={importHotNewsAction}>
          <button className="text-button" type="submit">立即导入热点</button>
        </form>
      </div>
      <AdminNav />

      {importStatus.import === "done" && (
        <div className="settings-success">
          热点导入完成，下面会显示最新数据。
        </div>
      )}
      {importStatus.import === "failed" && (
        <div className="install-error">
          热点导入失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}

      {topics.length ? (
        <section className="admin-card">
          <p>{topics.length} 个热点</p>
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
                  <Link className="text-button" href={`/${topic.articleLocale || topic.locale}/news/${topic.articleSlug}`}>
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
          <p>点击“立即导入热点”，或在容器里执行 docker exec news npm run import:hot-news。</p>
        </div>
      )}
    </main>
  );
}
