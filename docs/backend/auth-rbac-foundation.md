# Auth y roles - base v0.1

Esta fase deja una base real de autenticacion para el CMS y la API, conectada a PostgreSQL por Prisma.

## Alcance implementado

- Passwords hasheados con Argon2id.
- Access tokens JWT firmados con HS256 y expiracion corta.
- Refresh tokens aleatorios, guardados solo como hash SHA-256 con pepper del secreto JWT.
- Sesiones revocables en `user_sessions`.
- Roles y permisos desde DB:
  - `ADMIN`
  - `EDITOR`
  - `AUTHOR`
  - `MEMBER`
- Eventos de seguridad en `security_events` para login, logout e intentos fallidos.
- Bloqueo temporal configurable por intentos fallidos.
- Middleware Fastify:
  - `app.authenticate`
  - `app.requireRole`
  - `app.requirePermission`
- Permisos efectivos refrescados desde DB en cada request protegida. El token identifica al usuario, pero la autorizacion usa los roles actuales de la base de datos.
- Cookies HTTP-only `hes_access_token` y `hes_refresh_token` emitidas desde login/refresh.
- Pantalla `/iniciar-sesion` conectada al endpoint real de Fastify.
- Middleware de Next para bloquear `/cms/*` si no existe access token valido con rol `ADMIN` o `EDITOR`.

## Variables requeridas

```bash
AUTH_JWT_SECRET="minimo-32-caracteres-y-debe-ser-secreto"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
AUTH_ACCESS_TOKEN_TTL_SECONDS="900"
AUTH_REFRESH_TOKEN_TTL_DAYS="30"
AUTH_COOKIE_SECURE="false"
AUTH_MAX_LOGIN_ATTEMPTS="5"
AUTH_LOCKOUT_MINUTES="15"
ADMIN_EMAIL="admin@hackeando.local"
ADMIN_PASSWORD="cambiar-por-password-fuerte"
```

En produccion:

- `AUTH_JWT_SECRET` debe salir de un gestor de secretos.
- `AUTH_COOKIE_SECURE` debe ser `true` cuando se usen cookies HTTPS.
- `ADMIN_PASSWORD` no debe quedar compartido en chats, docs ni commits.

## Endpoints

### `POST /api/v1/auth/login`

Body:

```json
{
  "email": "admin@hackeando.local",
  "password": "password-fuerte"
}
```

Ademas, el endpoint emite cookies HTTP-only para que Next pueda proteger rutas internas del CMS.

Respuesta:

