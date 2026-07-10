# Prisma, Seguridad y Base PostgreSQL

Esta fase convierte el ERD de `docs/hackeando-cms-seo-safe.dbml` a Prisma y deja una base preparada para Fastify, migracion WordPress y SEO seguro.

## Archivos

- `prisma/schema.prisma`: modelos Prisma para CMS, usuarios, roles, media, posts, SEO, rutas, redirects, importacion, pagos, anuncios, auditoria y seguridad.
- `prisma/sql/001_postgres_foundation.sql`: SQL complementario para PostgreSQL que Prisma no expresa bien.
- `.env.example`: variables minimas de entorno.

## Decisiones de Seguridad

- Tokens siempre hasheados:
  - `password_reset_tokens.token_hash`
  - `email_verification_tokens.token_hash`
  - `user_sessions.refresh_token_hash`
  - `api_keys.key_hash`
  - `mfa_recovery_codes.code_hash`
- No se guardan IPs crudas en tablas nuevas de tracking. Se usan `ip_hash` y `user_agent_hash`.
- Usuarios tienen campos para bloqueo y MFA:
  - `failed_login_count`
  - `locked_until`
  - `mfa_enabled`
  - `mfa_secret_encrypted`
  - `password_changed_at`
- `security_events` registra login, logout, MFA, cambios de rol, actividad sospechosa y eventos de API keys.
- `audit_logs` registra acciones administrativas y cambios sobre entidades.
- Vistas privadas y flujos sensibles deben resolverse desde API con autorizacion por permisos, no por datos del cliente.

## Optimizaciones PostgreSQL

El SQL complementario agrega:

- `pg_trgm` para busquedas por slug/titulo.
- `unaccent` para busqueda en espanol sin depender de acentos.
- `search_vector` con trigger para posts.
- GIN index para full-text search.
- BRIN indexes para tablas append-only:
  - `post_views`
  - `ad_events`
  - `audit_logs`
  - `security_events`
- Indices parciales para feeds publicos, sitemap y redirects activos.
- Constraint para permitir una sola categoria primaria por post.
- Checks de montos, creditos, estados HTTP, redirects y rangos de fechas.

## Flujo Recomendado

1. Copiar `.env.example` a `.env`.
2. Ajustar `DATABASE_URL`.
3. Validar schema:

```bash
npm run db:validate
```

4. Crear migracion inicial:

```bash
npm run db:migrate
```

5. Aplicar SQL complementario contra PostgreSQL despues de la migracion inicial:

```bash
psql "$DATABASE_URL" -f prisma/sql/001_postgres_foundation.sql
```

6. Generar client:

```bash
npm run db:generate
```

## Pendiente Cuando Llegue WordPress

- Importar `wp_posts`, `wp_terms`, `wp_term_taxonomy`, `wp_term_relationships`, `wp_users`, `wp_postmeta` y `wp_options`.
- Poblar `import_runs` e `import_mappings`.
- Poblar `url_inventory` desde sitemap, crawl y Search Console.
- Crear `routes` canonicas para cada entidad.
- Crear `redirects` 301 para toda URL legacy indexada.
- Persistir `seo_metadata` desde Yoast/RankMath y normalizar despues.
- Validar que `legacy_wordpress_id`, `legacy_url` y `legacy_slug` queden completos para posts, pages, media, categorias y tags.
