# Despliegue Docker en VPS

Este despliegue corre el proyecto completo en Docker:

- `mysql`: base MySQL 8.4.
- `backend`: API Fastify + Prisma.
- `frontend`: Next.js standalone.
- `caddy`: reverse proxy con HTTPS automatico.

## 1. DNS

En el DNS del cliente, crear un registro `A`:

```txt
subdominio.cliente.com  A  IP_DEL_VPS
```

Antes de levantar Caddy, el dominio debe resolver al VPS y los puertos `80` y `443` deben estar abiertos.

## 2. Preparar VPS

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Clonar la rama preparada:

```bash
git clone -b fix/mysql-deploy-compat-v0.1 https://github.com/11carlosivan/hackeandoelsistema-2.0.git
cd hackeandoelsistema-2.0
```

Crear variables:

```bash
cp .env.production.example .env.production
nano .env.production
```

Generar secretos:

```bash
openssl rand -base64 48
```

Usar ese valor para `AUTH_JWT_SECRET` y generar claves fuertes para MySQL.

## 3. Build y arranque

```bash
docker compose --env-file .env.production -f compose.prod.yaml build
docker compose --env-file .env.production -f compose.prod.yaml up -d mysql
```

Esperar a que MySQL este saludable:

```bash
docker compose --env-file .env.production -f compose.prod.yaml ps
```

Aplicar schema Prisma:

```bash
docker compose --env-file .env.production -f compose.prod.yaml --profile tools run --rm backend-tools \
  npm exec prisma db push -- --schema=prisma/schema.prisma
```

Aplicar indices MySQL complementarios:

```bash
docker compose --env-file .env.production -f compose.prod.yaml exec -T mysql \
  sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < backend/prisma/sql/001_mysql_foundation.sql
```

Levantar todo:

```bash
docker compose --env-file .env.production -f compose.prod.yaml up -d
```

## 4. Crear admin inicial

Si `ADMIN_EMAIL` y `ADMIN_PASSWORD` estan definidos:

```bash
docker compose --env-file .env.production -f compose.prod.yaml exec backend \
  npm run auth:seed-admin
```

Despues del primer login, rotar la clave desde el CMS o cambiar `ADMIN_PASSWORD` y volver a sembrar.

## 5. Importar contenido WordPress

Copiar el dump SQL al VPS, por ejemplo:

```bash
mkdir -p tmp/wp
scp qscbkfcv_wp999.sql usuario@IP_DEL_VPS:/ruta/proyecto/tmp/wp/qscbkfcv_wp999.sql
```

Ejecutar dry run:

```bash
docker compose --env-file .env.production -f compose.prod.yaml exec backend \
  node scripts/wordpress/import-core.mjs --dump /workspace/tmp/wp/qscbkfcv_wp999.sql --out /tmp/wp-import-dry-run.report.json
```

Ejecutar import real:

```bash
docker compose --env-file .env.production -f compose.prod.yaml exec backend \
  node scripts/wordpress/import-core.mjs --dump /workspace/tmp/wp/qscbkfcv_wp999.sql --write --out /tmp/wp-import-core.report.json
```

## 6. Validacion

```bash
curl -I https://subdominio.cliente.com/
curl https://subdominio.cliente.com/api/v1/health/ready
curl -I https://subdominio.cliente.com/sitemap.xml
curl -I https://subdominio.cliente.com/robots.txt
```

El sitemap debe responder desde el frontend y consultar rutas reales al backend. En produccion no debe publicar un fallback estatico incompleto.

## 7. Operacion diaria

Ver logs:

```bash
docker compose --env-file .env.production -f compose.prod.yaml logs -f backend
docker compose --env-file .env.production -f compose.prod.yaml logs -f frontend
docker compose --env-file .env.production -f compose.prod.yaml logs -f caddy
```

Actualizar deploy:

```bash
git pull
docker compose --env-file .env.production -f compose.prod.yaml build
docker compose --env-file .env.production -f compose.prod.yaml up -d
docker compose --env-file .env.production -f compose.prod.yaml --profile tools run --rm backend-tools \
  npm exec prisma db push -- --schema=prisma/schema.prisma
```

Backup minimo:

```bash
docker compose --env-file .env.production -f compose.prod.yaml exec mysql \
  sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
docker run --rm -v hackeandoelsistema_cms_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/cms_uploads.tar.gz -C /data .
```

## 8. Notas SEO

- `APP_DOMAIN` debe ser el dominio canonico que Google vera.
- `NEXT_PUBLIC_SITE_URL` se construye desde `APP_DOMAIN` en Docker.
- No usar este compose con un dominio temporal indexable si luego se cambiara al dominio real.
- Para pruebas previas, usar un subdominio bloqueado por HTTP auth o reglas de Cloudflare.
