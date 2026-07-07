# Hackeando el Sistema

Base de migracion para reconstruir Hackeando el Sistema desde WordPress hacia un stack Next, Fastify, Prisma y PostgreSQL sin perder SEO.

La raiz del repo ahora contiene la base activa en Next App Router. El prototipo anterior de React + Vite se conserva como referencia visual en `legacy/vite-prototype/`.

## Stack Actual

- Next App Router
- React
- Tailwind CSS
- Vitest
- Testing Library
- oxlint

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
npm run test:coverage
```

## Estructura

```txt
app/                 Next App Router
components/          Componentes compartidos de la nueva base
lib/                 Configuracion y helpers
public/              Assets publicos
test/                Setup de pruebas
legacy/vite-prototype/ Prototipo Vite recibido originalmente
docs/                Documentacion por area
```

## Documentacion

El indice principal esta en [docs/README.md](docs/README.md).

Documentos clave:

- [ERD SEO-safe](docs/architecture/hackeando-cms-seo-safe.dbml)
- [Versionamiento y ramas](docs/architecture/versioning-and-branching.md)
- [Testing strategy](docs/architecture/testing-strategy.md)
- [Frontend data requirements](docs/frontend/frontend-data-requirements.md)
- [Frontend redesign roadmap](docs/frontend/frontend-redesign-roadmap.md)
- [CMS product flow map](docs/cms/cms-product-flow-and-screen-map.md)
- [CMS layout model](docs/cms/cms-layout-and-interaction-model.md)

## Testing

Los tests son obligatorios para nuevas funcionalidades. Cada rama debe incluir pruebas acordes al riesgo del cambio.

Minimo para ramas de implementacion:

- `npm test`
- `npm run build`
- `npm run lint`

Ver politica completa en [docs/architecture/testing-strategy.md](docs/architecture/testing-strategy.md).

## SEO

El objetivo de la migracion es preservar:

- URLs actuales.
- canonicals.
- metadata Yoast.
- JSON-LD.
- sitemaps.
- redirects 301.
- imagenes y previews sociales.

La futura resolucion publica debe partir de `routes` y `seo_metadata`, segun el ERD documentado.

## Rama de Trabajo Actual

```txt
feature/web/next-app-foundation-v0.1
```

Objetivo:

- preparar la base Next.
- conservar el prototipo Vite como legacy.
- instalar testing desde el inicio.
- dejar scripts de build/lint/test funcionando.
