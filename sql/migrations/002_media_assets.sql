USE news_site;

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

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'articles'
    AND COLUMN_NAME = 'media_asset_id'
);

SET @alter_sql := IF(
  @column_exists = 0,
  'ALTER TABLE articles ADD COLUMN media_asset_id BIGINT UNSIGNED NULL AFTER source_id, ADD KEY idx_articles_media_asset_id (media_asset_id)',
  'SELECT 1'
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
