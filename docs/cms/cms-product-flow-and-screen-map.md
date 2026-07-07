# CMS Product Flow and Screen Map

Este documento traduce el ERD `docs/architecture/hackeando-cms-seo-safe.dbml` a flujos reales de pantallas y funcionalidades. Su objetivo es que frontend, backend y producto entiendan como debe funcionar el sistema completo antes de redisenar o implementar pantallas.

La idea principal: cada pantalla existe porque resuelve un flujo de negocio, editorial, SEO o comercial.

## Mundos del Producto

El sistema se divide en cuatro mundos:

1. Web publica.
2. CMS interno.
3. Portal de cliente/colaborador.
4. Capa SEO/migracion.

Cada mundo tiene pantallas distintas, roles distintos y reglas distintas de indexacion.

## Roles Principales

Los roles exactos saldran de `roles`, `permissions`, `user_roles` y `role_permissions`.

### Super Admin

Puede:

- administrar usuarios.
- administrar roles/permisos.
- ver audit logs.
- configurar sitio.
- modificar SEO critico.
- administrar redirects.
- publicar o archivar cualquier contenido.

### Director Editorial

Puede:

- ver dashboard editorial completo.
- revisar cola editorial.
- aprobar, rechazar o pedir cambios.
- publicar.
- programar.
- destacar contenido en home.
- asignar categorias principales.
- editar SEO editorial.

### Editor

Puede:

- crear y editar posts.
- revisar submissions.
- pedir cambios.
- aprobar contenido segun permisos.
- moderar comentarios.
- administrar categorias/tags si tiene permiso.

### Redactor

Puede:

- crear drafts.
- editar sus propios drafts.
- enviar a revision.
- ver cambios solicitados.
- ver historial propio.

### Cliente / Colaborador Externo

Puede:

- registrarse.
- comprar planes.
- ver creditos.
- crear publicaciones externas.
- responder cambios solicitados.
- ver estado de sus publicaciones.

### SEO Manager

Puede:

- revisar `routes`.
- editar `seo_metadata`.
- revisar `url_inventory`.
- crear redirects.
- validar sitemap.
- marcar noindex/index.

### Ads Manager

Puede:

- crear slots.
- crear campanas/anuncios.
- subir creatividades.
- pausar/activar anuncios.
- ver impressions/clicks.

### Finance / Payments

Puede:

- ver orders.
- ver payments.
- verificar pagos.
- emitir refunds.
- revisar creditos de publicacion.

### Moderator

Puede:

- aprobar comentarios.
- marcar spam.
- mandar a trash.
- revisar reportes.

## Mapa General de Navegacion

### Web Publica

Rutas:

- `/`
- `/{post-slug}/`
- `/category/{slug}/`
- `/category/{parent}/{child}/`
- `/author/{slug}/`
- `/buscar?q=...`
- `/contact/`
- `/privacy-policy/`
- `/planes/`
- `/checkout/`
- `/crear-publicacion/`
- `/iniciar-sesion/`
- `/register/`
- 404 / 410

### CMS Interno

Rutas sugeridas:

- `/cms`
- `/cms/posts`
- `/cms/posts/new`
- `/cms/posts/{id}`
- `/cms/reviews`
- `/cms/reviews/{postId}`
- `/cms/calendar`
- `/cms/media`
- `/cms/categories`
- `/cms/tags`
- `/cms/pages`
- `/cms/web-stories`
- `/cms/comments`
- `/cms/users`
- `/cms/roles`
- `/cms/seo/routes`
- `/cms/seo/metadata`
- `/cms/seo/redirects`
- `/cms/seo/url-inventory`
- `/cms/imports`
- `/cms/ads/slots`
- `/cms/ads/campaigns`
- `/cms/newsletter`
- `/cms/orders`
- `/cms/payments`
- `/cms/settings`
- `/cms/audit-logs`

### Portal Cliente

Rutas sugeridas:

- `/cuenta`
- `/cuenta/perfil`
- `/cuenta/planes`
- `/cuenta/creditos`
- `/cuenta/publicaciones`
- `/cuenta/publicaciones/nueva`
- `/cuenta/publicaciones/{id}`
- `/cuenta/pagos`
- `/cuenta/seguridad`

## Flujo 1: Publicacion Editorial Interna

Tablas principales:

