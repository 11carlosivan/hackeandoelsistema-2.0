# Auditoria del Frontend Actual y Plan de Migracion a Next

Este documento analiza el frontend recibido en la raiz del proyecto. El objetivo no es destruir el trabajo existente, sino decidir que partes se pueden rescatar y que partes deben rehacerse para que el nuevo sitio preserve SEO, soporte el CMS real y se sienta como un medio digital serio.

## Diagnostico Ejecutivo

El frontend actual es un prototipo visual hecho en React + Vite + Tailwind. Compila correctamente, pero no es una base final adecuada para migrar Hackeando el Sistema desde WordPress sin riesgo SEO.

Problemas principales:

- Es una SPA con `HashRouter`, por lo que genera rutas con hash y no URLs reales.
- Usa datos mockeados en `src/data/mockData.js`.
- Las rutas publicas no coinciden con las URLs actuales de WordPress.
- La metadata SEO se modifica en cliente con `useEffect`, no desde servidor.
- La paleta hacker negra/roja/blanca es correcta para la marca, pero la estetica terminal domina demasiado y puede hacer que el medio se perciba ficticio o poco editorial.
- Hay textos con problemas de encoding.
- Algunas pantallas inventan conceptos no presentes en el sitio actual: agentes, clearance, auditoria IA, terminal, VPN ficticia, crypto checkout.

Conclusion: se puede rescatar parte del layout, algunos componentes visuales, logos, estructura de pantallas y ciertos patrones de UI, pero la arquitectura, rutas, data fetching y SEO deben rehacerse en Next.

## Lo Que Si Se Puede Rescatar

- Assets de marca en `public/`:
  - `logo.png`
  - `logo_texto.png`
  - `isotipo.png`
  - `favicon.svg`
- Algunas ideas de portada:
  - bloque principal destacado.
  - barra de ultimas noticias.
  - secciones por categoria.
  - bloque de opinion.
  - listado de tendencias.
- Estructura general de pantallas:
  - Home.
  - articulo.
  - categoria.
  - autor/perfil.
  - busqueda.
  - planes.
  - crear publicacion.
  - login/registro.
  - paginas estaticas.
  - 404.
- Uso de Tailwind como base rapida para migrar estilos.
- Componentes de ads/sidebar como punto de partida, pero deben conectarse a `ad_slots` reales.

## Lo Que No Conviene Heredar

### 1. SPA con HashRouter

Archivo: `src/App.jsx`

Actualmente:

```jsx
import { HashRouter as Router } from 'react-router-dom';
```

Esto genera URLs tipo:

```txt
https://dominio.com/#/articulo/id
```

Para SEO y migracion WordPress esto no sirve. Next debe generar rutas reales:

```txt
/
/{post-slug}/
/category/{category-slug}/
/category/{parent}/{child}/
/author/{author-slug}/
/contact/
/privacy-policy/
```

### 2. Rutas Que No Coinciden con WordPress

Actual:

```txt
/articulo/:id
/opinion/:id
/categoria/:id
/pagina/:slug
/perfil/:id
/buscar
```

Necesario:

```txt
/{slug}/
/category/{slug}/
/category/{parentSlug}/{childSlug}/
/author/{slug}/
/?s=query o /buscar?q=query, segun decision SEO
/contact/
/privacy-policy/
/planes/
/checkout/
```

La prioridad es conservar la estructura real del sitio actual. Si una URL cambia, debe existir redirect 301 exacto.

### 3. Metadata SEO en Cliente

Varios archivos usan `useEffect` para escribir:

- `document.title`
- `link rel="canonical"`
- `meta name="robots"`

Eso aparece en:

- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/ForgotPasswordPage.jsx`
- `src/pages/SubmitPostPage.jsx`
- `src/pages/PlansPage.jsx`
- `src/pages/CheckoutPage.jsx`
- `src/pages/StaticPage.jsx`
- `src/pages/NotFoundPage.jsx`

En Next debe hacerse con:

- `generateMetadata`
- metadata por ruta desde `seo_metadata`
- JSON-LD renderizado en servidor
- status HTTP real para 404/410/redirects

### 4. Data Mock

Archivo: `src/data/mockData.js`

El mock sirve para maqueta, pero no representa el WordPress real. Hay nombres, categorias, articulos, autores y fechas inventadas. En la nueva arquitectura, todas las pantallas deben consumir data desde:

- Fastify API.
- Prisma/PostgreSQL.
- `routes`.
- `seo_metadata`.
- tablas de posts, categorias, autores, media, ads y redirects.

### 5. Identidad Hacker Bien Enfocada

La paleta negra/roja/blanca y el tono hacker si hacen sentido para Hackeando el Sistema. Eso debe conservarse porque es parte de la personalidad de marca.

El ajuste no es "quitar lo hacker", sino evitar que la interfaz parezca una simulacion de terminal por encima del contenido. El sitio real es un medio de opinion, politica y noticias. La estetica actual comunica mas:

- videojuego/cyberpunk.
- dashboard de inteligencia.
- producto ficticio de seguridad.

Y a veces comunica menos:

- medio confiable.
- periodismo politico.
- actualidad dominicana.
- opinion editorial.
- informacion verificable.

Recomendacion: conservar la identidad hacker con negro, rojo, blanco, tipografia fuerte, detalles tecnicos sutiles y lenguaje propio. Pero bajar el ruido visual. Menos terminal constante, menos glows, menos etiquetas tecnicas inventadas, mas jerarquia editorial, legibilidad y confianza.

## Riesgos SEO Actuales

### Criticos

- `HashRouter` elimina URLs indexables reales.
- Articulos no usan slugs actuales.
- Categorias no usan `/category/.../`.
- Las paginas estaticas estan bajo `/pagina/:slug`, pero WordPress las sirve en raiz.
- Metadata no existe en HTML inicial.
- No hay sitemap generado.
- No hay robots.txt desde app.
- No hay redirects 301.
- No hay canonical fiable por ruta.
- No hay schema `NewsArticle` real.

### Altos

- Contenido principal viene de mocks.
- Imagenes remotas de prueba, no media real de WordPress.
- Encoding roto en textos.
- Botones y enlaces con rutas inexistentes.
- Busqueda interna podria indexarse si se implementa mal.
- 404 de SPA puede devolver `200` si se despliega estatico.

## Arquitectura Recomendada en Next

Usar App Router.

Estructura sugerida:

```txt
apps/web/
  app/
    page.tsx
    [slug]/
      page.tsx
    category/
      [...slug]/
        page.tsx
    author/
      [slug]/
        page.tsx
    buscar/
      page.tsx
    planes/
      page.tsx
    checkout/
      page.tsx
    iniciar-sesion/
      page.tsx
    register/
      page.tsx
    crear-publicacion/
      page.tsx
    sitemap.ts
    robots.ts
    not-found.tsx
  components/
  features/
  lib/
    api.ts
    seo.ts
    routes.ts
