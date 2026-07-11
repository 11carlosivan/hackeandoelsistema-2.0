# PostgreSQL local e import WordPress

Esta guia reproduce el entorno local usado para probar la importacion real del dump WordPress.

## Levantar Postgres

```bash
docker compose up -d postgres
```

La DB queda disponible en:

```txt
postgresql://postgres:postgres@localhost:5432/hackeandoelsistema?schema=public
```

El archivo `.env` local no se versiona.

## Inicializar schema

```bash
npm run db:generate
npm run db:validate
npx prisma db push --schema=prisma/schema.prisma
```

Aplicar SQL foundation:

```powershell
Get-Content prisma\sql\001_postgres_foundation.sql | docker exec -i hackeando-postgres psql -U postgres -d hackeandoelsistema
```

## Importar WordPress

Prueba limitada:

```bash
npm run wp:import:core:local -- --write --limit 25
```

Import completo:

```bash
npm run wp:import:core:local -- --write
```

## Validaciones usadas

```bash
npm test
npm run lint
npm run db:validate
npm audit --audit-level=moderate
npm run build
```

## Conteo esperado tras el import completo

- Users: 6
- Categories: 16
- Tags: 306
- Posts: 8,350
- Pages: 27
- Products: 6
- Web stories: 4
- Routes: 8,709
- Import mappings: 8,715
