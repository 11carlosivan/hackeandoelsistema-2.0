# Auditoria manual de paridad WordPress, SEO, seguridad y operacion

Fecha: 2026-07-12
Rama: `feature/audit/wp-parity-operational-v0.1`
Metodo: revision manual de codigo, DB local y reportes existentes. No se uso scanner automatico.

## Resumen ejecutivo

El proyecto ya tiene una base solida para operar como reemplazo de WordPress: Next sirve rutas publicas, Fastify expone API publica/CMS, Prisma modela la data importada, hay auth con roles/permisos, health/readiness, preflight, smoke de rutas y tests automatizados.

Pero todavia no esta listo para decir "funciona igual que WP" en produccion. Los riesgos principales son SEO/media/paridad editorial:

- La DB contiene los 8,350 posts importados y el inventario live de WordPress tenia 8,396 URLs sin faltantes en DB, pero el sitemap nuevo expone 8,719 rutas. Eso cambia la huella indexable en +323 URLs.
- Todas las 7,892 medias importadas siguen apuntando a `wp-content/uploads` del WordPress original (`disk = wordpress`). Si WP o sus uploads dejan de servir igual, imagenes historicas y OG images pueden romperse.
- Las rutas canonicas de posts servidas por el catch-all `app/[...path]/page.jsx` no inyectan `NewsArticle` JSON-LD, aunque las rutas legacy `/articulo/[id]` si lo hacen.
- El frontend publico todavia tiene fallbacks a mock data. En produccion, una caida de API puede renderizar contenido falso o un sitemap pequeno de muestra, lo cual es peligroso para SEO.
- Hay modulos visibles todavia en modo placeholder: registro, password recovery, checkout/planes, crear publicacion publica.
- El CMS crea y administra posts, media, taxonomias, SEO y workflow basico, pero no tiene aun paridad editorial completa con WP: editor enriquecido, preview real, autosave, revision de publicados, scheduling fuerte y comentarios publicos.

Conclusion: base buena, no cortar a produccion aun. Primero cerrar SEO/media/navegacion publica; luego cerrar flujos CMS y seguridad de produccion; despues E2E real.

## Evidencia verificada

Checks recientes:

- `npm run lint`: OK.
- `npm test`: OK, 14 archivos, 94 tests.
- `npm run db:validate`: OK.
- `npm audit --audit-level=high`: 0 vulnerabilidades.
- `npm run build`: OK.
- `npm run ops:preflight`: PASS, 9 checks, 0 warnings/failures.
- `npm run qa:routes:smoke`: 25 rutas publicas, 0 failures.
- `npm run seo:sitemap:inventory:live`: WordPress live sitemap con 15 sitemaps y 8,396 URLs.

Datos locales observados:

- Posts: 8,350 publicados.
- Paginas: 27.
- Rutas totales: 8,719.
- Rutas activas en sitemap Next: 8,719.
- Media assets: 7,892.
- Categorias: 16.
- Tags: 306.
- Usuarios activos: 7.
- Comentarios importados: 0.
- Redirects activos: 0.

Distribucion de rutas indexables:

- POST: 8,350.
- TAG: 306.
- PAGE: 27.
- CATEGORY: 16.
- AUTHOR: 6.
- PRODUCT: 6.
- WEB_STORY: 4.
- STATIC: 3.
- HOME: 1.

## Hallazgos P0/P1

### P0 - Media historica depende de WordPress

Evidencia:

- `mediaAsset.groupBy({ disk })` devuelve 7,892 assets con `disk = wordpress`.
- Ejemplos apuntan a `https://hackeandoelsistema.net/wp-content/uploads/...`.
- El importador crea media con `disk: "wordpress"` en `scripts/wordpress/import-core.mjs`.

Impacto:

- Si se apaga WordPress o cambia el hosting, se rompen imagenes de posts, portada, OpenGraph y contenido importado.
- Google puede perder imagenes indexadas y preview cards.
- Performance queda atada al viejo origen.

Recomendacion:

