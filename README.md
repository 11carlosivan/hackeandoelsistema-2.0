# Hackeando el Sistema

Frontend Next.js para Hackeando el Sistema Network. Mantiene la estetica actual aprobada por el cliente y reemplaza el runtime legacy de Vite/React Router por App Router de Next.

## Stack

- Next.js
- React
- TailwindCSS
- Vitest + Testing Library
- oxlint

## SEO

La metadata vive en la capa nativa de Next para que Google reciba HTML rastreable desde el primer render.

- Metadata por ruta: home, articulos, categorias, opiniones, perfiles y paginas estaticas generan `title`, `description`, canonical, Open Graph y Twitter cards.
- Indexacion selectiva: busqueda interna, checkout, CMS, login, registro, recuperacion y crear publicacion usan `NOINDEX, NOFOLLOW`.
- Sitemap y robots: `app/sitemap.js` y `app/robots.js` exponen `/sitemap.xml` y `/robots.txt`.
- Datos estructurados: Organization/WebSite global y NewsArticle por publicacion mediante JSON-LD.
- Redirects 301: `lib/main-design/legacy-redirects.js` queda preparado para cargar el mapa real de URLs antiguas de WordPress.

Para produccion se debe configurar:

```bash
NEXT_PUBLIC_SITE_URL=https://hackeandoelsistema.net
```

## Rutas Principales

- `/`
- `/articulo/[id]`
- `/categoria/[id]`
- `/opinion/[id]`
- `/perfil/[id]`
- `/pagina/[slug]`
- `/buscar`
- `/cms`
- `/contacto-seguro`
- `/planes`

## Desarrollo

```bash
npm install
npm run dev
```

## Validacion

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

La build de produccion se genera con Next en `.next/` y debe desplegarse en un runtime compatible con Next.js.
