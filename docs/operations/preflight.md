# Preflight operacional

El preflight resume si el stack esta listo para una prueba real de punta a punta.

## Comando

```bash
npm run ops:preflight
```

Genera:

```bash
docs/operations/preflight.report.json
```

## Que valida

- Variables obligatorias de la API.
- Conexion a PostgreSQL.
- Conteos base importados: posts, paginas, rutas, sitemap, media, categorias y usuarios activos.
- Ultimo `ImportRun`.
- Endpoints internos Fastify:
  - `/health`
  - `/ready`
  - `/api/v1/public/site-summary`
  - `/api/v1/public/posts?page=1&limit=1`
  - `/api/v1/public/sitemap-routes`
- Login admin opcional cuando existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Estados

- `PASS`: listo para continuar.
- `WARN`: no bloquea, pero hay algo que conviene revisar. Ejemplo: no se probaron credenciales admin porque no estan en env.
- `FAIL`: bloquea la prueba operacional; el comando termina con codigo distinto de cero.