- Crear fase de mirror de media: descargar uploads usados, guardar en storage definitivo, registrar checksum, tamanos y MIME.
- Reescribir `media_assets.url`, `contentHtml`, `srcset` y `ogImageUrl` hacia el nuevo dominio/CDN.
- Mantener redirects o proxy temporal para `/wp-content/uploads/...` si se cambia el origen.

### P0 - Sitemap nuevo no copia exactamente la huella de WP

Evidencia:

- Live WP sitemap: 8,396 URLs.
- DB local tiene match de esas URLs, sin faltantes en el reporte restaurado `docs/migration/sitemap-inventory.report.json`.
- API nueva expone 8,719 rutas en `/api/v1/public/sitemap-routes`.
- Diferencia: +323 URLs, principalmente tags/categorias/archivos extra.
- Hay 322 rutas indexables sin `seoMetadata`; corresponden a categorias/tags.

Impacto:

- Google recibira mas URLs indexables que antes. Puede ser correcto si se decide, pero no es "sin cambios".
- Categorias/tags sin metadata propia quedan con metadata generica o pobre.

Recomendacion:

- Definir politica: "sitemap estricto WP" para lanzamiento o "sitemap ampliado".
- Para lanzamiento seguro, mantener en sitemap solo las 8,396 URLs de WP y dejar extras fuera o noindex hasta validarlas.
- Crear SEO metadata para categorias/tags o marcarlas fuera del sitemap si no aportan valor.

### P0 - JSON-LD de articulo falta en la ruta canonica nueva

Evidencia:

- `app/articulo/[id]/page.jsx` inyecta `ArticleStructuredData`.
- `app/[...path]/page.jsx` renderiza `ArticlePageView` para `POST`, pero no inyecta `ArticleStructuredData`.
- Las URLs canonicas migradas son `/${slug}/`, servidas por el catch-all.

Impacto:

- Las URLs canonicas reales pierden marcado `NewsArticle`.
- Puede bajar calidad SEO para noticias aunque metadata basica exista.

Recomendacion:

- Inyectar `ArticleStructuredData` en el branch `POST` de `app/[...path]/page.jsx`.
- Confirmar `mainEntityOfPage`, `datePublished`, `dateModified`, `author`, `publisher.logo` y `image`.

### P1 - Fallbacks a mock data son peligrosos en produccion

Evidencia:

- `lib/main-design/api.js` usa `mockArticles` si `getHomeFeed()` falla.
- `app/sitemap.js` cae a `getSitemapEntries()` si la API de sitemap falla.
- `components/main-design/home.jsx`, `article-page.jsx`, `seo.js`, `content.js`, `profile-page.jsx`, `opinion-page.jsx` todavia importan mocks para algunas vistas.

Impacto:

- Una caida parcial de API podria mostrar contenido ficticio.
- El sitemap podria pasar de miles de URLs reales a un sitemap de muestra.
- Para SEO, eso es peor que fallar rapido.

Recomendacion:

- En produccion, remover fallback mock o limitarlo solo a desarrollo.
- Si API falla, devolver estado controlado, cache anterior o error observable, no contenido inventado.
- Agregar test que falle si `NODE_ENV=production` usa mocks para home/sitemap.

### P1 - Navegacion principal tiene categorias hardcodeadas y algunas no existen

Evidencia:

- `components/main-design/header.jsx` define categorias fijas.
- DB confirma que existen `/category/economia-negocios/`, pero no `/category/economia/`.
- DB confirma que no existe `/category/deportes/`.
- `components/main-design/category-page.jsx` construye links con `href={`/category/${category.fullPath || ...}`}`, lo que puede producir `/category//category/nacionales/` cuando `fullPath` ya incluye `/category/.../`.

Impacto:

- Links principales pueden caer en 404.
- La UI parece incompleta o rota aunque la data exista.
- Mala senal para crawl interno.

Recomendacion:

- Header server-driven desde `/api/v1/public/categories?menuOnly=true`.
- Corregir construccion de links de categoria para usar `fullPath` directo cuando exista.
- Agregar smoke test para todos los links del header.

