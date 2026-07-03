import { AdminNav } from "@/components/AdminNav";
import { localeLabel, sourceTypeLabel } from "@/lib/admin-labels";
import { getAdminSources } from "@/lib/admin-data";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { importFeedsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage({
  searchParams
}: {
  searchParams: Promise<{ import?: string; detail?: string }>;
}) {
  await requireAdminPageSession();
  const importStatus = await searchParams;
  const sources = await getAdminSources(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">内容采集</div>
          <h1>来源管理</h1>
        </div>
        <form action={importFeedsAction}>
          <button className="text-button" type="submit">立即导入 RSS 文章</button>
        </form>
      </div>
      <AdminNav />

      {importStatus.import === "done" && (
        <div className="settings-success">
          RSS 文章导入已执行。新文章会自动进入文章列表、首页、sitemap 和 RSS 输出。
        </div>
      )}
      {importStatus.import === "failed" && (
        <div className="install-error">
          RSS 文章导入失败。
          {importStatus.detail && <small>{importStatus.detail}</small>}
        </div>
      )}

      {sources.length ? (
        <section className="admin-card">
          <div className="section-heading">
            <h2>{sources.length} 个来源</h2>
            <span>已启用来源会参与自动采集</span>
          </div>
          <ul className="data-list admin-table-list">
            {sources.map((source) => (
              <li key={source.id}>
                <span>
                  <strong>{source.name}</strong>
                  <br />
                  <small>
                    {sourceTypeLabel(source.sourceType)} / {localeLabel(source.defaultLocale)} / {source.enabled ? "已启用" : "已停用"}
                  </small>
                  {source.rssUrl && (
                    <>
                      <br />
                      <small>{source.rssUrl}</small>
                    </>
                  )}
                </span>
                <span>
                  {source.lastFetchedAt
                    ? new Intl.DateTimeFormat("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      }).format(new Date(source.lastFetchedAt))
                    : "未采集"}
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
          <p>初始化数据库后会写入默认 RSS 来源。也可以先点击“立即导入 RSS 文章”验证采集链路。</p>
        </div>
      )}
    </main>
  );
}
