# Smoke de rutas publicas

Este script valida que las rutas activas importadas puedan resolverse por API antes del E2E manual.

## Comando

```bash
npm run qa:routes:smoke
```

Opcionalmente se puede ampliar la muestra por tipo:

```bash
npm run qa:routes:smoke -- --limit-per-type 10
```

## Que revisa

- Lee `routes` activas e incluidas en sitemap.
- Toma una muestra por cada `entity_type`.
- Verifica `GET /api/v1/public/route?path=...`.
- Para rutas con entidad, verifica el endpoint publico correspondiente:
  - posts;
  - paginas/home;
  - categorias;
  - tags;
  - autores;
  - productos;
  - web stories.
- Genera `docs/qa/public-route-smoke.report.json`.

Si alguna ruta o entidad responde distinto de `200`, el proceso termina con error.
