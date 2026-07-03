# Southeast Signal News

多语言新闻/热点 SEO 站点，支持 Docker 部署、MySQL 初始化、后台登录、隐藏后台路径、流量统计、广告位预留、热点词导入和 RSS 文章导入。

## 默认后台

```text
后台地址：/manage-8f3k2
登录地址：/manage-8f3k2/login
账号：admin
密码：ChangeMe_2026_admin
安装口令：ChangeMe_Install_2026
```

首次部署后访问首页 `/`，如果还没有初始化数据库，会自动进入 `/install`。使用默认安装口令时，安装页里的“安装口令”可以留空；如果你在 `.env` 里改了 `INSTALL_TOKEN`，安装时就需要填写。

上线后建议马上改这些环境变量：

```env
ADMIN_PATH=/your-private-admin-path
ADMIN_USER=your_admin
ADMIN_PASSWORD=your_long_random_password
ADMIN_INTERNAL_TOKEN=your_long_internal_token
ADMIN_COOKIE_SECURE=false
INSTALL_TOKEN=your_long_install_token
```

本地或直接用 `http://服务器IP:3000` 测试时，`ADMIN_COOKIE_SECURE` 必须保持 `false`，否则浏览器不会保存登录 Cookie。正式 HTTPS 反代上线后可以改成 `true`。

## Docker 运行

```bash
docker pull ghcr.io/youshi01/news:latest
docker run -d \
  --name news \
  -p 3000:3000 \
  --add-host=host.docker.internal:host-gateway \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PATH=/manage-8f3k2 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=ChangeMe_2026_admin \
  -e ADMIN_INTERNAL_TOKEN=ChangeMe_Internal_Admin_2026 \
  -e ADMIN_COOKIE_SECURE=false \
  -e INSTALL_TOKEN=ChangeMe_Install_2026 \
  -e ENABLE_RSS_IMPORT=true \
  ghcr.io/youshi01/news:latest
```

启动后访问：

```text
http://服务器IP:3000/
```

如果 MySQL 在宿主机上，初始化页里的 MySQL 主机建议填：

```text
host.docker.internal
```

如果你的 Linux Docker 不支持这个名字，请保留 `docker run` 里的：

```bash
--add-host=host.docker.internal:host-gateway
```

也可以改填宿主机内网 IP。

## 自动采集

worker 会等待数据库初始化完成，然后按 `FETCH_INTERVAL_MINUTES` 定时执行采集。

默认会执行两类任务：

```text
热点导入：Google Trends -> Google News RSS 相关新闻 -> 自动生成 SEO 新闻页
RSS 导入：RSS 来源 -> 文章标题/摘要/图片/来源链接 -> 自动生成 SEO 新闻页
```

常用自动导入开关：

```env
ENABLE_RSS_IMPORT=true
MAX_ITEMS_PER_SOURCE=12
FETCH_INTERVAL_MINUTES=30
HOT_NEWS_GOOGLE_NEWS_ENABLED=true
HOT_NEWS_ARTICLES_PER_TOPIC=6
HOT_NEWS_RELATED_LOOKUPS_PER_RUN=0
```

如果只想手动导入，可以把 `ENABLE_RSS_IMPORT=false`。

## 后台手动导入

后台可以直接操作：

```text
/manage-8f3k2/hot-topics  点击“立即导入热点”
/manage-8f3k2/sources     点击“立即导入 RSS 文章”
```

Docker 镜像部署时，命令要在容器里执行，不要在服务器 `/home` 目录直接跑 `npm run`：

```bash
docker exec news npm run import:hot-news
docker exec news npm run import:feeds
```

如果使用 `docker compose`：

```bash
docker compose exec web npm run import:hot-news
docker compose exec web npm run import:feeds
```

只有源码开发环境才直接运行：

```bash
npm run import:hot-news
npm run import:feeds
```

## SEO 输出

新增文章后会自动进入：

```text
首页新闻流
文章详情页
/sitemap.xml
/sitemap-news.xml
/rss.xml
Open Graph / Twitter Card metadata
```

RSS 来源通常不会提供完整原文，所以系统默认导入标题、摘要、图片、发布时间、来源链接，并尝试从原文页读取 `og:image`、标题、描述和 canonical。为避免版权风险，不会整篇复制第三方原文。

媒体库会统一记录图片和视频资源。视频来自 RSS enclosure、`media:content` 或原文页 metadata，后台只预加载 metadata，避免打开媒体库时拖慢页面。

## 本地开发

```bash
npm install
npm run dev
```

构建验证：

```bash
npm run build
```
