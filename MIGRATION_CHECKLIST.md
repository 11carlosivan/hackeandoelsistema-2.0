# Checklist de Migración y Requisitos de Data (WordPress a Frontend React)

Este documento contiene las listas de verificación para auditar que el nuevo frontend cumple con los requisitos de datos y SEO heredados de WordPress, detallados en [frontend-data-requirements.md](docs/frontend/frontend-data-requirements.md). Úsalo directamente en tu IDE para verificar la conformidad de cada pantalla.

---

## 1. Requisitos Globales por Pantalla
- [ ] **Entidad Route**: Toda pantalla pública recibe la entidad `route` con `path`, `entity_type`, `entity_id`, `http_status`, `canonical_url`, `include_in_sitemap` y `lastmod_at`.
- [ ] **SEO Metadata**: Toda pantalla indexable recibe `seo_metadata` (`title`, `description`, `robots_index`, `robots_follow`, `og_title`, `og_description`, `og_image_url`, `twitter_card`, `schema_json`, `yoast_head_json`).
- [ ] **Layout Común**: Logo principal/mobile, Menú principal, Footer, Redes sociales, Newsletter config, Slots de anuncios, Cookies/Texto legal.

---

## 2. Checklist Detallado por Pantalla

### 1. Portada (Home)
- [ ] `featured_posts` (noticias destacadas para hero o bloque principal).
- [ ] `breaking_posts` (noticias marcadas como última hora).
- [ ] `latest_posts` (listado cronológico).
- [ ] `trending_posts` (noticias más vistas / tendencias).
- [ ] `category_sections` (Nacionales, Política, Tecnología, Internacional, Investigación).
- [ ] `youtube_items` / HES TV.
- [ ] Slot de anuncios superior y lateral activo.
- [ ] Formulario de boletín / Newsletter.
- [ ] SEO: Schemas `WebSite` y `Organization` en JSON-LD; Canonical: `https://hackeandoelsistema.net/`.
- [ ] Estados borde: Sin imagen destacada, categoría vacía, sin anuncios activos.

### 2. Artículo / Noticia
- [ ] Atributos post (`id`, `title`, `slug`, `url`, `excerpt`, `content_html`, `published_at`, `view_count`, `comment_count`, `is_sponsored`).
- [ ] Autor (`display_name`, `url`, `avatar`, `bio`, clearance level).
- [ ] Imagen principal (`url`, `alt_text`, `caption`, `credit`).
- [ ] Taxonomías (Categoría principal, categorías secundarias, tags).
- [ ] Relaciones editoriales (`related_posts`, `previous_post`, `next_post`, más del autor).
- [ ] Comentarios aprobados y formulario para comentar.
- [ ] Slots de anuncios: Superior, en contenido, lateral y footer.
- [ ] SEO: Schema `NewsArticle` / `Article` en JSON-LD, fecha de publicación/modificación, canonical idéntico al WordPress original.
- [ ] Estados borde: Títulos muy largos, sin extracto, URLs antiguas/numéricas, imágenes rotas.

### 3. Página de Categoría
- [ ] Atributos categoría (`name`, `slug`, `full_path`, `description`).
- [ ] Listado de posts (`posts`) usando el formato resumido del post.
- [ ] Controles de paginación (`pagination`).
- [ ] SEO: Canonical de la categoría, evitar contenido duplicado por paginación.
- [ ] Estados borde: Categoría vacía (fallback 404 o página vacía controlada), posts antiguos sin imagen.

### 4. Perfil de Autor
- [ ] Atributos autor (`display_name`, `username`, `avatar`, `bio`, `website_url`, redes sociales).
- [ ] Listado de posts escritos por el autor (`posts`) con paginación.
- [ ] Columnas de opinión escritas por el autor (`opinions`).
- [ ] SEO: Schema `Person` (si aplica), canonical de autor.
- [ ] Estados borde: Autor sin bio/avatar, autor inactivo con registros históricos.

### 5. Búsqueda Interna
- [ ] Parámetros: término de búsqueda (`query`), resultados (`results`), total de resultados (`total_results`), paginación.
- [ ] SEO: Regla obligatoria `NOINDEX, FOLLOW` en cabeceras meta para resultados de búsqueda interna.
- [ ] Estados borde: Cero resultados, query muy corta, caracteres especiales.

### 6. Página Estática
- [ ] Atributos de página (`title`, `slug`, `content_html`, `status`, `published_at`).
- [ ] SEO: Canonical y metadatos individuales. Las páginas legales y de contacto deben indexar.
- [ ] Integración de formularios (ej: portal de denuncias seguras o suscripción).
- [ ] Estados borde: Contenidos simples, shortcodes de WordPress heredados limpios.

### 7. Login, Registro y Cuenta
- [ ] Estado de sesión seguro (`autenticado`, `roles`, `permisos`).
- [ ] Formularios de login (`/iniciar-sesion/`), registro (`/register/`) y perfil privado (`/mi-cuenta/`).
- [ ] Formulario de recuperación de clave (`/password-recover/`).
- [ ] Campos requeridos en el registro indicados claramente con asterisco rojo (`*`).
- [ ] SEO: Pantallas privadas configuradas estrictamente con `NOINDEX, NOFOLLOW`.
- [ ] Estados borde: Token expirado, datos inválidos, cuentas bloqueadas.

### 8. Crear Publicación (Submission)
- [ ] Comprobación de cuota y créditos de publicación disponibles según el plan.
- [ ] Campos editoriales: título, categoría, extracto, contenido, imagen destacada.
- [ ] Línea de tiempo con estado de revisión: borrador, revisión, cambios sugeridos, aprobado.
- [ ] SEO: La pantalla de edición es `NOINDEX`. El artículo final sólo indexa al ser publicado en línea.

### 9. Planes y Pago (Checkout)
- [ ] Lista de planes de publicación (`publication_plans`): precios, moneda, cuota de posts, vigencia.
- [ ] Pasarela de pago simulada (`/checkout/` / `/pago/`) con soporte de tarjetas y criptomonedas (Bitcoin).
- [ ] Estados de transacción: procesando, completado con éxito, fallido.
- [ ] SEO: Página de planes INDEX. Checkout y Pago estrictamente `NOINDEX`.

### 10. Boletín (Newsletter)
- [ ] Captura de campos obligatorios: email, nombre, consentimiento legal.
- [ ] Inclusión como bloque en Home, artículos y pie de página.
- [ ] Estados borde: Correo ya registrado, error de formato, suscripción exitosa.

### 11. Publicidad (Ads)
- [ ] Espacios estables (reserva de altura y ancho) para evitar saltos acumulativos de diseño (CLS).
- [ ] Ubicaciones: Cabecera, cuerpo del artículo, barra lateral y pie de página.
- [ ] Estados borde: Slots vacíos sin campaña activa.

### 12. Web Stories
- [ ] Conservación de URLs de historias anteriores (`/web-stories/slug`).
- [ ] Redirecciones estables `301` o renderizado estático de fallback.

### 13. Productos
- [ ] Redirección de URLs antiguas de WooCommerce hacia los nuevos planes de publicación (`/planes/`).

### 14. Pantalla de Error 404 / 410
- [ ] Responder con estado HTTP real de error (`404` o `410` para contenido eliminado de forma permanente).
- [ ] Recomendaciones UX: Buscador integrado, publicaciones recientes y listado de categorías principales.

### 15. Redirecciones
- [ ] Configuración de redirecciones `301` para URLs antiguas de WordPress (ej: URL numérica `/1798/`).
- [ ] Evitar encadenamiento de redirecciones.
