import { AdminNav } from "@/components/AdminNav";
import { taskStatusLabel, taskTypeLabel } from "@/lib/admin-labels";
import { getAdminTasks } from "@/lib/admin-data";
import { requireAdminPageSession } from "@/lib/admin-page-auth";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  await requireAdminPageSession();
  const tasks = await getAdminTasks(120);

  return (
    <main className="app-shell admin-page">
      <div className="admin-hero">
        <div>
          <div className="kicker">自动化</div>
          <h1>导入任务</h1>
        </div>
        <span className="text-button">{tasks.length} 个任务</span>
      </div>
      <AdminNav />

      {tasks.length ? (
        <section className="admin-card">
          <ul className="data-list admin-table-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <span>
                  <strong>#{task.id} {taskTypeLabel(task.taskType)}</strong>
                  <br />
                  <small>{taskStatusLabel(task.status)} / 抓取 {task.countFetched} / 创建 {task.countCreated} / 跳过 {task.countSkipped}</small>
                </span>
                <span>{task.finishedAt ? new Date(task.finishedAt).toLocaleString("zh-CN") : "运行中"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <h2>暂无任务记录</h2>
          <p>启动 worker 或运行 npm run import:hot-news 后，这里会显示导入记录。</p>
        </div>
      )}
    </main>
  );
}
