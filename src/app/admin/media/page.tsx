import { AdminNav } from "@/components/AdminNav";
import { storageTypeLabel } from "@/lib/admin-labels";
import { requireAdminPageSession } from "@/lib/admin-page-auth";
import { getMediaAssets } from "@/lib/media";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireAdminPageSession();
  const mediaAssets = await getMediaAssets(80);
  const imageCount = mediaAssets.filter((asset) => asset.assetType === "image").length;
  const videoCount = mediaAssets.filter((asset) => asset.assetType === "video").length;

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">媒体库</div>
          <h1>媒体资源</h1>
        </div>
        <span className="text-button">{imageCount} 张图片 / {videoCount} 个视频</span>
      </div>
      <AdminNav />

      {mediaAssets.length ? (
        <section className="media-grid">
          {mediaAssets.map((asset) => (
            <article className="media-card" key={asset.id}>
              {asset.assetType === "video" ? (
                <video controls preload="metadata" src={asset.originalUrl} />
              ) : (
                <img src={`/api/media/${asset.id}`} alt="" loading="lazy" decoding="async" />
              )}
              <div>
                <strong>#{asset.id}</strong>
                <p>{asset.originalUrl}</p>
                <span>
                  {asset.assetType === "video" ? "视频" : "图片"} / {storageTypeLabel(asset.storageType)} / {asset.status === "active" ? "正常" : asset.status}
                </span>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无媒体</h2>
          <p>热点脚本或来源导入到新闻图片、视频后，这里会统一显示媒体资源。</p>
        </div>
      )}
    </main>
  );
}
