# MySQL local e import WordPress

Esta guia reproduce el entorno local usado para probar la importacion real del dump WordPress.

## Levantar mysql

```bash
docker compose up -d mysql
```

La DB queda disponible en:

```txt
mysql://hackeando:hackeando@localhost:3306/hackeandoelsistema
```

El archivo `.env` local no se versiona.

## Inicializar schema

```bash
npm run db:generate
npm run db:validate
npm --prefix backend exec prisma db push -- --schema=prisma/schema.prisma
```

Aplicar SQL foundation:

```powershell
Get-Content backend\prisma\sql\001_mysql_foundation.sql | docker exec -i hackeando-mysql mysql -uroot -proot hackeandoelsistema
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
npm --prefix backend audit --audit-level=moderate
npm --prefix frontend audit --audit-level=moderate
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
