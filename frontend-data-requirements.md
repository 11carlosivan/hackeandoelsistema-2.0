# Hackeando el Sistema - Requisitos de Data para el Nuevo Frontend

Este documento no define implementacion ni endpoints finales. Su objetivo es darle al equipo de frontend una vision clara de que datos necesita cada pantalla para disenar y construir el nuevo sitio en Next sin perder SEO, estructura editorial ni funcionalidades actuales.

La regla principal de la migracion es: cada pantalla publica debe poder renderizarse con HTML inicial completo, metadata SEO correcta y una URL estable. El frontend no debe depender de cargar el contenido principal solo en cliente.

## Principios Globales

Todas las pantallas publicas deben recibir una entidad `route`:

- `path`: URL canonica interna, por ejemplo `/como-recordamos-a-un-presidente-de-la-republica-dominicana/`.
- `entity_type`: tipo de pantalla: `HOME`, `POST`, `PAGE`, `CATEGORY`, `TAG`, `AUTHOR`, `PRODUCT`, `WEB_STORY`, `SEARCH`, `STATIC`.
- `entity_id`: id de la entidad principal.
- `http_status`: normalmente `200`; puede ser `404`, `410` o `301` si aplica.
- `canonical_url`: URL canonica final.
- `include_in_sitemap`: define si aparece en sitemap.
- `lastmod_at`: fecha para sitemap y revalidacion.

Todas las pantallas indexables deben recibir `seo_metadata`:

- `title`
- `description`
- `canonical_url`
- `robots_index`: `INDEX` o `NOINDEX`
- `robots_follow`: `FOLLOW` o `NOFOLLOW`
- `og_title`
- `og_description`
- `og_image_url` o media asociada
- `twitter_card`
- `schema_json`
- `yoast_head_json` durante la migracion, para comparar con WordPress

Datos comunes de layout:

- Logo principal y variante para mobile si aplica.
- Menu principal.
- Menu secundario o footer.
- Redes sociales.
- Configuracion de newsletter.
- Slots de anuncios activos.
- Estado de usuario si esta logueado.
- Texto legal/cookies.

## 1. Home

Objetivo: portada editorial con ultimas noticias, bloques por categoria, trending, videos, anuncios y newsletter.

Data principal:

- `featured_posts`: articulos destacados para hero o bloque principal.
- `breaking_posts`: noticias marcadas como ultima hora.
- `latest_posts`: listado cronologico.
- `trending_posts`: calculado por vistas, seleccion manual o mezcla.
- `category_sections`: secciones como Nacionales, Politica, Internacionales, Opinion, Salud, Educacion, Santo Domingo, Santo Domingo Este.
- `youtube_items` o bloque de videos externos si se mantiene.
- `ad_slots`: banners de portada.
- `newsletter_config`.

Cada post resumido debe traer:

- `title`
- `slug`
- `url`
- `excerpt`
- `published_at`
- `updated_at`
- `author.display_name`
- `primary_category.name`
- `primary_category.url`
- `featured_image.url`
- `featured_image.alt_text`
- `view_count` si se muestra
- flags: `is_featured`, `is_breaking`, `is_sponsored`

Estados de diseno:

- Sin imagen destacada.
- Categoria vacia.
- Bloque de anuncio sin campana activa.
- Carga de mas articulos.
- Mobile con muchos titulos largos.

SEO:

- Debe tener `WebSite`, `Organization` y posiblemente `SearchAction` en JSON-LD.
- Canonical: `https://hackeandoelsistema.net/`.
- No duplicar contenido por paginacion. `/page/2/` debe tener canonical y metadata controlada.

## 2. Articulo / Noticia

Objetivo: pagina individual de articulo, opinion o contenido patrocinado.

Data principal:

- `post.id`
- `post.title`
- `post.slug`
- `post.url`
- `post.excerpt`
- `post.content_html` o contenido ya renderizable.
- `post.content_json` si se usa editor estructurado.
- `post.content_text` para busqueda interna, no necesariamente visible.
- `post.status`
- `post.visibility`
- `post.post_type`
- `post.published_at`
- `post.updated_at`
- `post.reading_time_minutes`
- `post.view_count`
- `post.comment_count`
- `post.is_sponsored`
- `post.legacy_wordpress_id`
- `post.legacy_url`

Autor:

- `author.display_name`
- `author.url`
- `author.avatar`
- `author.bio`
- redes del autor si aplica.

Imagen principal:

- `featured_media.url`
- `featured_media.alt_text`
- `featured_media.caption`
- `featured_media.credit`
- variantes responsive.

Taxonomia:

- `primary_category`
- `categories[]`
- `tags[]`

Relaciones editoriales:

- `related_posts`
- `previous_post`
- `next_post`
- `more_from_author`
- `more_from_category`

Comentarios:

- `comments_enabled`
- `approved_comments`
- formulario o CTA de login.

Anuncios:

- slot superior.
- slot dentro del contenido.
- slot lateral desktop.
- slot inferior.

SEO:

