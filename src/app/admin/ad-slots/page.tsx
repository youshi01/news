import { AdminNav } from "@/components/AdminNav";
import { adProviderLabel, localeLabel } from "@/lib/admin-labels";
import { getAdminAdSlots } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminAdSlotsPage() {
  const slots = await getAdminAdSlots(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">商业化</div>
          <h1>广告位</h1>
        </div>
        <span className="text-button">{slots.length} 个预留位</span>
      </div>
      <AdminNav />

      {slots.length ? (
        <section className="admin-card">
          <ul className="data-list admin-table-list">
            {slots.map((slot) => (
              <li key={slot.id}>
                <span>
                  <strong>{slot.placement}</strong>
                  <br />
                  <small>{localeLabel(slot.locale)} / {adProviderLabel(slot.provider)}</small>
                </span>
                <span>{slot.enabled ? "已开启" : "仅预留"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无广告位</h2>
          <p>导入 sql/init.sql 后会自动创建默认广告位，流量起来后再开启。</p>
        </div>
      )}
    </main>
  );
}
