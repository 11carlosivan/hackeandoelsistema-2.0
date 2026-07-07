# Frontend Data Contracts

Esta capa define la forma minima de los payloads que consumiran las pantallas publicas antes de conectar Fastify/Prisma.

## Archivos

- `lib/contracts/public-content.js`
- `lib/contracts/public-content.fixtures.js`
- `lib/contracts/payload-builders.js`

## Objetivo

Separar tres cosas:

1. Como se resuelve una URL.
2. Que metadata SEO necesita.
3. Que payload consume cada pantalla.

Esto evita que el rediseño de UI invente datos o dependa de mocks sin forma estable.

## Payloads Publicos

Contratos definidos:

- `RoutePayload`
- `SeoMetadataPayload`
- `MediaAssetPayload`
- `AuthorSummaryPayload`
- `CategorySummaryPayload`
- `PostSummaryPayload`
- `PostDetailPayload`
- `PaginationPayload`
- `AdSlotPayload`
- `HomePayload`
- `CategoryPagePayload`
- `AuthorPagePayload`
- `SearchPagePayload`

## Validacion

Los validadores ligeros permiten detectar campos faltantes en tests:

```js
assertContract('home', payload)
assertContract('postSummary', post)
```

No reemplazan validacion backend. Son una barrera temprana para UI y fixtures.

## Estado Actual

Los builders usan fixtures temporales y rutas resueltas:

```txt
resolveRoute(path) -> buildPayloadForResolvedRoute(route)
```

Luego se reemplazaran por payloads reales desde Fastify/Prisma, manteniendo el contrato.

## Regla para Nuevas Pantallas

Antes de diseñar o implementar una pantalla nueva:

- crear o extender su payload contract.
- agregar fixture realista.
- agregar test de required fields.
- conectar la pantalla al contrato, no a objetos sueltos.

## Tests

```bash
npm test
```

Cobertura actual:

- campos obligatorios.
- paginacion.
- fixtures publicos.
- builders desde resolved routes.
