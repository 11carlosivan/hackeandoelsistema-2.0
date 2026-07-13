-- Optional MySQL indexes for production search/read paths.
-- Prisma creates the core schema; this file only adds MySQL-specific helpers
-- that are safe to run after `prisma db push`.

CREATE FULLTEXT INDEX idx_posts_public_search
ON posts (title, excerpt, content_text);
