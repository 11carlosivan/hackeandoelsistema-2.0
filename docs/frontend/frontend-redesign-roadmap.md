# Roadmap para Llegar al Rediseño Frontend en Next

Este roadmap organiza el trabajo por fases para llegar a un rediseño completo del frontend sin perder SEO, sin duplicar rutas de WordPress y sin construir pantallas desconectadas del CMS real.

La meta no es solo "hacer que se vea mejor". La meta es construir un frontend editorial moderno, con identidad hacker, preparado para datos reales, URLs actuales, metadata SEO, anuncios, autores, categorias, busqueda y publicaciones patrocinadas.

## Estado Actual

El proyecto actual en raiz es un prototipo React + Vite. Sirve como referencia visual parcial, pero no debe pasar tal cual a produccion.

Limitaciones actuales:

- Usa `HashRouter`.
- Usa data mock.
- Las rutas no coinciden con WordPress.
- La metadata SEO se escribe en cliente.
- No hay resolver basado en `routes`.
- El diseño tiene identidad hacker, pero necesita enfoque editorial.

## Objetivo de Esta Ruta

Llegar a un punto donde el equipo pueda rediseñar e implementar Next con:

- rutas reales compatibles con WordPress.
- metadata server-side.
- componentes conectados a contratos de data.
- UI editorial seria.
- identidad hacker controlada.
- home, articulo, categoria, autor, busqueda y paginas estaticas listas para contenido real.

## Convencion de Ramas

Usar:

```txt
<tipo>/<area>/<descripcion>-v<version>
```

Ejemplos para este roadmap:

```txt
docs/web/frontend-redesign-roadmap-v0.1
feature/web/next-app-foundation-v0.1
feature/seo/route-resolver-v0.1
feature/web/editorial-design-system-v0.1
feature/web/home-redesign-v0.1
feature/web/article-page-redesign-v0.1
```

## Fase 0: Alineacion y Base Documental

Rama:

```txt
docs/web/frontend-redesign-roadmap-v0.1
```

Objetivo:

- Definir el orden correcto de trabajo.
- Alinear diseño, SEO y data antes de tocar Next.
- Separar lo rescatable del prototipo actual.

Entregables:

- Roadmap frontend.
- Criterios visuales de identidad hacker editorial.
- Checklist de preparacion para rediseño.

Criterio de listo:

- El equipo entiende que pantallas existen.
- El equipo entiende que data necesita cada pantalla.
- El equipo entiende que URLs no se pueden improvisar.
- El equipo entiende que el rediseño debe respetar SEO desde el primer componente.

## Fase 1: Base Next

Rama sugerida:

```txt
feature/web/next-app-foundation-v0.1
```

Objetivo:

Crear la base de Next App Router sin rediseñar todavia.

Entregables:

- App Next inicial.
- Tailwind configurado.
- assets de marca migrados.
- layout base.
- fuentes definidas.
- estructura de carpetas.
- variables de entorno.
- cliente API inicial.

Estructura esperada:

```txt
apps/web/
  app/
  components/
  features/
  lib/
  styles/
  public/
```

Criterio de listo:

- `npm run dev` levanta Next.
- `npm run build` pasa.
- Hay layout global.
- No se crean rutas falsas tipo `/articulo/:id`.
- No se copia `HashRouter`.

## Fase 2: Resolver de Rutas y SEO

Rama sugerida:

```txt
feature/seo/route-resolver-v0.1
```

Objetivo:

Hacer que Next resuelva cada URL publica desde `routes`.

Entregables:

- funcion `resolveRoute(path)`.
- soporte para:
  - home.
  - post.
  - page.
  - category.
  - author.
  - redirect.
  - 404.
  - 410.
- `generateMetadata` desde `seo_metadata`.
- JSON-LD base.
- `robots.ts`.
- `sitemap.ts`.

Criterio de listo:

- Una URL legacy puede resolverse sin hardcode.
- Una URL inexistente devuelve 404 real.
- Una URL redirigida usa 301.
- El HTML inicial contiene title, description, canonical y robots.

## Fase 3: Contratos de Data para UI

Rama sugerida:

```txt
feature/web/data-contracts-v0.1
```

Objetivo:

Definir los tipos/contratos que consumiran las pantallas antes de diseñarlas.

Entregables:

- tipos para:
  - `RoutePayload`.
  - `SeoMetadata`.
  - `PostSummary`.
  - `PostDetail`.
  - `CategoryPagePayload`.
  - `AuthorPagePayload`.
  - `HomePayload`.
  - `AdSlotPayload`.
  - `PaginationPayload`.
- mocks realistas basados en WordPress actual, no contenido inventado.

Criterio de listo:

