# Health y readiness

La API expone endpoints simples para monitoreo, balanceadores y despliegues.

## Liveness

Usar para saber si el proceso Fastify esta vivo:

```bash
GET /health
GET /live
GET /health/live
GET /api/v1/health
GET /api/v1/health/live
```

Respuesta esperada:

```json
{
  "ok": true,
  "service": "hackeando-api",
  "status": "live"
}
```

## Readiness

Usar para saber si la API puede operar contra MySQL:

```bash
GET /ready
GET /health/ready
GET /api/v1/health/ready
```

Respuesta esperada cuando la DB responde:

```json
{
  "ok": true,
  "service": "hackeando-api",
  "status": "ready",
  "database": "connected"
}
```

Si MySQL no responde, devuelve `503` con `status: "not_ready"`.
