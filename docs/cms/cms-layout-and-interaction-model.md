# CMS Layout and Interaction Model

Este documento define la estructura funcional del CMS y del portal operativo. No es una guia visual final; es el mapa de layout, navegacion, paneles y patrones de interaccion que deben existir para soportar los flujos definidos en [cms-product-flow-and-screen-map.md](cms-product-flow-and-screen-map.md).

## Principios de Layout

El CMS debe sentirse:

- rapido.
- denso pero claro.
- editorial.
- seguro.
- orientado a tareas.

Debe evitar:

- parecer landing page.
- usar heroes decorativos.
- esconder acciones importantes.
- depender de modales para todo.
- mezclar CMS interno con web publica.

## Estructura Base del CMS

Layout recomendado:

```txt
Topbar
Sidebar izquierda
Content area
Panel derecho contextual opcional
Toast/notifications
Command/search overlay opcional
```

### Topbar

Contenido:

- logo compacto.
- nombre del modulo actual.
- buscador global.
- boton crear rapido.
- notificaciones.
- usuario actual.
- ambiente: local/staging/production.

Acciones:

- crear post.
- abrir busqueda global.
- ver sitio publico.
- logout.

### Sidebar Izquierda

Secciones:

- Dashboard.
- Editorial.
- Media.
- Taxonomia.
- SEO.
- Comercial.
- Ads.
- Newsletter.
- Usuarios.
- Sistema.

Navegacion sugerida:

```txt
Dashboard

Editorial
- Posts
- Reviews
- Calendar
- Pages
- Web Stories
- Comments

Media
- Library

Taxonomia
- Categories
- Tags

SEO
- Routes
- Metadata
- Redirects
- URL Inventory
- Imports

Comercial
- Plans
- Orders
- Payments
- Credits

Ads
- Slots
- Campaigns
- Events

Newsletter
- Subscribers

Usuarios
- Users
- Roles

Sistema
- Settings
- Audit Logs
```

La sidebar debe filtrar opciones segun permisos del usuario.

### Content Area

Debe adaptarse por tipo de pantalla:

- dashboard.
- tabla/listado.
- editor.
- detalle.
- configuracion.
- revision.

### Panel Derecho Contextual

Usos:

- SEO summary.
- publication status.
- route/canonical.
- author info.
- ad preview.
- payment summary.
- audit trail.

Regla:

- no debe ser obligatorio en mobile; en mobile se convierte en tabs o drawer.

## Patrones de Pantalla

### Pattern A: Dashboard

Usado por:

- `/cms`

Layout:

```txt
Header de modulo
Metric cards
Primary task queues
Secondary widgets
Recent activity
```

Widgets:

- pending reviews.
- scheduled posts.
- SEO warnings.
- active ads.
- pending payments.
- recent comments.

### Pattern B: Resource List

Usado por:

- posts.
- pages.
- media.
- categories.
- users.
- redirects.
- orders.
- ads.

Layout:

```txt
Header
Toolbar
Filter bar
Table/list
Pagination
Bulk actions
```

Header:

- title.
- description corta.
- primary action.

Toolbar:

- search.
- filters.
- saved views.
- export si aplica.

Table:

- columnas estables.
- row actions.
- status badge.
- updated_at.

Bulk actions:

- archive.
- publish.
- assign.
- approve.
- trash.

### Pattern C: Editor Workspace

Usado por:

- post editor.
- page editor.
- web story editor.

Layout desktop:

```txt
Top editor bar
Main editor column
Right settings panel
Bottom revision/audit section
```

Top editor bar:

- status.
- save.
- preview.
- send to review.
- publish/schedule.
- more actions.

Main editor column:

- title.
- slug.
- excerpt.
- content editor.
- media embeds.

Right panel tabs:

- Publish.
- Categories.
- Tags.
- Featured image.
- SEO.
- Social.
- History.

Mobile:

- main editor first.
- settings as tabs/drawer.

### Pattern D: Review Workspace

Usado por:

- editorial review.
- external submission review.

Layout:

