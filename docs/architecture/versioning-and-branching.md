# Versionamiento y Convencion de Ramas

Este proyecto debe manejarse con ramas pequenas, prefijos claros y commits descriptivos. La meta es que cada cambio diga rapidamente que area toca, que problema resuelve y en que etapa del producto vive.

## Rama Principal

`main`

- Debe representar el estado estable del proyecto.
- No se trabaja directo sobre `main`.
- Todo cambio entra por rama y, preferiblemente, por PR/revision.

## Formato de Rama

```txt
<tipo>/<area>/<descripcion-corta>-v<version>
```

Ejemplos:

```txt
docs/arch/seo-safe-migration-v0.1
feature/db/prisma-schema-core-v0.1
feature/api/fastify-routes-resolver-v0.1
feature/web/home-editorial-redesign-v0.1
feature/seo/sitemap-redirects-v0.1
fix/seo/article-canonical-v0.1
chore/deps/normalize-lockfile-v0.1
```

## Tipos de Cambio

`feature/`

- Nueva funcionalidad.
- Nueva pantalla.
- Nuevo endpoint.
- Nuevo flujo de negocio.

`fix/`

- Correccion de bug.
- Correccion de SEO.
- Correccion visual o funcional.

`docs/`

- Documentacion.
- Diagramas.
- Requisitos.
- Decisiones de arquitectura escritas.

`chore/`

- Configuracion.
- Tooling.
- Dependencias.
- Cambios mecanicos sin impacto funcional directo.

`refactor/`

- Reorganizacion interna sin cambiar comportamiento.
- Limpieza de componentes.
- Separacion de modulos.

`test/`

- Tests unitarios.
- Tests de integracion.
- QA automatizado.

`hotfix/`

- Correccion urgente sobre produccion.

`release/`

- Preparacion de version.
- Ajustes finales de release.
- Tags, changelog o versionado.

## Areas

`arch/`

- Arquitectura general.
- Documentacion tecnica.
- Decisiones de stack.
- Contratos entre frontend, backend y DB.

`db/`

- Prisma schema.
- Migraciones de base de datos.
- Seeds.
- Indices.
- Modelos PostgreSQL.

`api/`

- Fastify.
- Endpoints.
- Auth.
- Integraciones backend.
- Servicios internos.

`web/`

- Frontend Next.
- Pantallas publicas.
- Componentes visuales.
- Layouts.
- Interacciones de usuario.

`seo/`

- Sitemaps.
- Robots.
- Canonicals.
- Metadata.
- JSON-LD.
- Redirects.
- Inventario de URLs.

`cms/`

- Admin editorial.
- Flujos de redaccion.
- Revision/publicacion.
- Media library.

`auth/`

- Login.
- Registro.
- Recuperacion.
- Sesiones.
- Roles/permisos.

`payments/`

- Planes.
- Ordenes.
- Checkout.
- Pagos.
- Creditos de publicacion.

`migration/`

- Importadores desde WordPress.
- Scripts de export/import.
- Limpieza de contenido legacy.
- Mapeos de URLs.

## Versiones de Rama

Usar `v0.1`, `v0.2`, `v1.0`, etc. para marcar etapas de trabajo, no releases publicos necesariamente.

- `v0.x`: exploracion, arquitectura, prototipos, base inicial.
- `v1.0`: primera version funcional para staging.
- `v1.x`: mejoras incrementales despues de staging.

Ejemplo:

```txt
feature/web/article-page-v0.1
feature/web/article-page-v0.2
feature/web/article-page-v1.0
```

## Commits

Usar commits tipo Conventional Commits:

```txt
feat(web): add editorial home layout
feat(api): add route resolver endpoint
feat(db): add seo metadata models
fix(seo): preserve canonical for legacy posts
docs(arch): document frontend data requirements
chore(deps): update lockfile
```

Scopes recomendados:

- `arch`
- `db`
- `api`
- `web`
- `seo`
- `cms`
- `auth`
- `payments`
- `migration`
- `docs`
- `deps`

## Regla Practica

Una rama debe resolver una cosa concreta.

Bien:

```txt
feature/seo/url-inventory-import-v0.1
feature/web/article-page-v0.1
feature/api/auth-session-v0.1
fix/seo/article-canonical-v0.1
docs/arch/frontend-data-contract-v0.1
```

Evitar:

```txt
updates
new-stuff
frontend-final
changes
```

## Rama Actual

```txt
docs/arch/seo-safe-migration-v0.1
```

Proposito:

- Definir el modelo de datos SEO-safe.
- Documentar necesidades de data para frontend.
- Auditar el frontend actual.
- Alinear arquitectura Next/Fastify/Prisma antes de implementar.
