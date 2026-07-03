import { LockKeyhole } from "lucide-react";
import { adminHref } from "@/lib/admin-path";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string; saved?: string }>;
}) {
  const { error, next, saved } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-mark">
          <LockKeyhole size={22} />
        </div>
        <div className="kicker">后台登录</div>
        <h1>登录管理后台</h1>
        <p>请输入管理员账号和密码。</p>

        {error && (
          <div className="install-error">
            账号或密码不正确，请重新输入。
          </div>
        )}
        {saved && (
          <div className="settings-success">
            设置已保存，请重新登录。
          </div>
        )}

        <form className="install-form" action="/api/admin/login" method="post">
          <input type="hidden" name="next" value={next || adminHref()} />
          <label>
            管理员账号
            <input name="username" required autoComplete="username" />
          </label>
          <label>
            管理员密码
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit">登录后台</button>
        </form>
      </section>
    </main>
  );
}