```txt
Post preview
Review decision panel
Notes/history
SEO warnings
```

Decision panel:

- approve.
- needs changes.
- reject.
- publish now.
- schedule.

Required when rejecting:

- rejection_reason.

Required when needs changes:

- notes.

### Pattern E: SEO Detail

Usado por:

- route detail.
- metadata edit.
- redirect edit.

Layout:

```txt
Route identity
SEO form
SERP preview
Social preview
Schema viewer
Validation panel
```

Validation examples:

- missing title.
- title too long.
- missing description.
- canonical mismatch.
- no OG image.
- no route.
- route excluded from sitemap.

### Pattern F: Commerce Detail

Usado por:

- order detail.
- payment detail.
- credit detail.

Layout:

```txt
Summary header
Status timeline
Line items
Payment data
User/customer panel
Audit trail
```

### Pattern G: Settings

Usado por:

- site settings.
- roles/permissions.
- integrations.

Layout:

```txt
Settings sidebar
Settings form
Save bar
Danger zone
```

## CMS Screen Specifications

### `/cms/posts`

Pattern:

- Resource List.

Primary action:

- New post.

Filters:

- status.
- post_type.
- author.
- category.
- visibility.
- date range.
- SEO issue.

Row actions:

- edit.
- preview.
- view public.
- duplicate.
- archive.

Columns:

- title.
- status.
- author.
- primary category.
- route.
- published_at.
- updated_at.
- SEO.

### `/cms/posts/{id}`

Pattern:

- Editor Workspace.

Critical UI:

- status chip.
- unsaved changes indicator.
- preview button.
- publish controls.
- SEO health.
- route path.

Tabs/right panel:

- Publish.
- Taxonomy.
- Media.
- SEO.
- Social.
- Revisions.

### `/cms/reviews`

Pattern:

- Resource List.

Views:

- pending.
- needs changes.
- external submissions.
- sponsored.
- rejected.

Actions:

- open review.
- assign reviewer.
- quick approve if permitted.

### `/cms/reviews/{postId}`

Pattern:

- Review Workspace.

Required:

- content preview.
- author/submitter.
- notes.
- decision.
- status timeline.

### `/cms/media`

Pattern:

- Resource List with grid mode.

Views:

- grid.
- list.

Actions:

- upload.
- edit metadata.
- select.
- copy URL.
- view variants.

Fields:

- alt_text.
- caption.
- credit.
- original_url.
- dimensions.

### `/cms/categories`

Pattern:

- Resource List plus tree.

Layout:

```txt
Category tree left
Category detail right
```

Actions:

- create child.
- edit slug.
- edit full_path.
- show in menu.
- show on home.
- edit SEO.

### `/cms/seo/routes`

Pattern:

- Resource List.

Filters:

- entity_type.
- status.
- include_in_sitemap.
- http_status.
- missing metadata.

Row actions:

- edit metadata.
- open entity.
- view public.
- create redirect.

### `/cms/seo/redirects`

Pattern:

- Resource List.

Actions:

- create redirect.
- test redirect.
- disable.
- view hits.

Validation:

- no redirect chains.
- no loops.
- source_path unique.

### `/cms/ads/campaigns`

Pattern:

- Resource List.

Views:

- active.
- paused.
- expired.
- draft.

Detail panel:

- creative preview.
- slot.
- target_url.
- schedule.
- metrics.

### `/cms/orders`

Pattern:

- Resource List.

Filters:

- status.
- date.
- user.
- plan.

Row actions:

- open order.
- view payment.
- refund if permitted.

## Portal Cliente Layout

El portal cliente debe ser mas simple que el CMS.

Layout:

```txt
Account topbar
Simple sidebar
Content area
Status cards
```

Sidebar:

- Resumen.
- Perfil.
- Planes.
- Creditos.
- Mis publicaciones.
- Pagos.
- Seguridad.

### `/cuenta`

Debe mostrar:

- creditos disponibles.
- publicaciones en revision.
- publicaciones publicadas.
- pagos recientes.
- CTA crear publicacion.

### `/cuenta/publicaciones`