- El diseño se puede construir contra contratos reales.
- Las pantallas no dependen de `mockData.js` viejo.
- Las categorias coinciden con WordPress:
  - `nacionales`
  - `politica`
  - `internacionales`
  - `opinion`
  - `economia-negocios`
  - `salud`
  - `educacion`
  - `santo-domingo`

## Fase 4: Sistema Visual Editorial Hacker

Rama sugerida:

```txt
feature/web/editorial-design-system-v0.1
```

Objetivo:

Crear una base visual reusable antes de rediseñar pantallas completas.

Entregables:

- tokens de color.
- escala tipografica.
- botones.
- cards editoriales.
- badges de categoria.
- componentes de autor/fecha.
- componentes de anuncios.
- contenedores de layout.
- estados vacios.
- placeholders de imagen.

Criterio de listo:

- La identidad hacker se mantiene.
- La lectura es comoda.
- Las cards soportan titulos largos.
- Las imagenes tienen proporciones estables.
- No hay UI terminal innecesaria en cada bloque.

## Fase 5: Rediseño de Home

Rama sugerida:

```txt
feature/web/home-redesign-v0.1
```

Objetivo:

Diseñar la portada como un medio editorial moderno.

Bloques requeridos:

- top bar o breaking news.
- header con logo, categorias y busqueda.
- noticia principal.
- secundarias destacadas.
- ultimas noticias.
- tendencias.
- opinion.
- secciones por categoria.
- anuncios.
- newsletter.

Criterio de listo:

- Mobile y desktop se sienten editoriales.
- El hero no tapa la navegacion ni consume toda la experiencia.
- Las secciones son escaneables.
- El contenido puede venir del CMS.
- No hay datos inventados.

## Fase 6: Rediseño de Articulo

Rama sugerida:

```txt
feature/web/article-page-redesign-v0.1
```

Objetivo:

Crear una pagina de lectura fuerte, rapida e indexable.

Bloques requeridos:

- categoria principal.
- titulo.
- bajada/excerpt.
- autor.
- fecha publicada y modificada.
- imagen principal con caption/credit.
- cuerpo HTML.
- compartir.
- anuncios.
- tags/categorias.
- relacionados.
- mas del autor.
- comentarios si aplican.

Criterio de listo:

- Excelente legibilidad.
- Titulos largos no rompen layout.
- Contenido HTML legacy se ve bien.
- Embeds no rompen mobile.
- Schema `NewsArticle` esta conectado.

## Fase 7: Categorias, Autor y Busqueda

Ramas sugeridas:

```txt
feature/web/category-page-redesign-v0.1
feature/web/author-page-redesign-v0.1
feature/web/search-page-v0.1
```

Objetivo:

Completar pantallas de descubrimiento.

Criterio de listo:

- Categorias usan `/category/.../`.
- Autores usan `/author/.../`.
- Busqueda es `NOINDEX`.
- Paginacion esta resuelta.
- Estados vacios estan diseñados.

## Fase 8: Paginas Funcionales

Ramas sugeridas:

```txt
feature/web/auth-pages-v0.1
feature/web/publication-plans-v0.1
feature/web/submit-post-v0.1
feature/web/checkout-v0.1
```

Objetivo:

Llevar login, registro, planes, pago y crear publicacion a la nueva UI.

Criterio de listo:

- Pantallas privadas fuera del sitemap.
- `NOINDEX` correcto.
- Estados de error claros.
- Flujos conectados a Fastify.

## Fase 9: QA SEO y Visual

Ramas sugeridas:

```txt
test/seo/frontend-rendering-v0.1
test/web/responsive-qa-v0.1
```

Objetivo:

Validar antes de cortar dominio.

Checklist:

- URL actual vs nueva.
- status code.
- title.
- description.
- canonical.
- robots.
- H1.
- contenido principal.
- schema.
- imagen OG.
- sitemap.
- redirects.
- mobile.
- Core Web Vitals.

## Orden Recomendado

1. `docs/web/frontend-redesign-roadmap-v0.1`
2. `feature/web/next-app-foundation-v0.1`
3. `feature/seo/route-resolver-v0.1`
4. `feature/web/data-contracts-v0.1`
5. `feature/web/editorial-design-system-v0.1`
6. `feature/web/home-redesign-v0.1`
7. `feature/web/article-page-redesign-v0.1`
8. `feature/web/category-page-redesign-v0.1`
9. `feature/web/author-page-redesign-v0.1`
10. `feature/web/search-page-v0.1`
11. `feature/web/auth-and-commerce-flows-v0.1`
12. `test/seo/frontend-rendering-v0.1`

## Regla de Oro

No rediseñar una pantalla hasta saber:

- cual es su URL real.
- si indexa o no.
- que data recibe.
- que metadata genera.
- que estado HTTP devuelve.
- que pasa si falta contenido.
- como se ve en mobile.
