CREATE DATABASE IF NOT EXISTS news_site
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE news_site;

CREATE TABLE IF NOT EXISTS sources (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(190) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  rss_url VARCHAR(700) NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'rss',
  default_locale VARCHAR(20) NOT NULL DEFAULT 'en',
  category_slug VARCHAR(120) NOT NULL DEFAULT 'technology',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_fetched_at DATETIME NULL,
  fetch_interval_minutes INT NOT NULL DEFAULT 60,
  failure_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_sources_rss_url (rss_url),
  KEY idx_sources_enabled (enabled),
  KEY idx_sources_last_fetched_at (last_fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NULL,
  media_asset_id BIGINT UNSIGNED NULL,
  source_url VARCHAR(900) NOT NULL,
  canonical_url VARCHAR(900) NULL,
  url_hash CHAR(64) NOT NULL,
  content_hash CHAR(64) NULL,
  image_url VARCHAR(900) NULL,
  category_slug VARCHAR(120) NOT NULL DEFAULT 'technology',
  original_language VARCHAR(20) NOT NULL DEFAULT 'en',
  published_at DATETIME NULL,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  heat_score INT UNSIGNED NOT NULL DEFAULT 0,
  cluster_key VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_articles_url_hash (url_hash),
  KEY idx_articles_published_at (published_at),
  KEY idx_articles_status (status),
  KEY idx_articles_source_id (source_id),
  KEY idx_articles_media_asset_id (media_asset_id),
  KEY idx_articles_category_slug (category_slug),
  KEY idx_articles_heat_score (heat_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  original_url VARCHAR(1000) NOT NULL,
  url_hash CHAR(64) NOT NULL,
  source_url VARCHAR(900) NULL,
  asset_type VARCHAR(30) NOT NULL DEFAULT 'image',
  storage_type VARCHAR(30) NOT NULL DEFAULT 'remote_proxy',
  local_path VARCHAR(700) NULL,
  mime_type VARCHAR(120) NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  last_checked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_media_assets_url_hash (url_hash),
  KEY idx_media_assets_status (status),
  KEY idx_media_assets_storage_type (storage_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hot_topics (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL,
  market VARCHAR(20) NOT NULL,
  locale VARCHAR(20) NOT NULL,
  topic VARCHAR(300) NOT NULL,
  topic_hash CHAR(64) NOT NULL,
  trend_url VARCHAR(900) NULL,
  approx_traffic VARCHAR(80) NULL,
  heat_score INT UNSIGNED NOT NULL DEFAULT 0,
  article_id BIGINT UNSIGNED NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  times_seen INT UNSIGNED NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  UNIQUE KEY uniq_hot_topic_provider_market_hash (provider, market, topic_hash),
  KEY idx_hot_topics_market (market),
  KEY idx_hot_topics_heat_score (heat_score),
  KEY idx_hot_topics_last_seen_at (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS article_translations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  title VARCHAR(320) NOT NULL,
  description VARCHAR(600) NULL,
  summary TEXT NULL,
  content_html MEDIUMTEXT NULL,
  seo_title VARCHAR(320) NULL,
  seo_description VARCHAR(600) NULL,
  og_image VARCHAR(900) NULL,
  translation_status VARCHAR(30) NOT NULL DEFAULT 'done',
  review_status VARCHAR(30) NOT NULL DEFAULT 'auto',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_translation_locale_slug (locale, slug),
  UNIQUE KEY uniq_translation_article_locale (article_id, locale),
  KEY idx_translation_locale (locale),
  KEY idx_translation_article_id (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tag_translations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tag_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  name VARCHAR(190) NOT NULL,
  UNIQUE KEY uniq_tag_locale (tag_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS article_tags (
  article_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (article_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS traffic_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50) NOT NULL,
  article_id BIGINT UNSIGNED NULL,
  locale VARCHAR(20) NULL,
  path VARCHAR(900) NOT NULL,
  referrer VARCHAR(900) NULL,
  session_id VARCHAR(100) NULL,
  visitor_id VARCHAR(100) NULL,
  country VARCHAR(80) NULL,
  device_type VARCHAR(50) NULL,
  duration_seconds INT NULL,
  scroll_depth TINYINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_traffic_created_at (created_at),
  KEY idx_traffic_article_id (article_id),
  KEY idx_traffic_event_type (event_type),
  KEY idx_traffic_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS click_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NULL,
  locale VARCHAR(20) NULL,
  path VARCHAR(900) NOT NULL,
  target_url VARCHAR(900) NULL,
  target_type VARCHAR(50) NULL,
  session_id VARCHAR(100) NULL,
  visitor_id VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_click_created_at (created_at),
  KEY idx_click_article_id (article_id),
  KEY idx_click_target_type (target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS daily_article_stats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  stat_date DATE NOT NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  page_views INT UNSIGNED NOT NULL DEFAULT 0,
  unique_visitors INT UNSIGNED NOT NULL DEFAULT 0,
  clicks INT UNSIGNED NOT NULL DEFAULT 0,
  avg_duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_daily_article_locale (stat_date, article_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ad_slots (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  placement VARCHAR(100) NOT NULL,
  locale VARCHAR(20) NOT NULL DEFAULT 'all',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  provider VARCHAR(50) NULL,
  code MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ad_slot_placement_locale (placement, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ad_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ad_slot_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  article_id BIGINT UNSIGNED NULL,
  locale VARCHAR(20) NULL,
  session_id VARCHAR(100) NULL,
  visitor_id VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ad_events_created_at (created_at),
  KEY idx_ad_events_slot_id (ad_slot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS import_tasks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  source_id BIGINT UNSIGNED NULL,
  task_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  error_message TEXT NULL,
  count_fetched INT UNSIGNED NOT NULL DEFAULT 0,
  count_created INT UNSIGNED NOT NULL DEFAULT 0,
  count_skipped INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_import_tasks_status (status),
  KEY idx_import_tasks_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(190) NOT NULL,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_site_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO ad_slots (placement, locale, enabled) VALUES
('home_top', 'all', 0),
('home_feed_middle', 'all', 0),
('article_after_title', 'all', 0),
('article_middle', 'all', 0),
('article_bottom', 'all', 0),
('sidebar_desktop', 'all', 0),
('category_feed_middle', 'all', 0);

INSERT INTO sources (name, site_url, rss_url, source_type, default_locale, category_slug, fetch_interval_minutes)
VALUES
('TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'rss', 'en', 'startups', 45),
('The Verge', 'https://www.theverge.com', 'https://www.theverge.com/rss/index.xml', 'rss', 'en', 'technology', 45),
('OpenAI Blog', 'https://openai.com', 'https://openai.com/news/rss.xml', 'rss', 'en', 'ai', 120),
('BleepingComputer', 'https://www.bleepingcomputer.com', 'https://www.bleepingcomputer.com/feed/', 'rss', 'en', 'security', 60)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
