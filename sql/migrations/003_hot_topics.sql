USE news_site;

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
