# Dry-run de importacion WordPress

Esta fase simula la importacion core desde el dump real de WordPress hacia el modelo Prisma sin escribir en MySQL.

El objetivo es validar conteos, rutas canonicas, taxonomias, autores y posibles colisiones antes de construir el importador con escritura real.

## Comandos

Dry-run generico:

```bash
npm run wp:import:dry-run -- --dump "%TEMP%/hes-wp-db/qscbkfcv_wp999.sql"
```

Atajo local para este entorno:

```bash
npm run wp:import:dry-run:local
```

Salida generada:

```txt
docs/migration/wp-import-dry-run.report.json
```

## Resultado actual del dump

- Posts publicados planificados: 8,350
- Paginas publicadas planificadas: 27
- Productos publicados planificados: 6
- Web stories publicadas planificadas: 4
- Adjuntos detectados para inventario de medios: 7,892
- Categorias detectadas: 16
- Tags detectados: 306
- Usuarios WordPress detectados: 20
- Autores referenciados por contenido importable: 6
- Rutas activas planificadas: 8,709
- Colisiones de ruta: 0

## Modelos destino

El dry-run valida contra el contrato de estos modelos Prisma:

- `User`
- `Category`
- `Tag`
- `Post`
- `Page`
- `Product`
- `WebStory`
- `Route`
- `ImportMapping`

No se escriben datos en MySQL en esta fase.

## Politica canonical

La estructura WordPress detectada es:

```txt
/%postname%/
```

Por eso, el importador real debe crear `routes.path` con estas reglas:

- Post: `/{post_slug}/`
- Page: `/{page_slug}/` o jerarquica `/{parent_slug}/{page_slug}/`
- Category: `/category/{category_slug}/`
- Tag: `/tag/{tag_slug}/`
- Product: `/producto/{product_slug}/`
- Web Story: `/web-stories/{story_slug}/`

Las rutas de productos y web stories deben validarse contra sitemap/live antes del corte final, porque vienen de plugins y pueden depender de configuracion de WordPress.

## Bloqueos antes de importar con escritura real

El importador real debe detenerse si ocurre cualquiera de estos casos:

- `routes.collisions.length > 0`
- autores faltantes en `wp_users`
- permalink diferente a `/%postname%/` sin mapeo explicito
- categorias o tags sin slug
- posts publicados sin slug
- rutas generadas fuera del dominio canonico esperado

## Seguridad

- El dry-run no lee ni exporta `user_pass`, `user_email`, sesiones, tokens ni opciones privadas.
- Los usuarios se migraran como identidades editoriales.
- Las credenciales del sistema nuevo deben generarse desde cero.
- El importador con escritura debe usar `import_runs` e `import_mappings` para ser idempotente.

## Siguiente fase

Construir `wp:import:core` con dos modos:

- `--dry-run`: usa este mismo plan sin escribir.
- `--write`: crea/actualiza taxonomias, autores editoriales, posts, paginas, rutas e import mappings dentro de transacciones por lote.

Antes de `--write`, se debe tener MySQL local disponible y correr migraciones Prisma.
