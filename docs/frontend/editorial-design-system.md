# Editorial Design System

Esta capa contiene el sistema de diseno del frontend publico. La Home ya no parte de una pantalla blanca basica: usa una composicion editorial oscura, inspirada en el nivel de pulido de la referencia, pero adaptada a la identidad hacker de Hackeando el Sistema.

## Arquitectura Atomic Design

Ubicacion:

```txt
components/design-system/
  atoms/
  molecules/
  organisms/
  templates/
```

## Atoms

Piezas indivisibles, sin conocimiento de pagina:

- `CategoryBadge`
- `IconButton`
- `NavLink`
- `PostMeta`
- `PrimaryButton`
- `StoryMediaPlaceholder`

## Molecules

Combinan atoms y resuelven patrones editoriales pequenos:

- `AdSlot`
- `AuthorByline`
- `CompactStoryCard`
- `EmptyState`
- `CategoryFilterBar`
- `NavMoreMenu`
- `Pagination`
- `PostCard`
- `SectionHeader`

## Organisms

Bloques completos de pantalla:

- `BreakingNewsBar`
- `EditorialSignalStrip`
- `HomeHeroGrid`
- `LatestNewsSection`
- `NetworkCard`
- `OpinionStrip`
- `PublicHeader`
- `TrendingPanel`
- `WeatherCard`

## Templates

Composiciones de pagina alimentadas por payloads:

- `HomeTemplate`

`app/page.jsx` solo resuelve ruta, arma el payload y delega la UI al template. Esto mantiene SEO/routing separado del diseno visual.

## Principios Visuales

- Fondo oscuro por defecto; no se usa una Home blanca.
- Jerarquia editorial clara: hero dominante, sidebar de lectura rapida, grilla de ultimas noticias y franja de opinion.
- Rojo como acento de marca, no como ruido constante.
- Componentes con dimensiones estables para evitar saltos visuales.
- Cards con radio bajo, bordes controlados y sombras discretas.
- Iconografia consistente via `lucide-react`.
- Placeholders visuales reutilizables cuando una nota migrada todavia no tiene imagen.
- Ads con espacio reservado para evitar CLS.
- Componentes alimentados por data contracts, no por objetos improvisados.
- Tests obligatorios para estados principales.

## Relacion con Contratos

Los componentes consumen payloads definidos en:

- `lib/contracts/public-content.js`
- `lib/contracts/public-content.fixtures.js`

La UI no debe consultar WordPress ni Prisma directamente. El backend/API entrega payloads normalizados y la capa visual solo renderiza.

## Home Actual

La Home publica renderiza:

- header editorial oscuro con navegacion principal y acciones.
- menu `Mas` para categorias secundarias en desktop.
- barra de ultimas noticias.
- franja compacta de datos utiles: dolar/euro BCRD, 4 combustibles y fuentes verificables.
- hero grid con nota principal y stories secundarios.
- panel de tendencias.
- clima RD.
- conversion al Network.
- grilla de ultimas noticias.
- filtros de categoria compactos con scroll horizontal limpio cuando no caben.
- opinion destacada.
- slot publicitario reservado.

## Tests

Cada componente nuevo debe tener test de:

- render basico.
- estado vacio si aplica.
- links importantes.
- accesibilidad minima cuando aplique.

Comandos:

```bash
npm test
npm run build
npm run lint
```
