# Hackeando el Sistema - PHP Media Uploader

Este paquete despliega solo el receptor PHP de imagenes/archivos para usar el espacio del hosting cPanel/Banahost como almacenamiento remoto del CMS.

No despliega frontend, backend Node, MySQL ni Docker. El backend Fastify ya existente sube los archivos a este endpoint usando firma HMAC.

## Archivos

- `public/upload.php`: endpoint privado que recibe archivos desde el backend.
- `public/.htaccess`: conserva el header `Authorization` para que PHP pueda leer el Bearer token.
- `public/uploads/.htaccess`: evita ejecutar PHP/scripts dentro de la carpeta de uploads.
- `media-config.example.php`: plantilla de configuracion privada.

## Opcion Recomendada En cPanel

1. Crear el subdominio, por ejemplo:

```text
media.hackeandoelsistema.net
```

2. Configurar el document root del subdominio apuntando a:

```text
/home/USUARIO/media-hackeando/public
```

3. Subir la carpeta de esta forma:

```text
/home/USUARIO/media-hackeando/
  media-config.php
  public/
    .htaccess
    upload.php
    uploads/
      .htaccess
```

4. Copiar `media-config.example.php` como `media-config.php` y editarlo:

```php
<?php

return [
    'secret' => 'PEGA_AQUI_UN_SECRETO_DE_32_O_MAS_CARACTERES',
    'public_base_url' => 'https://media.hackeandoelsistema.net',
    'upload_root' => __DIR__ . '/public/uploads/cms',
    'public_base_path' => '/uploads/cms',
    'max_bytes' => 8388608,
];
```

5. Crear la carpeta si no existe:

```text
/home/USUARIO/media-hackeando/public/uploads/cms
```

6. Permisos recomendados:

```bash
chmod 600 /home/USUARIO/media-hackeando/media-config.php
chmod 755 /home/USUARIO/media-hackeando/public
chmod 755 /home/USUARIO/media-hackeando/public/uploads
chmod 755 /home/USUARIO/media-hackeando/public/uploads/cms
```

En algunos hostings compartidos no permiten `600`; si falla PHP leyendo el archivo, usar `640` o `644`.

## Si cPanel No Permite Document Root Personalizado

Si el subdominio apunta directamente a una carpeta como:

```text
/home/USUARIO/public_html/media
```

subir el contenido de `public/` dentro de esa carpeta:

```text
/home/USUARIO/public_html/media/
  .htaccess
  upload.php
  uploads/
    .htaccess
```

Y colocar `media-config.php` un nivel arriba:

```text
/home/USUARIO/public_html/media-config.php
```

Esto funciona porque `upload.php` busca la configuracion en la carpeta padre del document root.

## Variables En La VPS

En `/opt/hackeandoelsistema/.env.production`, cambiar solo estas variables:

```env
MEDIA_STORAGE_DRIVER=remote_php
MEDIA_REMOTE_UPLOAD_URL=https://media.hackeandoelsistema.net/upload.php
MEDIA_REMOTE_PUBLIC_BASE_URL=https://media.hackeandoelsistema.net
MEDIA_REMOTE_SECRET=EL_MISMO_SECRET_DE_media-config.php
MEDIA_REMOTE_TIMEOUT_MS=15000
```

Luego aplicar en la VPS:

```bash
cd /opt/hackeandoelsistema
docker compose --env-file .env.production -f compose.prod.yaml up -d backend frontend
```

No hace falta desplegar todo el sistema de nuevo. Solo reiniciar backend/frontend para que tomen las variables.

## Prueba Rapida

El endpoint debe rechazar GET:

```bash
curl -i https://media.hackeandoelsistema.net/upload.php
```

Respuesta esperada:

```text
HTTP/...
405
{"error":"method_not_allowed"}
```

Si devuelve `404`, el archivo no esta en el document root correcto.

Si devuelve `500 {"error":"media_secret_not_configured"}`, falta configurar `media-config.php`.

## Prueba Real Desde El CMS

1. Entrar al CMS.
2. Ir a Media.
3. Subir una imagen pequena `.jpg`, `.png` o `.webp`.
4. Confirmar que la URL guardada empiece con:

```text
https://media.hackeandoelsistema.net/uploads/cms/
```

5. Confirmar que la imagen abra publicamente en el navegador.

## Seguridad

- No publicar `media-config.php` dentro del document root.
- Usar un secreto diferente a `AUTH_JWT_SECRET`.
- El secreto debe tener al menos 32 caracteres.
- No activar listado de directorios.
- Mantener `public/uploads/.htaccess`; evita ejecutar PHP dentro de uploads.
- El endpoint valida:
  - Bearer token.
  - Timestamp con tolerancia.
  - Firma HMAC del archivo.
  - MIME real del archivo.
  - Tamano maximo.