Debe mostrar:

- lista de submissions.
- estado editorial.
- fecha.
- notas si existen.

### `/cuenta/publicaciones/nueva`

Debe mostrar:

- creditos disponibles.
- formulario.
- reglas editoriales.
- preview.

### `/cuenta/publicaciones/{id}`

Debe mostrar:

- contenido enviado.
- estado.
- timeline.
- notas del editor.
- acciones permitidas.

## Web Publica Layout Relacionado

Aunque el CMS sea interno, sus datos alimentan layouts publicos.

### Header Publico

Data:

- menus.
- categories show_in_menu.
- logo.
- search.
- auth CTA opcional.

### Home Publica

Data desde CMS:

- featured posts.
- breaking posts.
- latest posts.
- sections by category.
- ads.
- newsletter.

### Articulo Publico

Data desde CMS:

- post detail.
- author.
- media.
- SEO.
- categories/tags.
- related posts.
- ads.

### Categoria Publica

Data desde CMS:

- category.
- posts.
- children.
- SEO.
- pagination.

## Estados Globales de UI

Todo modulo debe contemplar:

- loading.
- empty.
- error.
- permission denied.
- unsaved changes.
- deleted/archived.
- network failure.
- validation error.
- optimistic update failed.

## Permisos y Acciones

Cada boton importante debe depender de permisos.

Ejemplos:

- `post:create`
- `post:update`
- `post:publish`
- `post:review`
- `post:archive`
- `seo:update`
- `redirect:create`
- `user:manage`
- `role:manage`
- `payment:refund`
- `ad:manage`
- `settings:update`

Regla:

- ocultar acciones imposibles.
- deshabilitar acciones no permitidas con tooltip si aporta claridad.
- registrar acciones sensibles en `audit_logs`.

## Notificaciones

Tipos:

- success.
- warning.
- error.
- info.

Eventos que notifican:

- post saved.
- post sent to review.
- changes requested.
- post published.
- redirect created.
- payment succeeded.
- ad expired.
- SEO validation failed.

## Preview

Tipos de preview:

- post preview.
- social preview.
- SERP preview.
- ad preview.
- route preview.

Reglas:

- preview de post no debe indexar.
- preview puede usar token temporal.
- preview debe respetar contenido actual no publicado.

## Audit Trail en UI

Mostrar audit trail en:

- post detail.
- route detail.
- redirect detail.
- user detail.
- payment detail.
- settings.

Data:

- actor.
- action.
- entity.
- timestamp.
- metadata.

## Responsive

Desktop:

- sidebar persistente.
- panel derecho contextual.
- tablas densas.

Tablet:

- sidebar colapsable.
- panel derecho como drawer.

Mobile:

- top nav.
- acciones principales arriba.
- filtros en drawer.
- tablas convertidas en cards.

## Criterio de Listo para Diseno

Antes de disenar una pantalla en detalle, debe existir:

- ruta.
- rol principal.
- permisos.
- tabla(s) base.
- data requerida.
- acciones.
- estados.
- layout pattern.
- SEO/indexacion si es publica.
- audit log si aplica.

## Componentes CMS Reutilizables

- `CmsShell`.
- `CmsTopbar`.
- `CmsSidebar`.
- `ResourceHeader`.
- `ResourceToolbar`.
- `FilterBar`.
- `DataTable`.
- `StatusBadge`.
- `PermissionGate`.
- `ContextPanel`.
- `SeoPreview`.
- `SocialPreview`.
- `AuditTrail`.
- `RevisionTimeline`.
- `PublishControls`.
- `MediaPicker`.
- `AdSlotPreview`.
- `EmptyState`.
- `ConfirmDialog`.
- `UnsavedChangesGuard`.

## Decision Principal de Layout

El CMS debe priorizar operacion y claridad. La identidad hacker puede existir en branding, iconografia, acentos rojos y microcopy puntual, pero el flujo interno debe ser utilitario. El sitio publico puede expresar mas marca; el CMS debe ayudar al equipo a trabajar rapido y sin errores.
