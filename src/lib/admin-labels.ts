const articleStatusLabels: Record<string, string> = {
  published: "已发布",
  draft: "草稿",
  archived: "已归档",
  sample: "示例数据"
};

const sourceTypeLabels: Record<string, string> = {
  hot_trends: "热点趋势",
  rss: "RSS 来源",
  manual: "手动来源",
  gdelt: "新闻发现"
};

const taskStatusLabels: Record<string, string> = {
  pending: "等待中",
  running: "运行中",
  done: "已完成",
  failed: "失败"
};

const taskTypeLabels: Record<string, string> = {
  rss: "RSS 导入",
  hot_news: "热点导入",
  trend: "趋势导入",
  media: "图片处理"
};

const categoryLabels: Record<string, string> = {
  ai: "AI",
  technology: "科技",
  security: "安全",
  startups: "创业",
  crypto: "加密",
  trending: "热点"
};

const localeLabels: Record<string, string> = {
  en: "英语",
  id: "印尼语",
  vi: "越南语",
  th: "泰语",
  "ms-MY": "马来语",
  "tl-PH": "菲律宾语",
  "zh-Hans": "简体中文",
  all: "全部语言"
};

const marketLabels: Record<string, string> = {
  ID: "印尼",
  VN: "越南",
  TH: "泰国",
  MY: "马来西亚",
  PH: "菲律宾"
};

const adProviderLabels: Record<string, string> = {
  adsense: "Google AdSense",
  ezoic: "Ezoic",
  media_net: "Media.net",
  custom: "自定义广告"
};

const storageTypeLabels: Record<string, string> = {
  remote_proxy: "远程代理",
  local: "本地存储",
  s3: "S3/R2 存储",
  cloudflare_images: "Cloudflare Images"
};

export function articleStatusLabel(value: string) {
  return articleStatusLabels[value] || value;
}

export function sourceTypeLabel(value: string) {
  return sourceTypeLabels[value] || value;
}

export function taskStatusLabel(value: string) {
  return taskStatusLabels[value] || value;
}

export function taskTypeLabel(value: string) {
  return taskTypeLabels[value] || value;
}

export function categoryLabel(value: string) {
  return categoryLabels[value] || value;
}

export function localeLabel(value: string) {
  return localeLabels[value] || value;
}

export function marketLabel(value: string) {
  return marketLabels[value] || value;
}

export function adProviderLabel(value: string | null) {
  if (!value) {
    return "未接广告平台";
  }

  return adProviderLabels[value] || value;
}

export function storageTypeLabel(value: string) {
  return storageTypeLabels[value] || value;
}
