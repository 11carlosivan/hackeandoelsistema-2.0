# Inventario de sitemap WordPress

Esta fase prepara una comparacion objetiva entre el sitemap publico actual de WordPress y las rutas del nuevo sistema.

## Comandos

Dry-run contra el sitemap real:

```bash
npm run seo:sitemap:inventory:live
```

Comparar contra `routes` sin escribir:

```bash
npm run seo:sitemap:inventory:live -- --compare-db
```

Guardar URLs en `url_inventory`:

```bash
npm run seo:sitemap:inventory:live -- --write
```

## Que valida

- Descubre sitemaps anidados de Yoast.
- Extrae URLs canonicas publicas.
- Normaliza `path` con slash final.
- Infiere tipo de entidad: post, pagina/categoria/tag/autor/producto/web story cuando se puede por path.
- Con `--compare-db` compara contra `routes.path`.
- Con `--write` hace upsert idempotente en `url_inventory`.

## Uso antes del E2E

Antes de cortar trafico, el reporte debe mostrar que las URLs indexables importantes del WordPress real existen en `routes` o tienen redirect definido. Las URLs que queden como `missing-route` pasan a revision manual o a un redirect 301.
