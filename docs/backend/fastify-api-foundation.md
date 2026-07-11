# Fastify API Foundation

Primera fase de conexion real entre frontend, backend y DB.

## Objetivo

Dejar un backend Fastify seguro y verificable sobre Prisma/PostgreSQL sin intentar migrar todo WordPress de una vez.

## Archivos

- `api/server.js`: entrypoint del API.
- `api/app.js`: fabrica de Fastify con Prisma inyectable para tests.
- `api/config/env.js`: validacion de variables con Zod.
- `api/db/prisma.js`: Prisma Client singleton.
- `api/plugins/security.js`: Helmet, CORS, rate limit y errores HTTP.
- `api/routes/health.js`: health checks.
- `api/routes/public.js`: endpoints publicos iniciales.
- `api/app.test.js`: tests de API con Prisma fake.

## Scripts

```bash
npm run dev:api
npm run db:validate
npm run db:generate
npm test
```

## Endpoints Fase 1

```txt
GET /health/live
GET /health/ready
GET /api/v1
GET /api/v1/public/categories
GET /api/v1/public/posts?page=1&limit=12
GET /api/v1/public/posts/:slug
GET /api/v1/public/route?path=/slug-wordpress/
```

## Seguridad Aplicada

- Helmet activo.
- CORS por allowlist (`CORS_ORIGINS`).
- Rate limit global.
- Error handler que no expone stack traces.
- Logs con redaccion de `authorization`, cookies, tokens y passwords.
- Prisma inyectable para pruebas sin tocar DB real.
- Readiness check con `SELECT 1`.

## Pendiente Fase 2

- Importador WordPress por streaming desde `wpmb_*`.
- Resolver frontend por canonical root path `/%postname%/`.
- Endpoint de sitemap desde DB.
- Endpoint de redirects para Next middleware/config.
- Auth real con sesiones, roles y permisos.
