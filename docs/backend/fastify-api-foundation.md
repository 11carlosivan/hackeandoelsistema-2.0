# Fastify API Foundation

Primera fase de conexion real entre frontend, backend y DB.

## Objetivo

Dejar un backend Fastify seguro y verificable sobre Prisma/MySQL sin intentar migrar todo WordPress de una vez.

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
GET /api/v1/public/categories/id/:id/posts
GET /api/v1/public/tags/id/:id/posts
GET /api/v1/public/posts/:slug
GET /api/v1/public/posts/id/:id
GET /api/v1/public/pages/:slug
GET /api/v1/public/pages/id/:id
GET /api/v1/public/authors/id/:id
GET /api/v1/public/products/id/:id
GET /api/v1/public/web-stories/id/:id
GET /api/v1/public/route?path=/slug-wordpress/
```

## Resolver SEO de Rutas

`GET /api/v1/public/route?path=/ruta-wordpress/` es la fuente publica para que Next renderice URLs heredadas.

Devuelve:

- `entityType` y `entityId` para cargar el contenido por ID, no por suposicion de slug.
- `canonicalPath` desde `canonicalRoute`, `seo_metadata.canonicalUrl` o `route.path`.
- `status`, `httpStatus`, `lastmodAt` y metadata SEO.
- `type=REDIRECT` con `statusCode`, `targetUrl` y `preserveQuery` cuando la ruta no existe pero hay redirect activo.

La app Next usa `app/[...path]/page.jsx` como resolver universal para posts, paginas, categorias, tags, autores, productos, web stories y archivos estaticos heredados, preservando rutas jerarquicas de WordPress antes del E2E.

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
- Resolver autores, tags, productos y web stories desde `routes`.
- Status HTTP 410 real para rutas `GONE` desde una capa route-handler/proxy de produccion.
- Auth real con sesiones, roles y permisos.