- `posts`
- `post_revisions`
- `editorial_reviews`
- `post_categories`
- `post_tags`
- `media_assets`
- `routes`
- `seo_metadata`
- `audit_logs`

Estados:

```txt
DRAFT
-> PENDING_REVIEW
-> NEEDS_CHANGES
-> PENDING_REVIEW
-> PUBLISHED
```

Variantes:

```txt
DRAFT -> SCHEDULED -> PUBLISHED
DRAFT -> REJECTED
PUBLISHED -> ARCHIVED
```

Pantallas:

### `/cms/posts`

Funcion:

- listar contenido editorial.
- filtrar por status, author, category, date, post_type, visibility.
- buscar por titulo o slug.

Acciones:

- crear post.
- abrir post.
- enviar a revision.
- duplicar.
- archivar.
- ver URL publica.

Data:

- post summary.
- author.
- primary category.
- status.
- published_at.
- updated_at.
- seo health.
- route path.

### `/cms/posts/new`

Funcion:

- crear draft.

Campos:

- title.
- slug sugerido.
- excerpt.
- content editor.
- featured media.
- categories.
- tags.
- post_type.
- visibility.
- publish schedule.

Acciones:

- guardar draft.
- preview.
- enviar a revision.

Regla:

- no debe crear ruta publica indexable hasta estar publicado, pero si puede reservar slug.

### `/cms/posts/{id}`

Funcion:

- editar articulo.
- ver estado editorial.
- administrar SEO.
- administrar media.
- ver revisiones.

Secciones:

- contenido.
- taxonomia.
- media.
- SEO.
- social preview.
- revisions.
- audit trail.

Acciones:

- guardar.
- preview.
- enviar a revision.
- publicar.
- programar.
- archivar.

Al publicar:

- `posts.status = PUBLISHED`.
- `published_at` se asigna si no existe.
- `routes.path` queda activo.
- `seo_metadata` queda completo.
- sitemap incluye la ruta si corresponde.

### `/cms/reviews`

Funcion:

- cola editorial.

Filtros:

- pending.
- needs changes.
- rejected.
- external submissions.
- sponsored.

Acciones:

- aprobar.
- pedir cambios.
- rechazar.
- asignar reviewer.

### `/cms/reviews/{postId}`

Funcion:

- revisar contenido con contexto.

Paneles:

- contenido.
- diff/revision.
- notas editoriales.
- SEO basico.
- historial.

Acciones:

- aprobar.
- publicar.
- pedir cambios.
- rechazar con motivo.

## Flujo 2: Publicacion Externa / Cliente

Tablas principales:

- `users`
- `publication_plans`
- `orders`
- `payments`
- `user_publication_credits`
- `posts`
- `editorial_reviews`
- `audit_logs`

Estados comerciales:

```txt
order PENDING -> PAID
payment PENDING -> SUCCEEDED
credit ACTIVE -> CONSUMED
```

Estados editoriales:

```txt
DRAFT -> PENDING_REVIEW -> NEEDS_CHANGES -> PENDING_REVIEW -> PUBLISHED
```

Pantallas cliente:

### `/cuenta/planes`

Funcion:

- mostrar planes disponibles.
- explicar cuotas y vigencia.

Data:

- plan name.
- price_amount.
- currency.
- post_quota.
- validity_days.
- is_popular.

Acciones:

- elegir plan.
- ir a checkout.

### `/checkout`

Funcion:

- procesar orden/pago.

Data:

- order.
- order_items.
- payment status.
- user.

SEO:

- `NOINDEX`.
- fuera de sitemap.

### `/cuenta/creditos`

Funcion:

- mostrar creditos disponibles y vencimiento.

Data:

- total_credits.
- used_credits.
- remaining credits.
- starts_at.
- expires_at.
- status.

### `/cuenta/publicaciones/nueva`

Funcion:

- permitir crear contenido externo.

Reglas:

- requiere usuario activo.
- requiere credito activo.
- si no hay creditos, enviar a planes.
- submission queda en `PENDING_REVIEW`.

Campos:

- title.
- excerpt.
- content.
- image.
- category.
- tags.

### `/cuenta/publicaciones/{id}`

Funcion:

- ver estado de submission.
- editar si esta en draft o needs changes.
- ver notas del editor.

Acciones:

- reenviar a revision.
- cancelar draft.

## Flujo 3: SEO, Rutas y Redirects

Tablas principales:

