import { AdminNav } from "@/components/AdminNav";
import { storageTypeLabel } from "@/lib/admin-labels";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getMediaAssets } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireAdminPageSession();
  const mediaAssets = await getMediaAssets(80);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">媒体库</div>
          <h1>图片资源</h1>
        </div>
        <span className="text-button">{mediaAssets.length} 张图片</span>
      </div>
      <AdminNav />

      {mediaAssets.length ? (
        <section className="media-grid">
          {mediaAssets.map((asset) => (
            <article className="media-card" key={asset.id}>
              <img src={`/api/media/${asset.id}`} alt="" loading="lazy" />
              <div>
                <strong>#{asset.id}</strong>
                <p>{asset.originalUrl}</p>
                <span>{storageTypeLabel(asset.storageType)} / {asset.status === "active" ? "正常" : asset.status}</span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无图片</h2>
          <p>热点脚本或来源导入到新闻图片后，这里会统一显示图片资源。</p>
        </div>
      )}
    </main>
  );
}