```

La ruta `[slug]` debe consultar primero `routes`:

1. Buscar `path = /{slug}/`.
2. Si `route.status = REDIRECTED`, hacer redirect.
3. Si `entity_type = POST`, renderizar articulo.
4. Si `entity_type = PAGE`, renderizar pagina estatica.
5. Si no existe, devolver 404 real.

Para categorias:

```txt
/category/nacionales/
/category/nacionales/santo-domingo/
```

Se resuelven desde `categories.full_path` y `routes`.

## Data Necesaria por Pantalla

La fuente detallada esta en:

- `docs/frontend-data-requirements.md`
- `docs/hackeando-cms-seo-safe.dbml`

Resumen minimo:

### Home

- `route`
- `seo_metadata`
- `featured_posts`
- `breaking_posts`
- `latest_posts`
- `trending_posts`
- `category_sections`
- `ad_slots`
- `site_settings`

### Articulo

- `route`
- `seo_metadata`
- `post`
- `author`
- `featured_media`
- `media_variants`
- `categories`
- `tags`
- `related_posts`
- `comments_count`
- `ad_slots`
- `schema_json`

### Categoria

- `route`
- `seo_metadata`
- `category`
- `children`
- `posts`
- `pagination`
- `ad_slots`

### Autor

- `route`
- `seo_metadata`
- `author`
- `profile`
- `posts`
- `pagination`

### Busqueda

- `query`
- `results`
- `pagination`
- robots: `NOINDEX, FOLLOW`

### Privadas/Auth/Checkout

- session/auth state.
- formularios.
- errores.
- robots: `NOINDEX`.
- fuera del sitemap.

## Propuesta Visual

Direccion recomendada:

- Mantener negro, rojo y blanco como marca principal.
- Mantener la personalidad hacker, pero aplicada con sobriedad editorial.
- Usar menos "terminal UI" literal y mas lenguaje de medio digital.
- Hero de portada con noticia principal, pero no a pantalla completa excesiva.
- Mas densidad informativa en desktop.
- Mobile limpio, rapido y con titular/imagen/fecha muy legibles.
- Tipografia de lectura mas sobria en articulos.
- Opinion con firma y avatar, pero sin exceso de ficcion.
- Ads con espacios reservados reales.
- Categorias como secciones editoriales, no nodos de sistema.

Evitar:

- "Agente", "clearance", "terminal", "encriptado", "inteligencia global" como texto constante en todas las pantallas.
- Claims falsos como auditoria IA/veracidad si no existe proceso real.
- VPN ficticia como anuncio placeholder en produccion.
- Animaciones constantes tipo scanline en imagenes de noticias.
- Todo en mayusculas en cuerpos de lectura.

## Mapeo de Componentes Actuales a Next

| Actual | Estado | Recomendacion |
| --- | --- | --- |
| `Layout.jsx` | Rescatable parcial | Convertir a `app/layout.tsx`, header/footer server-friendly |
| `Header.jsx` | Rehacer parcial | Usar menu desde CMS, rutas reales, search real |
| `Footer.jsx` | Rescatable parcial | Enlaces reales: contacto, privacidad, planes, redes |
| `Home.jsx` | Rehacer data/rutas | Mantener idea editorial, bajar estetica terminal |
| `ArticleDetail.jsx` | Rehacer fuerte | Ruta por slug, metadata server, contenido HTML real |
| `CategoryPage.jsx` | Rehacer fuerte | `/category/.../`, paginacion, metadata |
| `SearchResults.jsx` | Rehacer | Server/search API, noindex |
| `StaticPage.jsx` | Rehacer | Paginas en raiz, contenido desde CMS |
| Auth pages | Rescatable visual | Mantener noindex, conectar Fastify auth |
| `CmsDashboard.jsx` | Separar | No mezclar admin con web publica |

## Plan de Migracion

### Fase 1: Inventario y Contrato de Data

- Congelar `docs/hackeando-cms-seo-safe.dbml`.
- Definir contratos JSON por pantalla.
- Exportar URLs desde sitemaps, WordPress API y Search Console.
- Poblar `url_inventory`.
- Definir que URLs se mantienen y cuales redirigen.

### Fase 2: Next Base

- Crear app Next con App Router.
- Implementar `routes` resolver.
- Implementar `generateMetadata` desde `seo_metadata`.
- Implementar `robots.ts` y `sitemap.ts`.
- Crear layout base con header/footer.

### Fase 3: Pantallas Publicas SEO

- Home.
- Articulo.
- Categoria.
- Autor.
- Pagina estatica.
- Search noindex.
- 404/410 reales.

### Fase 4: Funciones Comerciales y Usuario

- Login/registro.
- Perfil.
- Planes.
- Checkout.
- Crear publicacion.
- Comentarios.
- Newsletter.

### Fase 5: QA SEO

- Comparar WordPress vs Next:
  - status code.
  - title.
  - description.
  - canonical.
  - robots.
  - H1.
  - contenido principal.
  - schema.
  - imagen OG.
- Validar redirects.
- Validar sitemap.
- Validar mobile.
- Validar Core Web Vitals.

## Decision Recomendada

No migraria este frontend "tal cual" a Next. Lo usaria como moodboard y prototipo parcial.

La nueva version deberia construirse sobre:

- Next App Router.
- resolver universal desde `routes`.
- data real del CMS por Fastify.
- metadata server-side desde `seo_metadata`.
- diseño editorial mas sobrio.
- URLs identicas a WordPress.

El mayor valor del prototipo actual es que ya lista muchas pantallas que el producto necesita. El mayor riesgo es creer que por verse completo ya esta cerca de produccion: para SEO, todavia esta lejos.