- `routes`
- `seo_metadata`
- `url_inventory`
- `redirects`
- `import_runs`
- `import_mappings`

Regla central:

Toda pantalla publica debe resolverse desde `routes`.

### `/cms/seo/routes`

Funcion:

- ver todas las URLs publicas.
- validar que entidad renderiza cada ruta.

Columnas:

- path.
- entity_type.
- status.
- http_status.
- canonical.
- include_in_sitemap.
- lastmod_at.

Acciones:

- abrir entidad.
- editar SEO.
- marcar noindex.
- crear redirect.
- ver preview publica.

### `/cms/seo/metadata`

Funcion:

- editar metadata de una ruta.

Campos:

- title.
- description.
- canonical_url.
- robots_index.
- robots_follow.
- og_title.
- og_description.
- og_image.
- twitter card.
- schema_json.

Regla:

- si viene de WordPress/Yoast, mantener `yoast_head_json` como referencia.

### `/cms/seo/redirects`

Funcion:

- crear y administrar 301/302/410.

Campos:

- source_path.
- target_url.
- status_code.
- preserve_query.
- source.
- is_active.

Acciones:

- probar redirect.
- activar/desactivar.
- ver hit count.

### `/cms/seo/url-inventory`

Funcion:

- ver URLs descubiertas por sitemap, WordPress, Search Console o logs.
- detectar URLs no migradas.

Estados utiles:

- discovered.
- matched route.
- needs redirect.
- ignored.
- gone.

Acciones:

- asociar a route.
- crear redirect.
- marcar como gone.

## Flujo 4: Media Library

Tablas principales:

- `media_assets`
- `media_variants`

Pantalla:

### `/cms/media`

Funcion:

- administrar imagenes y archivos.

Data:

- url.
- path.
- original_url.
- mime_type.
- file_name.
- file_size.
- width.
- height.
- alt_text.
- caption.
- credit.
- variants.
- legacy_wordpress_id.

Acciones:

- subir.
- buscar.
- editar alt/caption/credit.
- seleccionar para post.
- ver variantes.

Regla SEO:

- alt text debe ser editable.
- imagen OG puede venir de media o URL legacy.

## Flujo 5: Categorias y Tags

Tablas:

- `categories`
- `tags`
- `post_categories`
- `post_tags`
- `routes`
- `seo_metadata`

Pantallas:

### `/cms/categories`

Funcion:

- administrar arbol de categorias.

Data:

- name.
- slug.
- full_path.
- parent.
- description.
- show_in_menu.
- show_on_home.
- legacy_wordpress_id.

Acciones:

- crear.
- editar.
- reordenar.
- definir parent.
- editar SEO.
- ver URL publica.

Regla:

- categorias publicas deben tener route y metadata.

### `/cms/tags`

Funcion:

- administrar etiquetas.

Regla:

- decidir si tags indexan o no. Por defecto, revisar caso por caso.

## Flujo 6: Paginas Estaticas

Tablas:

- `pages`
- `routes`
- `seo_metadata`

Pantallas:

### `/cms/pages`

Funcion:

- administrar paginas como contacto, privacidad, politicas, suscripcion.

Acciones:

- crear.
- editar.
- publicar.
- archivar.
- editar SEO.

Regla:

- paginas como `/contact/` y `/privacy-policy/` deben vivir en raiz si asi existian en WordPress.
- paginas de prueba deben ser noindex o no migrarse.

## Flujo 7: Comentarios

Tablas:

- `comments`
- `posts`
- `users`

Pantalla:

### `/cms/comments`

Funcion:

- moderar comentarios.

Estados:

```txt
PENDING -> APPROVED
PENDING -> SPAM
APPROVED -> TRASHED
```

Acciones:

- aprobar.
- responder si se implementa.
- marcar spam.
- eliminar/trash.
- filtrar por post.

## Flujo 8: Ads

Tablas:

- `ad_slots`
- `ads`
- `ad_events`
- `media_assets`

Pantallas:

### `/cms/ads/slots`

Funcion:

- definir espacios publicitarios.

Campos:

- name.
- code.
- location.
- width.
- height.
- is_active.

### `/cms/ads/campaigns`

Funcion:

- administrar anuncios.

Campos:

- slot.
- media.
- title.
- target_url.
- sponsor_name.
- starts_at.
- ends_at.
- status.

Acciones:

- activar.
- pausar.
- expirar.
- ver clicks/impressions.