- `Article` o `NewsArticle` JSON-LD.
- `headline`
- `datePublished`
- `dateModified`
- `author`
- `publisher`
- `image`
- `mainEntityOfPage`
- canonical exacto igual al WordPress actual si la URL no cambia.
- `og:type = article`.
- `max-image-preview:large`.

Estados de diseno:

- Titulos extremadamente largos.
- Articulos antiguos con URL numerica como `/1798/`.
- Articulos sin excerpt.
- Articulos con embeds de YouTube, Facebook, Instagram o X.
- Articulos con imagen rota o imagen heredada de `/wp-content/uploads/`.
- Articulo privado o no publicado.
- Articulo programado.

## 3. Categoria

Objetivo: listado editorial por categoria.

Ejemplos actuales:

- `/category/nacionales/`
- `/category/politica/`
- `/category/internacionales/`
- `/category/nacionales/santo-domingo/`

Data principal:

- `category.name`
- `category.slug`
- `category.full_path`
- `category.description`
- `category.parent`
- `category.children`
- `category.seo_metadata`
- `posts`
- `pagination`

Cada item del listado usa el resumen de post.

SEO:

- Canonical de la categoria.
- Metadata propia.
- Paginacion controlada.
- Si una categoria no tiene contenido, decidir entre `noindex`, `404` o pagina valida vacia.

Estados de diseno:

- Categoria padre con subcategorias.
- Categoria sin posts.
- Categoria con posts antiguos sin imagen.
- Paginacion extensa.

## 4. Autor

Objetivo: pagina de autor/redactor con articulos publicados.

Ejemplo actual:

- `/author/redaccion/`

Data principal:

- `author.display_name`
- `author.username`
- `author.avatar`
- `author.bio`
- `author.website_url`
- redes sociales.
- `author.legacy_author_slug`
- `posts`
- `pagination`

SEO:

- Canonical de autor.
- Normalmente indexable si el autor aporta valor editorial.
- Schema `Person` si aplica.

Estados de diseno:

- Autor sin avatar.
- Autor sin bio.
- Autor con muchos articulos.
- Autor suspendido o eliminado con articulos historicos.

## 5. Busqueda

Objetivo: resultados internos por termino.

Ejemplo actual:

- `/?s=prm`

Data principal:

- `query`
- `results`
- `total_results`
- `pagination`
- filtros opcionales: categoria, fecha, autor.

SEO:

- Recomendacion: `NOINDEX, FOLLOW` para resultados de busqueda interna.
- Evitar generar infinitas URLs indexables por parametros.

Estados de diseno:

- Sin resultados.
- Query muy corta.
- Query con caracteres especiales.
- Muchos resultados.

## 6. Pagina Estatica

Objetivo: paginas como contacto, privacidad, politicas, suscripcion, test o landings.

Ejemplos actuales:

- `/contact/`
- `/privacy-policy/`
- `/suscripcion/`
- `/politicas-de-publicacion/`

Data principal:

- `page.title`
- `page.slug`
- `page.content_html`
- `page.content_json`
- `page.status`
- `page.published_at`
- `seo_metadata`

SEO:

- Cada pagina decide si indexa.
- Paginas legales y contacto suelen ser indexables.
- Paginas de prueba deben ser `NOINDEX` o no migrarse.

Estados de diseno:

- Pagina con contenido simple.
- Pagina con formulario.
- Pagina heredada con shortcode de WordPress.
- Pagina que debe redirigir a otra.

## 7. Login, Registro y Cuenta

Objetivo: acceso de usuarios, perfil y funciones privadas.

Ejemplos actuales:

- `/iniciar-sesion/`
- `/register/`
- `/perfil/`
- `/mi-cuenta/`
- `/password-recover/`
- `/password-reset/`

Data principal:

- Estado de autenticacion.
- Usuario actual.
- Perfil.
- Roles/permisos.
- Sesiones activas si se muestran.
- Mensajes de error y validacion.

SEO:

- Estas pantallas deben ser `NOINDEX, NOFOLLOW` o al menos `NOINDEX, FOLLOW`.
- No deben aparecer en sitemap publico.

Estados de diseno:

- Usuario no autenticado.
- Usuario pendiente de verificar email.
- Usuario suspendido.
- Token expirado.
- Formulario con errores.

## 8. Crear Publicacion / Submission

Objetivo: que usuarios o clientes creen publicaciones externas o patrocinadas.

Ejemplos actuales:

- `/crear-publicacion/`
- `/hes_submit/`

Data principal:

- Usuario autenticado.
- Creditos disponibles.
- Plan activo.
- Campos editoriales: titulo, categoria, excerpt, contenido, imagen, tags.
- Reglas de publicacion.
- Estado de revision: borrador, pendiente, cambios solicitados, rechazado, publicado.

SEO:

- Pantalla privada: `NOINDEX`.
- El articulo final solo debe indexar cuando este `PUBLISHED` y `PUBLIC`.

Estados de diseno:

- Sin creditos.
- Con credito activo.
- Plan vencido.
- En revision.
- Cambios solicitados por editor.
- Rechazado.

## 9. Planes, Pago y Checkout

Objetivo: compra de planes de publicacion.

Ejemplos actuales:

