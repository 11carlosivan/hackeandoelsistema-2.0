# Inventario sanitizado del dump WordPress

Este documento resume la primera lectura segura del dump real de WordPress para preparar la importacion a Next, Fastify, Prisma y PostgreSQL sin perder SEO.

El dump original no se versiona. El reporte JSON generado contiene solo opciones publicas, conteos y muestras de rutas publicas.

## Fuente local

- Archivo recibido: `qscbkfcv_wp999.zip`
- SQL extraido localmente: `%TEMP%/hes-wp-db/qscbkfcv_wp999.sql`
- Tamano SQL: 497,579,837 bytes
- Reporte generado: `docs/migration/wp-dump-inventory.report.json`
- Comando reproducible:

```bash
npm run wp:inspect -- --dump "%TEMP%/hes-wp-db/qscbkfcv_wp999.sql"
```

En Windows tambien existe el atajo:

```bash
npm run wp:inspect:local
```

## WordPress detectado

- Prefijo de tablas: `wpmb_`
- Sitio: `https://hackeandoelsistema.net`
- Nombre publico: `Hackeando el Sistema`
- Timezone: `America/Santo_Domingo`
- Home configurado como pagina estatica: `page_on_front = 66655`
- Estructura de enlaces permanentes: `/%postname%/`
- Tablas totales detectadas: 266
- Tablas core necesarias presentes: posts, postmeta, terms, term_taxonomy, term_relationships, users, usermeta, comments, commentmeta, options.

## Conteo principal de contenido

- Filas totales en `wpmb_posts`: 27,554
- Posts publicados: 8,350
- Paginas publicadas: 27
- Adjuntos: 7,892
- Revisiones: 10,155
- Web stories publicadas: 4
- Productos publicados: 6
- Tambien hay contenido social/comunidad y e-commerce por plugins, que deben migrarse por fases y no mezclarse con la primera importacion editorial.

## Implicacion SEO principal

La regla de WordPress para posts publicados es:

```txt
https://hackeandoelsistema.net/{post_slug}/
```

Por eso, en el nuevo Next no debemos convertir los posts migrados en canonicals tipo:

```txt
/articulo/{id}
/post/{id}
/noticia/{slug}
```

La ruta canonica de cada post migrado debe vivir en `routes.path` con el mismo path raiz de WordPress:

```txt
/{post_name}/
```

Si se crean rutas internas nuevas para UI, deben redirigir con 301 hacia la ruta canonica original o marcar canonical correctamente hacia `/{post_name}/`.

## Rutas que debe resolver Next

El frontend debe soportar un resolver de rutas en raiz, por ejemplo:

```txt
/{slug}/
```

Ese resolver debe consultar la API:

```txt
GET /api/v1/public/route?path=/{slug}/
```

Respuesta esperada:

- `entityType = post`: render de articulo.
- `entityType = page`: render de pagina estatica.
- `entityType = category`: render de categoria.
- `entityType = tag`: render de etiqueta.
- `redirect`: aplicar 301/302 desde la tabla `redirects`.
- `not_found`: devolver 404 real, no pagina vacia.

## Fase de importacion recomendada

1. Importar opciones publicas necesarias para configuracion SEO.
2. Importar categorias, tags y taxonomias.
3. Importar autores de forma sanitizada, sin reutilizar hashes de WordPress como credenciales activas.
4. Importar medios como inventario primero, luego descargar/copiar assets en una fase separada.
5. Importar posts publicados con `wp_post_id` en `import_mappings`.
6. Crear `routes.path` usando el canonical original `/{post_name}/`.
7. Crear `seo_metadata` desde Yoast/postmeta cuando toque esa fase.
8. Generar `url_inventory` con todas las URLs antiguas para comparar contra sitemap y logs.
9. Validar que `/sitemap.xml` nuevo incluya las mismas URLs canonicas publicas antes de cortar trafico.

## Seguridad

- No se debe commitear el `.sql`, el `.zip`, hashes de usuarios, emails, sesiones, tokens ni opciones privadas de plugins.
- Los usuarios se migran como identidades/editoriales; las credenciales deben regenerarse con el sistema nuevo.
- El importador debe ser idempotente usando `import_runs` e `import_mappings`.
- Cualquier contenido HTML importado debe pasar por sanitizacion antes de exponerse en la API publica.

## Siguiente paso

La siguiente fase debe crear el importador controlado para PostgreSQL:

- `wp:import:dry-run` para validar conteos y rutas sin escribir.
- `wp:import:core` para insertar taxonomias, autores, posts, paginas y rutas.
- Tests de idempotencia.
- Tests de canonical para asegurar que los posts quedan en `/{post_name}/`.