Regla UI:

- cada slot debe reservar dimensiones para evitar CLS.

## Flujo 9: Newsletter

Tabla:

- `newsletter_subscribers`

Pantalla:

### `/cms/newsletter`

Funcion:

- ver suscriptores.
- filtrar por estado.
- exportar si se permite.

Estados:

```txt
ACTIVE
UNSUBSCRIBED
BOUNCED
COMPLAINED
```

Acciones:

- buscar email.
- marcar unsubscribed.
- revisar source.

## Flujo 10: Usuarios, Roles y Seguridad

Tablas:

- `users`
- `user_profiles`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `user_sessions`
- `password_reset_tokens`
- `email_verification_tokens`

Pantallas:

### `/cms/users`

Funcion:

- administrar usuarios.

Acciones:

- crear.
- suspender.
- reactivar.
- asignar roles.
- ver sesiones.
- abrir perfil.

### `/cms/roles`

Funcion:

- administrar roles y permisos.

Regla:

- solo Super Admin.

## Flujo 11: Orders, Payments y Creditos

Tablas:

- `publication_plans`
- `orders`
- `order_items`
- `payments`
- `user_publication_credits`

Pantallas:

### `/cms/orders`

Funcion:

- ver ordenes.

Estados:

```txt
PENDING
PAID
CANCELLED
REFUNDED
```

### `/cms/payments`

Funcion:

- auditar pagos.

Estados:

```txt
PENDING
SUCCEEDED
FAILED
REFUNDED
```

### `/cms/plans`

Funcion:

- administrar planes de publicacion.

Campos:

- name.
- code.
- price_amount.
- currency.
- post_quota.
- validity_days.
- is_active.
- is_popular.

## Flujo 12: Settings y Audit Logs

Tablas:

- `site_settings`
- `audit_logs`

Pantallas:

### `/cms/settings`

Funcion:

- configurar identidad global del sitio.

Secciones:

- branding.
- redes sociales.
- SEO global.
- newsletter.
- menus.
- integraciones.

### `/cms/audit-logs`

Funcion:

- ver acciones importantes del sistema.

Data:

- actor.
- action.
- entity_type.
- entity_id.
- metadata.
- created_at.

Regla:

- solo Super Admin o rol autorizado.

## Dashboard CMS

Ruta:

```txt
/cms
```

Debe mostrar widgets por rol.

### Para Director Editorial

- posts pendientes.
- programados.
- publicados hoy.
- submissions externas.
- top posts.
- errores SEO criticos.

### Para Redactor

- mis borradores.
- cambios solicitados.
- mis publicados.

### Para SEO Manager

- URLs sin metadata.
- redirects recientes.
- 404 detectados.
- rutas fuera de sitemap.
- inventario no migrado.

### Para Ads Manager

- campanas activas.
- anuncios por expirar.
- clicks/impressions.

### Para Finance

- pagos pendientes.
- ordenes pagadas.
- refunds.

## Flujo Publico de Render

Cuando un usuario o Google pide una URL:

```txt
request path
-> resolveRoute(path)
-> si redirect: responder 301/302
-> si gone: responder 410
-> si no existe: responder 404
-> cargar entity segun route.entity_type
-> cargar seo_metadata
-> render HTML inicial
-> incluir JSON-LD si aplica
```

Reglas:

- post publicado y publico: indexable salvo `NOINDEX`.
- busqueda: noindex.
- login/checkout/cuenta: noindex.
- drafts: no route publica indexable.
- archived: segun decision, 404/410/redirect/noindex.

## Dependencias entre Pantallas

No se debe construir:

- articulo publico antes de `routes` + `seo_metadata`.
- categorias antes de tener `categories.full_path`.
- home antes de definir `featured_posts`, `breaking_posts`, `category_sections`.
- checkout antes de `orders`, `payments`, `credits`.
- crear publicacion antes de planes/creditos.
- ads UI antes de definir `ad_slots`.

## Proxima Decision Necesaria

Antes de implementar, decidir:

- si `/cms` vive dentro de la misma app Next o como app separada.
- si portal cliente vive en `/cuenta` o integrado con `/perfil`.
- si busqueda publica sera `/?s=query` para compatibilidad WordPress o `/buscar?q=query`.
- si tags seran indexables.
- si web stories se reconstruyen o se redirigen.
- si productos WooCommerce se migran como productos o se redirigen a planes.