## Paridad publica con WordPress

Falta o esta incompleto:

- Comentarios publicos: la tabla local tiene 0 comentarios; la API publica no tiene endpoint de envio de comentario. El articulo muestra bloque de comentarios pero sin data real.
- Autor: `/api/v1/public/authors/id/:id` trae solo 12 posts y no pagina.
- Relacionados: `ArticlePageView` recibe `related`, pero la ruta canonica por API no carga relacionados reales.
- Search: funciona por title/excerpt/contentText con `contains`; no tiene filtros por categoria/tag/fecha como una experiencia de archivo completa.
- Productos/Web Stories: hay rutas para conservar SEO, pero no paridad completa de WooCommerce/Web Stories.
- Formularios publicos: registro, recuperar password, checkout/planes y crear publicacion publica estan como `TerminalPage` en preparacion.

Recomendacion:

- Definir que features WP se conservan en launch y cuales quedan noindex/ocultas.
- Antes del E2E, cerrar minimo: author pagination, relacionados reales, comments policy, header dinamico y placeholders noindex fuera de menus publicos.

## CMS y workflow editorial

Listo o avanzado:

- Listado CMS de posts, paginas, media, categorias, tags, redirects, comentarios, auditoria.
- Crear post con categorias, tags existentes e inline tags nuevos.
- SEO por post, workflow publish/archive, media destacada, taxonomia editable.
- RBAC por permisos.
- Audit log en acciones importantes.

Brechas:

- Crear/editar post usa textarea y genera HTML basico; no hay editor enriquecido tipo WP/block editor.
- Edicion de contenido esta bloqueada para publicados; falta flujo de revision/correccion para posts ya publicados.
- No hay preview publica de borrador con token.
- No hay autosave UI ni comparacion visual de revisiones.
- No hay scheduling completo visible como calendario editorial.
- No hay gestion de usuarios/roles desde UI.
- Media picker todavia pide UUID en algunos formularios; no es UX final.

Recomendacion:

- Cerrar flujo editorial minimo: borrador -> revision -> programado/publicado -> correccion con revision.
- Agregar preview segura por token temporal.
- Conectar media picker visual en crear/editar post.

## Seguridad

Fortalezas:

- Fastify usa Helmet, CORS, rate limit y sensible.
- Login con Argon2, refresh sessions, lockout y security events.
- Cookies access/refresh `HttpOnly`; CSRF double-submit para mutaciones con cookie.
- RBAC/permissions en endpoints CMS.
- Zod valida payloads.
- Prisma evita SQL manual en rutas normales.
- Uploads CMS validan extension, MIME, tamano y firma binaria.
- Importador sanitiza HTML legacy con `sanitize-html`.

Riesgos o hardening pendiente:

- `contentSecurityPolicy: false` en `api/plugins/security.js`; falta CSP real para produccion.
- Login devuelve `accessToken` y `refreshToken` en JSON ademas de setear cookies. Para browser CMS, conviene no exponer refresh token a JS salvo caso API-client explicito.
- `SameSite=Lax` esta bien si web/API comparten sitio; si API vive en otro subdominio/dominio, hay que redisenar cookies (`Secure`, dominio, CORS, SameSite) antes de produccion.
- No hay endpoints completos para password reset, email verification o MFA, aunque el schema contiene tablas para tokens/MFA.
- No hay UI de usuarios/roles/permisos.
- No hay migraciones Prisma versionadas ni runbook de rollback.

Recomendacion:

- Activar CSP progresivo con report-only primero.
- Separar respuesta login browser vs API token.
- Implementar password reset y administracion de usuarios antes de entregar CMS a cliente.
- Crear migraciones formales y backup/restore probado.

## Performance y optimizacion

Riesgos:

- Se usan muchos `<img>` directos; no hay estrategia clara de `next/image`, responsive sizes ni CDN.
- Todas las imagenes historicas cargan desde WP, sin optimizacion local.
- Sitemap devuelve 8,719 URLs en una sola respuesta; hoy es manejable, pero conviene preparar sitemap index/chunks si crece.
- Search usa `contains` sobre texto; con 8k posts puede aguantar, pero para crecer conviene full-text search en mysql o motor dedicado.
- Home muestra 12 posts y filtros client-side; no representa todo el archivo si el usuario espera explorar 8k desde home.