```json
{
  "data": {
    "user": {
      "email": "admin@hackeando.local",
      "roles": ["ADMIN"],
      "permissions": ["cms:read", "cms:write", "users:manage", "posts:manage", "seo:manage"]
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### `GET /api/v1/auth/me`

Requiere header:

```http
Authorization: Bearer ACCESS_TOKEN
```

### `GET /api/v1/auth/admin-check`

Requiere rol `ADMIN` o `EDITOR`.

### `GET /api/v1/cms/summary`

Requiere permiso `cms:read`.

Devuelve datos privados del panel:

```json
{
  "data": {
    "viewer": { "email": "admin@hackeando.local", "roles": ["ADMIN"] },
    "counts": {
      "posts": 8350,
      "routes": 8709,
      "users": 7,
      "sessions": 1
    },
    "editorial": {
      "published": 8350,
      "drafts": 0,
      "pendingReview": 0,
      "scheduled": 0
    },
    "recentPosts": [],
    "securityEvents": []
  }
}
```

### `GET /api/v1/cms/audit-logs`

Requiere permiso `cms:read`.

Alimenta `/cms/auditoria`.

Query params:

```http
page=1
limit=20
action=POST_CONTENT_UPDATED
entityType=POST
```

Devuelve acciones auditadas con actor, entidad, metadata y fecha. Sirve para verificar cambios editoriales, SEO y workflow.

### `GET /api/v1/cms/posts`

Requiere permiso `cms:read`.

Query params:

```http
page=1
limit=20
status=PUBLISHED
q=texto
```

Estados aceptados:

```text
DRAFT, PENDING_REVIEW, NEEDS_CHANGES, REJECTED, SCHEDULED, PUBLISHED, ARCHIVED
```

Este endpoint alimenta `/cms/publicaciones` y devuelve publicaciones con autor, categoria primaria, estado, visibilidad, fecha de actualizacion y metricas basicas.

### `POST /api/v1/cms/posts`

Requiere permiso `posts:manage`.

Crea un borrador seguro para `/cms/publicaciones/nueva`:

```json
{
  "title": "Titulo del borrador",
  "slug": "slug-opcional",
  "excerpt": "Resumen",
  "contentText": "Texto plano",
  "postType": "NEWS",
  "visibility": "PUBLIC"
}
```

Comportamiento SEO seguro por defecto:

- `status`: `DRAFT`.
- ruta creada como `GONE` con `httpStatus` 404.
- `includeInSitemap`: `false`.
- SEO inicial con `robotsIndex`: `NOINDEX`.
- contenido HTML generado desde texto plano escapado.
- auditoria `POST_DRAFT_CREATED`.

### `PATCH /api/v1/cms/posts/:id`

Requiere permiso `posts:manage`.

Edita contenido de borradores y estados no publicados editables:

```text
DRAFT, NEEDS_CHANGES, REJECTED
```

Campos:

```json
{
  "title": "Titulo actualizado",
  "excerpt": "Resumen",
  "contentText": "Texto plano actualizado",
  "postType": "NEWS",
  "visibility": "PUBLIC"
}
```

No cambia slug ni ruta. Rechaza ediciones sobre `PUBLISHED`, `SCHEDULED`, `PENDING_REVIEW` o `ARCHIVED`. Cada cambio registra auditoria `POST_CONTENT_UPDATED`.

### `PATCH /api/v1/cms/posts/:id/workflow`

Requiere permiso `posts:manage`.

Acciones:

```json
{ "action": "SUBMIT_REVIEW" }
{ "action": "RETURN_TO_DRAFT" }
{ "action": "PUBLISH" }
{ "action": "ARCHIVE" }
```

Reglas importantes:

- `SUBMIT_REVIEW`: pasa a `PENDING_REVIEW`, mantiene ruta cerrada.
- `RETURN_TO_DRAFT`: vuelve a `DRAFT`.
- `PUBLISH`: pasa a `PUBLISHED`, activa ruta `ACTIVE`, `httpStatus` 200, `includeInSitemap` true y SEO `INDEX / FOLLOW`.
- `ARCHIVE`: pasa a `ARCHIVED`, ruta `GONE`, `httpStatus` 410, `includeInSitemap` false y SEO `NOINDEX / NOFOLLOW`.
- Cada accion registra auditoria `POST_{ACTION}`.

### `GET /api/v1/cms/posts/:id`

Requiere permiso `cms:read`.

Devuelve el detalle protegido para `/cms/publicaciones/[id]`:

- contenido HTML y texto plano.
- autor y revisor.
- categoria primaria, categorias y tags.
- featured media.
- ruta publica, canonical, sitemap y metadata SEO.
- WordPress ID, legacy URL e import mapping.

### `PATCH /api/v1/cms/posts/:id/seo`

Requiere permiso `seo:manage`.

Actualiza metadata SEO sin cambiar slug ni rutas heredadas:

```json
{
  "title": "Titulo SEO",
  "description": "Descripcion SEO",
  "canonicalUrl": "https://hackeandoelsistema.net/ruta/",
  "robotsIndex": "INDEX",
  "robotsFollow": "FOLLOW"
}
```

Cada cambio registra auditoria en `audit_logs` con accion `POST_SEO_UPDATED`.

### `POST /api/v1/auth/refresh`

Rota el refresh token. El token anterior queda revocado. Puede recibir `refreshToken` en body o usar la cookie HTTP-only `hes_refresh_token`.

### `POST /api/v1/auth/logout`

Revoca el refresh token activo y limpia cookies de sesion. Puede recibir `refreshToken` en body o usar la cookie HTTP-only `hes_refresh_token`.

## Crear admin local

```bash
npm run auth:seed-admin
```

El script crea roles, permisos y el usuario admin definido por `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Prueba manual local

```powershell
$body = @{ email='admin@hackeando.local'; password='AdminDev123!ChangeMe' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/auth/login" -ContentType "application/json" -Body $body
$token = $login.data.accessToken
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/admin-check" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/cms/summary" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/cms/audit-logs?page=1&limit=5" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/cms/posts?status=PUBLISHED&page=1&limit=5" -Headers @{ Authorization = "Bearer $token" }
$draftPayload = @{ title='Borrador de prueba'; excerpt='Resumen'; contentText='Texto plano' } | ConvertTo-Json
$draft = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/v1/cms/posts" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $draftPayload
$updateDraftPayload = @{ title='Borrador actualizado'; excerpt='Resumen actualizado'; contentText='Texto actualizado' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/cms/posts/$($draft.data.post.id)" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $updateDraftPayload
Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/cms/posts/$($draft.data.post.id)/workflow" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{ action='SUBMIT_REVIEW' } | ConvertTo-Json)
$firstPost = (Invoke-RestMethod -Uri "http://localhost:4000/api/v1/cms/posts?status=PUBLISHED&page=1&limit=1" -Headers @{ Authorization = "Bearer $token" }).data[0]
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/cms/posts/$($firstPost.id)" -Headers @{ Authorization = "Bearer $token" }
$seoPayload = @{ title='Titulo SEO'; description='Descripcion SEO'; robotsIndex='INDEX'; robotsFollow='FOLLOW' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:4000/api/v1/cms/posts/$($firstPost.id)/seo" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $seoPayload
```

## Siguiente capa

- Usar refresh automatico desde frontend cuando expire el access token.
- Separar permisos finos por modulo CMS cuando las pantallas reales esten definidas.
- Agregar MFA para roles administrativos.
