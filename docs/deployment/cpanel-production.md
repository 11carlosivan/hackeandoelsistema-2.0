# Despliegue cPanel para prueba operativa

Este proyecto no es un sitio PHP estatico. Para correrlo en cPanel se necesita soporte real de Node.js App y una base MySQL accesible desde el hosting.

## Requisitos minimos

- cPanel con Node.js App habilitado.
- Node.js 20.11 o superior.
- SSH o Terminal de cPanel.
- MySQL disponible. Puede ser MySQL del hosting o una DB externa gestionada.
- Dominio con HTTPS activo.
- Memoria suficiente para `next build`. Si el cPanel es compartido y limita memoria, hacer build local/CI y subir artefactos.

La rama de prueba esta configurada para MySQL.

## Apps recomendadas en cPanel

Usar dos Node Apps separadas:

1. Frontend Next.js
   - Dominio: `https://hackeandoelsistema.net`
   - Startup: `npm start` o `.next/standalone/server.js`
   - Puerto: el asignado por cPanel/Passenger.

2. API Fastify
   - Subdominio recomendado: `https://api.hackeandoelsistema.net`
   - Startup: `npm run start:api` o `api/server.js`
   - Puerto: el asignado por cPanel/Passenger. El backend ya acepta `PORT` como fallback de `API_PORT`.

## Variables frontend

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://hackeandoelsistema.net
API_INTERNAL_URL=https://api.hackeandoelsistema.net
NEXT_PUBLIC_API_BASE_URL=https://api.hackeandoelsistema.net
NEXT_PUBLIC_API_URL=https://api.hackeandoelsistema.net
```

## Variables API

```bash
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
WEB_ORIGIN=https://hackeandoelsistema.net
CORS_ORIGINS=https://hackeandoelsistema.net
AUTH_JWT_SECRET=GENERAR_UN_SECRETO_LARGO_DE_32_BYTES_O_MAS
AUTH_COOKIE_SECURE=true
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_DAYS=30
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW=1 minute
MEDIA_UPLOAD_DIR=public/uploads/cms
MEDIA_PUBLIC_BASE_PATH=/uploads/cms
MEDIA_MAX_FILE_SIZE_BYTES=8388608
```

## Comandos de preparacion

```bash
npm ci
npm run db:generate
npm run build:production
npm run deploy:check
```

En cPanel compartido, si `npm run build:production` consume demasiada memoria, hacer el build fuera del servidor y subir:

- `.next/standalone`
- `.next/static`
- `public`
- `package.json`
- `package-lock.json`
- `prisma`
- `api`

## Validacion antes de apuntar DNS

La API debe responder:

```bash
GET https://api.hackeandoelsistema.net/health
GET https://api.hackeandoelsistema.net/ready
GET https://api.hackeandoelsistema.net/api/v1/public/site-summary
```

El frontend debe responder:

```bash
GET https://hackeandoelsistema.net/
GET https://hackeandoelsistema.net/sitemap.xml
GET https://hackeandoelsistema.net/robots.txt
```

## Para 300k visitas al mes

Usar Cloudflare delante del dominio, cachear estaticos y media, y activar HTTPS estricto. La media se guarda en disco local bajo `public/uploads/cms`, asi que para produccion estable hay que incluir ese directorio en backups diarios.

No apuntar el dominio final hasta que:

- `npm run deploy:check` pase.
- `/ready` devuelva `database: connected`.
- El sitemap nuevo tenga las URLs importadas.
- El login CMS funcione con cookie segura en HTTPS.
- Exista backup de DB y de `public/uploads/cms`.
