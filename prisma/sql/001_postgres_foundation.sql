-- Hackeando el Sistema - PostgreSQL foundation.
-- Apply after the initial Prisma migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Full-text search for published editorial content.
CREATE OR REPLACE FUNCTION posts_search_vector_refresh()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent(coalesce(NEW.excerpt, ''))), 'B') ||
    setweight(to_tsvector('spanish', unaccent(coalesce(NEW.content_text, ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_search_vector_refresh ON posts;
CREATE TRIGGER trg_posts_search_vector_refresh
BEFORE INSERT OR UPDATE OF title, excerpt, content_text
ON posts
FOR EACH ROW
EXECUTE FUNCTION posts_search_vector_refresh();

CREATE INDEX IF NOT EXISTS idx_posts_search_vector_gin
ON posts USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_posts_title_trgm
ON posts USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_slug_trgm
ON posts USING GIN (slug gin_trgm_ops);

-- Only one primary category per post.
CREATE UNIQUE INDEX IF NOT EXISTS uq_post_categories_primary
ON post_categories (post_id)
WHERE is_primary = true;

-- Public feed hot path.
CREATE INDEX IF NOT EXISTS idx_posts_public_feed
ON posts (published_at DESC)
WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC';

-- Sitemap hot path.
CREATE INDEX IF NOT EXISTS idx_routes_sitemap_active
ON routes (lastmod_at DESC)
WHERE status = 'ACTIVE' AND include_in_sitemap = true;

-- Redirect lookup hot path.
CREATE INDEX IF NOT EXISTS idx_redirects_active_source_path
ON redirects (source_path)
WHERE is_active = true;

-- Time-series tables are append-heavy.
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at_brin
ON post_views USING BRIN (viewed_at);

CREATE INDEX IF NOT EXISTS idx_ad_events_created_at_brin
ON ad_events USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin
ON audit_logs USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at_brin
ON security_events USING BRIN (created_at);

-- Data integrity guards.
ALTER TABLE routes
  ADD CONSTRAINT chk_routes_http_status
  CHECK (http_status IN (200, 301, 302, 307, 308, 404, 410));

ALTER TABLE routes
  ADD CONSTRAINT chk_routes_priority
  CHECK (priority IS NULL OR (priority >= 0 AND priority <= 1));

ALTER TABLE redirects
  ADD CONSTRAINT chk_redirects_status_code
  CHECK (status_code IN (301, 302, 307, 308));

ALTER TABLE publication_plans
  ADD CONSTRAINT chk_publication_plans_amounts
  CHECK (price_amount >= 0 AND post_quota >= 0 AND validity_days > 0);

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_amounts
  CHECK (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0);

ALTER TABLE order_items
  ADD CONSTRAINT chk_order_items_amounts
  CHECK (quantity > 0 AND unit_price_amount >= 0 AND total_amount >= 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_amount
  CHECK (amount >= 0);

ALTER TABLE user_publication_credits
  ADD CONSTRAINT chk_publication_credits_usage
  CHECK (total_credits >= 0 AND used_credits >= 0 AND used_credits <= total_credits);

ALTER TABLE ads
  ADD CONSTRAINT chk_ads_date_range
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at);

ALTER TABLE password_reset_tokens
  ADD CONSTRAINT chk_password_reset_tokens_usage
  CHECK (used_at IS NULL OR used_at <= expires_at);

ALTER TABLE email_verification_tokens
  ADD CONSTRAINT chk_email_verification_tokens_usage
  CHECK (used_at IS NULL OR used_at <= expires_at);

ALTER TABLE user_sessions
  ADD CONSTRAINT chk_user_sessions_revocation
  CHECK (revoked_at IS NULL OR revoked_at <= expires_at);

-- Optional hardening. Enable only after the API is ready to set app.current_user_id.
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