- `/planes/`
- `/pago/`
- `/checkout/`
- `/hes_plans/`

Data principal:

- `publication_plans`
- precio.
- moneda.
- cuota de publicaciones.
- vigencia.
- plan popular.
- orden actual.
- items de orden.
- estado de pago.
- metodo de pago.

SEO:

- Pagina publica de planes puede ser indexable si se quiere captar clientes.
- Checkout, pago y confirmacion deben ser `NOINDEX`.

Estados de diseno:

- Plan activo/inactivo.
- Pago pendiente.
- Pago fallido.
- Pago exitoso.
- Orden cancelada.
- Usuario no autenticado intentando comprar.

## 10. Newsletter

Objetivo: capturar suscriptores.

Data principal:

- Campos requeridos: email, nombre, apellido.
- Estado de suscripcion.
- Fuente de suscripcion: home, articulo, popup, footer.
- Texto legal/consentimiento.

SEO:

- El bloque es parte de otras pantallas.
- No necesita URL propia salvo landing de suscripcion.

Estados de diseno:

- Email ya registrado.
- Suscripcion exitosa.
- Error de validacion.
- Usuario dado de baja.

## 11. Ads / Anuncios

Objetivo: renderizar espacios publicitarios sin romper CLS ni experiencia mobile.

Data por slot:

- `slot.code`
- `slot.location`
- `slot.width`
- `slot.height`
- `ad.title`
- `ad.media`
- `ad.target_url`
- `ad.sponsor_name`
- `ad.starts_at`
- `ad.ends_at`
- tracking de impression/click.

Pantallas donde aparecen:

- Home.
- Articulo.
- Categoria.
- Sidebar desktop.
- Footer.

Estados de diseno:

- Slot sin anuncio activo.
- Imagen vertical/horizontal.
- Anuncio expirado.
- Anuncio externo.

Nota de UX:

- Reservar alto/ancho estable para evitar saltos visuales.

## 12. Web Stories

Objetivo: conservar las URLs existentes si se migran las stories del sitemap.

Data principal:

- `title`
- `slug`
- `content_json`
- `featured_media`
- `published_at`
- `seo_metadata`
- `legacy_url`

SEO:

- Mantener canonical.
- Si no se van a reconstruir, crear redirect 301 o servir una version equivalente.

Estados de diseno:

- Story completa.
- Story legacy no soportada.
- Story redirigida a articulo relacionado.

## 13. Productos

Objetivo: conservar productos actuales o redirigirlos a planes si eran parte de WooCommerce.

Data principal:

- `title`
- `slug`
- `description_html`
- `short_description`
- `price_amount`
- `currency`
- `featured_media`
- `is_active`
- `legacy_url`
- `seo_metadata`

SEO:

- Si siguen siendo productos publicos, usar schema `Product`.
- Si eran solo mecanismo viejo de pago, redirigir a `/planes/` o nueva pantalla equivalente.

Estados de diseno:

- Producto activo.
- Producto descontinuado.
- Producto sin precio.
- Producto redirigido.

## 14. Error 404 / 410

Objetivo: manejar URLs inexistentes sin crear soft 404.

Data principal:

- `requested_path`
- sugerencias de busqueda.
- posts recientes.
- categorias principales.

SEO:

- Debe devolver HTTP `404` real.
- Para contenido eliminado definitivamente, usar `410`.
- No devolver `200` con mensaje de no encontrado.

Estados de diseno:

- URL nunca existio.
- URL legacy sin mapping.
- Contenido eliminado.

## 15. Redirects

Objetivo: proteger URLs antiguas de WordPress, slugs cambiados y contenido reorganizado.

Data principal:

- `source_path`
- `target_url`
- `status_code`
- `preserve_query`
- `is_active`

Reglas:

- Todo cambio permanente usa `301`.
- No encadenar redirects.
- Evitar que una URL redirija a una pagina no equivalente.
- Mantener URLs numericas antiguas si ya estan indexadas o redirigirlas uno a uno.

## Checklist de Diseno por Pantalla

Antes de disenar una pantalla, confirmar:

- Cual es la URL canonica.
- Si la pantalla indexa o no.
- Que metadata SEO necesita.
- Que imagen se usa para compartir.
- Que pasa si no hay imagen.
- Que pasa si el titulo es muy largo.
- Que pasa si no hay resultados/contenido.
- Que partes son desktop-only y mobile.
- Que anuncios aparecen y cuanto espacio reservan.
- Que datos vienen del CMS y cuales son configuracion global.

## Checklist de Migracion SEO para Frontend

- El contenido principal debe venir en HTML inicial.
- El `title` y `description` deben coincidir con WordPress al inicio.
- El canonical debe ser identico cuando la URL no cambia.
- Los articulos deben conservar `datePublished` y `dateModified`.
- Las imagenes principales deben conservar URL o tener redirect estable.
- Las categorias deben usar `/category/.../` salvo decision consciente de redireccion.
- Las paginas privadas deben quedar fuera del sitemap.
- La busqueda interna debe ser `NOINDEX`.
- Los sitemaps deben generarse desde `routes`.
- Los redirects deben probarse antes del cambio de DNS.
