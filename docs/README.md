# Documentacion del Proyecto

Esta carpeta organiza la documentacion por area para que arquitectura, frontend, CMS y migracion SEO evolucionen sin mezclarse.

## Architecture

- [SEO-safe CMS/PostgreSQL ERD](architecture/hackeando-cms-seo-safe.dbml)
- [Versionamiento y ramas](architecture/versioning-and-branching.md)
- [Testing strategy](architecture/testing-strategy.md)
- [Route resolver](architecture/route-resolver.md)

## Frontend

- [Requisitos de data para frontend](frontend/frontend-data-requirements.md)
- [Auditoria del frontend actual y migracion a Next](frontend/frontend-audit-next-migration.md)
- [Roadmap para rediseño frontend en Next](frontend/frontend-redesign-roadmap.md)
- [Brief visual: identidad hacker editorial](frontend/editorial-hacker-design-brief.md)

## CMS

- [Flujos de producto y mapa de pantallas](cms/cms-product-flow-and-screen-map.md)
- [Modelo de layout e interacciones del CMS](cms/cms-layout-and-interaction-model.md)

## Regla de Uso

Cuando se agregue documentacion nueva, ubicarla en la carpeta del area correspondiente:

- `architecture/` para decisiones tecnicas, ERD, versionamiento y contratos globales.
- `frontend/` para web publica, diseño, pantallas Next y data UI.
- `cms/` para flujos operativos, pantallas internas, roles y layout del CMS.

Si una pieza cruza varias areas, crearla donde vive la responsabilidad principal y enlazarla desde este indice.