Recomendacion:

- Primero mirror media + CDN/cache headers.
- Luego `next/image` o componente propio de imagen optimizada con dimensiones reales.
- Crear indices full-text para busqueda editorial/publica.
- Cachear endpoints publicos con invalidacion por publish/update.

## Operacion y despliegue

Listo:

- `/health` y `/ready`.
- `ops:preflight` con DB, API, sitemap, login admin.
- `qa:routes:smoke` para rutas publicas.

Falta:

- Migraciones Prisma versionadas (`prisma/migrations` no existe).
- Runbook de deploy, rollback, backups y restore.
- Politica de storage para media.
- Configuracion de produccion para secretos, cookies, CORS, CSP y logs.
- Monitoreo/alertas para sitemap, 404, 500, jobs de importacion y media faltante.

## Testing faltante

Existe:

- Tests unitarios/integracion API/CMS/auth/import/smoke.

Falta antes de E2E final:

- Playwright E2E con login CMS, crear post, subir media, crear tags, publicar, validar ruta publica y sitemap.
- Test SEO DOM: canonical, robots, OG, Twitter, JSON-LD en una muestra de posts/pages/category/tag/author/product/web-story.
- Crawl comparativo de URLs WP vs Next con status/canonical/title/description.
- Test de links del header/nav/footer.
- Test de media: 200 OK para imagen destacada y primeras imagenes dentro de contenido.
- Test de permisos: editor vs admin vs usuario sin permiso.

## Orden recomendado de implementacion

1. SEO de lanzamiento: sitemap estricto o politica de extras, metadata categorias/tags, JSON-LD en canonicas, eliminar mocks en produccion, arreglar header/categoria links.
2. Media: mirror de uploads WP, rewrite de URLs, estrategia CDN/cache, validacion de imagenes en posts.
3. Paridad publica: comentarios o decision de desactivarlos, author pagination, relacionados reales, busqueda/archivo mas completa.
4. CMS editorial: preview token, media picker visual, revision de publicados, scheduling, editor enriquecido.
5. Seguridad/operacion: CSP, respuesta de tokens, password reset, usuarios/roles UI, migraciones, backups, deploy runbook.
6. E2E completo y prueba con cliente.

## Decision recomendada

No hacer cutover todavia. La data esta importada y las bases funcionan, pero para no perder SEO se debe cerrar primero media + sitemap + metadata/JSON-LD + mocks de produccion. Despues de eso, ya tiene sentido preparar la prueba E2E del sistema completo.

## Segunda pasada manual: bugs y brechas tecnicas adicionales

Esta seccion baja a hallazgos mas especificos encontrados despues del primer informe.

### P0 - Taxonomias creadas desde CMS no quedan como rutas SEO completas

Evidencia:

- `api/routes/cms.js` crea categorias en `/api/v1/cms/categories`, pero solo escribe `Category`; no crea `Route` ni `SeoMetadata`.
- `api/routes/cms.js` crea tags en `/api/v1/cms/tags`, pero solo escribe `Tag`; no crea `Route` ni `SeoMetadata`.
- El importador si crea rutas para categorias y tags importados, por eso los 16 categories y 306 tags heredados existen como rutas.
- Las 322 rutas sin SEO metadata son 306 tags y 16 categories.

Impacto:

- Una categoria o tag creado por el CMS puede existir en DB, pero no entrar al sitemap ni tener canonical/robots propio.
- El comportamiento deja de parecerse a WordPress, donde una taxonomia publicada tiene archivo publico.
- Si luego el frontend enlaza esa categoria/tag, puede generar canonical incorrecto o archivo no indexado.

Recomendacion:

