-- Optional MySQL indexes for production search/read paths.
-- Prisma creates the core schema; this file only adds MySQL-specific helpers
-- that are safe to run after `prisma db push`.

SET @idx_posts_public_search_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_public_search'
);

SET @idx_posts_public_search_sql = IF(
  @idx_posts_public_search_exists = 0,
  'CREATE FULLTEXT INDEX idx_posts_public_search ON posts (title, excerpt, content_text)',
  'SELECT 1'
);

PREPARE idx_posts_public_search_stmt FROM @idx_posts_public_search_sql;
EXECUTE idx_posts_public_search_stmt;
DEALLOCATE PREPARE idx_posts_public_search_stmt;

SET @idx_posts_scheduled_publish_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND INDEX_NAME = 'idx_posts_scheduled_publish'
);

SET @idx_posts_scheduled_publish_sql = IF(
  @idx_posts_scheduled_publish_exists = 0,
  'CREATE INDEX idx_posts_scheduled_publish ON posts (status, scheduled_at)',
  'SELECT 1'
);

PREPARE idx_posts_scheduled_publish_stmt FROM @idx_posts_scheduled_publish_sql;
EXECUTE idx_posts_scheduled_publish_stmt;
DEALLOCATE PREPARE idx_posts_scheduled_publish_stmt;
