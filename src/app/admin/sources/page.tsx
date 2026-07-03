import { AdminNav } from "@/components/AdminNav";
import { localeLabel, sourceTypeLabel } from "@/lib/admin-labels";
import { getAdminSources } from "@/lib/admin-data";
import { requireAdminPageSession } from "@/lib/admin-page-auth";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  await requireAdminPageSession();
  const sources = await getAdminSources(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">内容采集</div>
          <h1>来源管理</h1>
        </div>
        <span className="text-button">{sources.length} 个来源</span>
      </div>
      <AdminNav />

      {sources.length ? (
        <section className="admin-card">
          <ul className="data-list admin-table-list">
            {sources.map((source) => (
              <li key={source.id}>
                <span>
                  <strong>{source.name}</strong>
                  <br />
                  <small>
                    {sourceTypeLabel(source.sourceType)} / {localeLabel(source.defaultLocale)} / {source.enabled ? "已启用" : "已停用"}
                  </small>
                </span>
                <span>{source.failureCount} 次失败</span>
                <a className="text-button" href={source.siteUrl} target="_blank" rel="noreferrer">
                  访问
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无来源</h2>
          <p>配置 DATABASE_URL 后启动 worker，热点来源会自动创建。</p>
        </div>
      )}
    </main>
  );
}