- Al crear categoria/tag desde CMS, crear/actualizar `Route` + `SeoMetadata`.
- Para categorias usar `fullPath` canonico tipo `/category/slug/` o respetar la base configurada.
- Al renombrar slug/fullPath, actualizar la ruta y crear redirect desde la ruta anterior.
- Agregar tests para create/update category/tag verificando route, seo, sitemap y redirect.

### P0 - `fullPath` de categorias nuevas no sigue la forma importada de WordPress

Evidencia:

- Importadas: `fullPath` como `/category/nacionales/`.
- CMS nuevo: `buildCategoryFullPath()` devuelve `slug` o `parent.fullPath/slug`, sin prefijo `/category/`.
- `CategoryPage` usa `category.fullPath` como canonical.

Impacto:

- Una categoria nueva podria terminar con canonical `https://hackeandoelsistema.net/nueva-categoria` en vez de `/category/nueva-categoria/`.
- Esto rompe consistencia con WP y puede crear URLs duplicadas.

Recomendacion:

- Normalizar `fullPath` siempre con slash inicial/final y base de categoria.
- Crear helper unico `buildCategoryCanonicalPath()` compartido por importador, CMS y frontend.

### P1 - Programacion editorial esta modelada, pero no operativa

Evidencia:

- `PostStatus` incluye `SCHEDULED`.
- El formulario de crear post envia `scheduledAt`.
- El backend guarda `scheduledAt`, pero crea el post siempre como `DRAFT`.
- No existe transicion visible a `SCHEDULED`.
- `PUBLISH` publica inmediatamente y usa `publishedAt` actual si no existia.

Impacto:

- El usuario puede creer que programo una publicacion, pero queda como borrador.
- No hay job/worker que publique automaticamente al llegar la fecha.
- No hay paridad con WordPress para programar entradas.

Recomendacion:

- Agregar accion `SCHEDULE` o crear post con status `SCHEDULED` cuando `scheduledAt` exista.
- Crear worker/cron que publique posts vencidos.
- Mostrar estado programado y permitir cancelar/reprogramar.
- Tests: crear programado, no aparece publico, al vencer se publica y entra al sitemap.

### P1 - Menu publico no esta conectado a la data real

Evidencia:

- `components/main-design/header.jsx` tiene categorias hardcodeadas.
- DB local no tiene rutas `/category/economia/` ni `/category/deportes/`.
- `showInMenu=true` no esta seteado en ninguna categoria importada, por eso `/api/v1/public/categories?menuOnly=true` devuelve vacio.

Impacto:

- Navegacion principal puede mandar a 404.
- No replica el menu real de WordPress.
- Crawlers y usuarios pierden enlaces internos importantes.

Recomendacion:

- Importar menu WP o configurar `Menu/MenuItem`.
- Sembrar `showInMenu` solo si se decide no usar tabla Menu.
- Header debe venir de API o de una config server-side versionada, no de slugs hardcodeados.

### P1 - Links internos de articulo a categoria pueden construir slugs equivocados

Evidencia:

- `ArticlePageView` enlaza categorias con `/categoria/${encodeURIComponent(article.category)}`.
- `article.category` es el nombre mapeado en mayuscula, no el slug/fullPath.
- Categoria importada `Economia &amp; Negocios` puede convertirse en una ruta derivada de texto visible, no en `/category/economia-negocios/`.

Impacto:

- Algunos links internos pueden fallar o redirigir mal.
- Esto reduce calidad SEO por enlaces internos rotos.

Recomendacion:

- Mapear en `mapApiPostToArticle()` el `primaryCategory.fullPath` y usarlo para href.
- Usar nombre solo para label visual.

### P1 - Redirects manuales pueden ser inalcanzables si chocan con rutas activas

Evidencia:

- `/api/v1/public/route` busca primero `Route`.
- Solo si no encuentra route busca `Redirect`.
- El CMS de redirects valida duplicados en `redirects`, pero no valida conflicto con `routes`.

Impacto:

- Si se crea redirect desde una ruta activa, el redirect no se ejecuta.
- El operador puede creer que arreglo una URL SEO, pero la ruta anterior sigue sirviendo.

Recomendacion:

