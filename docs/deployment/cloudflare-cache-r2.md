# Cloudflare Cache + R2 para prueba

Esta guia deja listo el camino para probar media en Cloudflare R2 y cache publica delante del sitio.

## R2 media

Crear un bucket R2 para staging, por ejemplo:

```bash
hes-media-staging
```

Conectar un dominio publico al bucket:

```bash
media.hackeandoelsistema.net
```

La API sube archivos por la API compatible con S3 usando el endpoint:

```bash
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Variables necesarias en la API:

```bash
MEDIA_STORAGE_DRIVER=r2
R2_ACCOUNT_ID=cloudflare-account-id
R2_BUCKET_NAME=hes-media-staging
R2_ACCESS_KEY_ID=cloudflare-r2-access-key
R2_SECRET_ACCESS_KEY=cloudflare-r2-secret-key
R2_PUBLIC_BASE_URL=https://media.hackeandoelsistema.net
R2_OBJECT_CACHE_CONTROL=public, max-age=31536000, immutable
```

Para volver a modo local:

```bash
MEDIA_STORAGE_DRIVER=local
```

## Cache de media

Los uploads nuevos usan nombres con UUID, asi que pueden cachearse fuerte:

```bash
Cache-Control: public, max-age=31536000, immutable
```

En Cloudflare, crear una Cache Rule para:

```txt
Hostname equals media.hackeandoelsistema.net
```

Acciones recomendadas:

- Eligible for cache: cache everything.
- Edge TTL: respetar cache-control del origen si esta presente.
- Browser TTL: respetar cache-control del origen.
- Activar Tiered Cache si esta disponible.

## Cache de API publica

La API publica envia:

```bash
Cache-Control: public, max-age=N, s-maxage=N, stale-while-revalidate=5N
CDN-Cache-Control: public, max-age=N, stale-while-revalidate=5N
```

Endpoints CMS/auth siguen con `no-store` cuando corresponde.

En Cloudflare, crear una Cache Rule para:

```txt
Hostname equals api.hackeandoelsistema.net
Path starts with /api/v1/public/
```

Acciones recomendadas:

- Eligible for cache.
- Respetar `CDN-Cache-Control`/`Cache-Control`.
- No cachear cookies ni respuestas privadas.

No aplicar cache a:

```txt
/api/v1/auth/*
/api/v1/cms/*
/health
/ready
```

## Cache del frontend

El frontend Next ya genera estaticos bajo `/_next/static/*`. En Cloudflare:

```txt
Path starts with /_next/static/
```

Acciones recomendadas:

- Cache everything.
- Edge TTL alto.
- Browser TTL alto.

Para HTML publico, usar TTL corto o respetar headers de Next. No cachear:

```txt
/cms/*
/iniciar-sesion/*
/password-recover/*
/register/*
/checkout/*
```

## Prueba rapida

1. Configurar variables R2 en la API.
2. Reiniciar Node App de la API en cPanel.
3. Subir una imagen desde `/cms/media`.
4. Confirmar que la URL devuelta apunta a `https://media.hackeandoelsistema.net/...`.
5. Ejecutar el smoke de R2:

```bash
npm run ops:r2:smoke
```

Genera:

```bash
docs/operations/r2-smoke.report.json
```

6. Abrir la imagen y revisar headers:

```bash
cache-control: public, max-age=31536000, immutable
cf-cache-status: HIT
```

El primer request puede salir `MISS`; el segundo deberia pasar a `HIT` si la regla esta activa.

## Fuentes Cloudflare

- R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- R2 S3 API: https://developers.cloudflare.com/r2/api/s3/api/
- R2 API tokens: https://developers.cloudflare.com/r2/api/tokens/
- Cloudflare cache control: https://developers.cloudflare.com/cache/concepts/cache-control/
- CDN-Cache-Control: https://developers.cloudflare.com/cache/concepts/cdn-cache-control/
