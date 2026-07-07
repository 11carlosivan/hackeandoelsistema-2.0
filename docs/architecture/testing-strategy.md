# Testing Strategy

Los tests son obligatorios en cada fase del proyecto. La profundidad de pruebas debe crecer segun el riesgo del cambio, pero ninguna feature relevante debe entrar sin verificacion automatizada o una razon documentada.

## Regla General

Cada rama debe responder:

- que puede romper este cambio.
- que prueba automatizada lo cubre.
- que verificacion manual queda pendiente si aplica.

## Niveles de Prueba

### Unit Tests

Usar para:

- funciones puras.
- transformadores de data.
- helpers SEO.
- formatters.
- validaciones.
- permisos.

Herramienta inicial:

- Vitest.

### Component Tests

Usar para:

- componentes UI.
- estados vacios.
- botones por permisos.
- formularios.
- previews.

Herramientas iniciales:

- Vitest.
- Testing Library.
- jsdom.

### Integration Tests

Usar para:

- route resolver.
- data contracts.
- API clients.
- auth flows.
- post publication state machine.
- redirects.

### E2E Tests

Usar para:

- flujo de lectura publica.
- crear publicacion.
- login.
- checkout.
- revision editorial.
- publicar articulo.

Herramienta sugerida para fase posterior:

- Playwright.

### SEO / Rendering Tests

Obligatorios para pantallas publicas:

- status code.
- title.
- description.
- canonical.
- robots.
- H1.
- JSON-LD.
- OG image.
- HTML inicial con contenido principal.

### Migration Tests

Usar para:

- importadores WordPress.
- mapeo de legacy IDs.
- inventario de URLs.
- redirects.
- media variants.
- Yoast metadata.

### Visual Regression

Usar cuando existan pantallas estables:

- home.
- articulo.
- categoria.
- autor.
- CMS editor.
- SEO route detail.

Herramienta sugerida:

- Playwright screenshots.

## Politica por Tipo de Rama

`feature/web/*`

- tests de componentes o rendering.
- build obligatorio.

`feature/seo/*`

- tests de metadata, routes, sitemap, redirects.

`feature/api/*`

- tests de integration para endpoints.

`feature/db/*`

- tests de migraciones/seeds o verificacion SQL.

`fix/*`

- test que reproduzca el bug o verificacion automatizada equivalente.

`docs/*`

- no requiere test automatizado, pero debe mantener enlaces consistentes.

## Scripts Actuales

```txt
npm test
npm run test:watch
npm run test:coverage
npm run build
npm run lint
```

## Criterio de Merge

Antes de mergear una rama de implementacion:

- `npm test` debe pasar.
- `npm run build` debe pasar.
- `npm run lint` debe pasar o tener excepcion documentada.
- si toca SEO publico, debe existir test o checklist de metadata/rendering.

## Excepciones

Se permite no agregar tests solo si:

- el cambio es documentacion pura.
- el cambio es configuracion sin comportamiento observable.
- el cambio es exploratorio y no se mergea a rama estable.

La excepcion debe quedar explicada en el PR o commit.
