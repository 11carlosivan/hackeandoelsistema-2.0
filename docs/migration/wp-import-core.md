# Importador core de WordPress

Esta fase agrega el importador core con dos modos:

- Sin `--write`: genera el mismo plan seguro del dry-run y no toca PostgreSQL.
- Con `--write`: escribe datos core en Prisma/PostgreSQL usando upserts idempotentes.

## Comandos

Dry-run core:

```bash
npm run wp:import:core -- --dump "%TEMP%/hes-wp-db/qscbkfcv_wp999.sql"
```

Atajo local:

```bash
npm run wp:import:core:local
```

Escritura real con limite de prueba:

```bash
npm run wp:import:core:local -- --write --limit 25
```

Escritura real completa:

```bash
npm run wp:import:core:local -- --write
```

## Requisitos para `--write`

Antes de escribir:

1. Crear `.env` con `DATABASE_URL`.
2. Tener PostgreSQL corriendo.
3. Ejecutar migraciones Prisma.
4. Correr `npm run wp:import:core:local` sin `--write` y revisar que no existan bloqueos.
5. Probar primero con `--write --limit 25`.

## Datos que escribe

El importador crea/actualiza:

- `users` para autores editoriales.
- `categories`.
- `tags`.
- `posts`.
- `pages`.
- `products`.
- `web_stories`.
- `routes`.
- `import_runs`.
- `import_mappings`.
- relaciones `post_categories` y `post_tags`.

## Politica de credenciales

No se importan hashes ni emails reales desde WordPress.

Los usuarios editoriales reciben emails placeholder:

```txt
wp-user-{legacy_id}@legacy.hackeando.local
```

Luego el CMS nuevo debe invitar o regenerar credenciales de forma segura.

## Seguridad de contenido

El HTML de WordPress se sanitiza con `sanitize-html` antes de guardarse en `content_html`.

Esta sanitizacion elimina scripts, atributos peligrosos y URLs `javascript:`. Antes de produccion conviene sumar una segunda validacion visual de contenido y medios, porque algunos embeds de WordPress pueden requerir reglas especificas.

## Bloqueos automaticos

`--write` se bloquea si:

- hay colisiones de rutas canonicas;
- faltan autores usados por contenido publicable;
- la politica de permalink no es `/%postname%/`.

## Idempotencia

El importador usa:

- `legacy_wordpress_id` para upserts de entidades;
- `routes.path` para mantener canonicals;
- `import_mappings(object_type, legacy_id)` para trazabilidad;
- checksums para detectar cambios de contenido importado.

Reejecutar el importador actualiza registros existentes en vez de duplicarlos.

## Pendiente para fases siguientes

- Importar medios fisicos y variantes optimizadas.
- Importar metadata Yoast completa.
- Importar redirects historicos.
- Comparar sitemap viejo contra `routes` y `url_inventory`.
- Hacer prueba E2E Next -> Fastify -> PostgreSQL con contenido migrado.
