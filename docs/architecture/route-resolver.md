# Route Resolver

La capa `lib/routing` es el contrato inicial para resolver URLs publicas en Next sin depender de rutas hardcodeadas.

## Objetivo

Toda URL publica debe pasar por una resolucion equivalente a:

```txt
path -> routes -> entity -> seo_metadata -> render / redirect / 404
```

Esto protege:

- URLs heredadas de WordPress.
- canonicals.
- redirects.
- sitemap.
- metadata.
- JSON-LD.

## Estado Actual

En `feature/seo/route-resolver-v0.1` el resolver usa fixtures temporales:

- `lib/routing/fixtures.js`
- `lib/routing/route-resolver.js`
- `lib/seo/metadata.js`

Los fixtures modelan la forma del ERD:

- `routes`
- `seo_metadata`
- entidades publicas.

## Rutas Conectadas

- `/`
- `/{slug}/`
- `/category/{slug}/`
- `/author/{slug}/`
- `/pagina/{slug}/` para redirects legacy temporales.
- `/robots.txt`
- `/sitemap.xml`

## Proxima Evolucion

Reemplazar fixtures por data real desde:

- Fastify API.
- Prisma.
- PostgreSQL.

La interfaz del resolver debe mantenerse estable para que las pantallas publicas no cambien cuando se conecte el backend.

## Tests

Tests actuales:

- normalizacion de paths.
- resolucion de rutas activas.
- redirects legacy.
- payload 404.
- sitemap solo con rutas activas.
- metadata/canonical.
- JSON-LD.

Comando:

```bash
npm test
```