- Al crear redirect, bloquear si `sourcePath` existe como `Route ACTIVE`, o cambiar esa route a `REDIRECTED/GONE`.
- Registrar `hitCount` y `lastHitAt` al resolver redirect.

### P1 - Busqueda publica pendiente de ranking full-text MySQL

Evidencia:

- `prisma/sql/001_mysql_foundation.sql` crea un indice FULLTEXT basico para MySQL.
- `api/routes/public.js` busca con `contains` en title/excerpt/contentText.

Impacto:

- Con 8k posts funciona, pero escala peor y da relevancia pobre.
- No aprovecha ranking, acentos, idioma espanol ni indices full-text.

Recomendacion:

- Cambiar busqueda publica/CMS a `MATCH ... AGAINST` o a un servicio de busqueda dedicado.
- Ordenar por relevancia + fecha.
- Mantener fallback `contains` solo para casos simples.

### P1 - Metricas visibles no son reales

Evidencia:

- `viewCount` agregado local suma 0 en todos los posts.
- `Home` calcula tendencias con `views`, pero todos los posts vienen con `0`.
- `commentCount` suma 897 en posts, pero la tabla `comments` esta vacia.

Impacto:

- Tendencias, lecturas y comentarios no representan comportamiento real.
- Puede confundir al cliente y al lector.

Recomendacion:

- Importar comentarios si se conservaran, o ocultar bloque de comentarios.
- Implementar tracking de vistas con deduplicacion/rate limit.
- Definir fuente real para tendencias: vistas, publicaciones recientes, manual editorial o combinacion.

### P1 - Contenido legacy conserva referencias internas a uploads de WP

Evidencia:

- 4,194 posts contienen `wp-content/uploads` dentro de `contentHtml`.
- 7,892 media assets importados estan en `disk = wordpress`.

Impacto:

- Aunque se cambie featured image, el cuerpo de miles de posts puede seguir cargando imagenes desde WP.
- Si WP se apaga, se rompen articulos historicos.

Recomendacion:

- El mirror de media debe reescribir HTML completo, no solo `media_assets.url`.
- Reescribir `src`, `srcset`, `href` a uploads y metadata OG.

### P2 - Autores importados son usuarios activos sin password ni roles

Evidencia:

- 6 usuarios legacy estan `ACTIVE`, sin password y sin roles.
- Solo `admin@hackeando.local` tiene password y rol `ADMIN`.

Impacto:

- No es una vulnerabilidad directa porque login requiere password, pero mezcla "autor publico" con "usuario operativo".
- Para administracion futura de usuarios puede confundir conteos y permisos.

Recomendacion:

- Definir estado/rol de autores legacy: autor publico sin login, o usuarios invitables.
- Si se les dara acceso, generar flujo de invitacion/password reset.

### P2 - Foundation SQL no reemplaza migraciones de produccion

Evidencia:

- Existe `prisma/schema.prisma` y `prisma/sql/001_mysql_foundation.sql`.
- No existe `prisma/migrations`.
- El SQL de constraints usa `ALTER TABLE ADD CONSTRAINT` sin `IF NOT EXISTS`, por lo que no es seguro re-ejecutarlo sin control.

Impacto:

- Deploy/rollback de DB queda manual.
- Un ambiente nuevo puede quedar distinto si no se aplica el SQL en el orden correcto.

Recomendacion:

- Crear migraciones Prisma versionadas.
- Separar SQL idempotente de SQL one-shot.
- Agregar runbook de restore/rollback.

## Acciones inmediatas antes de seguir con E2E

1. Arreglar taxonomias CMS: route + SEO + canonical + redirect al cambiar slug.
2. Arreglar navegacion: menu real y links internos a categorias por `fullPath`.
3. Implementar JSON-LD en rutas canonicas de posts.
4. Eliminar mocks/fallbacks en produccion.
5. Definir sitemap estricto vs ampliado.
6. Empezar mirror/rewrite de media, incluyendo HTML.
7. Corregir scheduling o quitar UI de programacion hasta implementarlo.
