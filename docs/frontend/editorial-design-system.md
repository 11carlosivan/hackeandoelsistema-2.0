# Editorial Design System

Esta capa contiene los componentes base del frontend publico. No es el rediseño final de pantallas; es la caja de piezas compartidas para construir Home, articulo, categoria, autor y busqueda con consistencia.

## Componentes Iniciales

Ubicacion:

```txt
components/editorial/
```

Componentes:

- `CategoryBadge`
- `PostMeta`
- `AuthorByline`
- `PostCard`
- `SectionHeader`
- `AdSlot`
- `Pagination`
- `EmptyState`

## Principios

- Identidad hacker sobria.
- Jerarquia editorial clara.
- Rojo como acento, no como ruido constante.
- Cards con dimensiones estables.
- Ads con espacio reservado para evitar CLS.
- Componentes alimentados por data contracts.
- Tests obligatorios para estados principales.

## Relacion con Contratos

Los componentes consumen payloads definidos en:

- `lib/contracts/public-content.js`
- `lib/contracts/public-content.fixtures.js`

El objetivo es que el rediseño no dependa de objetos improvisados.

## Estado Actual

La Home temporal ya renderiza:

- `PostCard` feature.
- listado simple de posts.
- `SectionHeader`.
- `AdSlot`.

## Siguientes Componentes

Antes de rediseñar Home completa faltan:

- `BreakingNewsBar`
- `TrendingList`
- `NewsletterBlock`
- `SearchBox`
- `ShareActions`
- `ArticleBody`
- `RelatedPosts`
- `CmsStatusBadge` para vistas internas posteriores

## Tests

Cada componente nuevo debe tener test de:

- render basico.
- estado vacio si aplica.
- links importantes.
- accesibilidad minima cuando aplique.
