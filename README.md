# Hackeando el Sistema 2.0 — Consola Frontend Network

Este es el nuevo frontend para **Hackeando el Sistema Network**, reconstruido en una Single Page Application (SPA) ultra veloz utilizando **React + Vite** y **TailwindCSS**. La interfaz hereda una estética de terminal de ciber-inteligencia y seguridad informática (estilo cyberpunk), optimizada para suplantar el antiguo sistema de WordPress sin perder estructura editorial ni posicionamiento SEO.

---

## ⚡ Características Principales

1. **Estructura Editorial Completa**:
   - **Home (Portada)**: Carrusel táctico, cintillo animado de noticias de última hora, ranking de tendencias por accesos, bloques automáticos por sección y reproductor HES TV.
   - **Investigaciones y Opinión**: Artículos e informes de inteligencia estructurados en una grilla avanzada de 12 columnas que centra el contenido de lectura y desplaza la barra de interacción y anuncios al extremo derecho.
2. **Páginas de Tráfico y Captación**:
   - **Planes de Publicación**: Matriz de tarifas de comunicados patrocinados de libre rastreo para buscadores.
   - **Pasarela de Pago (Checkout)**: Formulario interactivo que soporta simulación de transacciones con Tarjeta de Crédito y Bitcoin (Crypto).
   - **Crear Publicación**: Portal cliente que valida créditos del plan contratado y muestra una línea de tiempo del estado del artículo en la mesa editorial.
3. **Consolas de Acceso Seguro**:
   - Formulario de **Acceso (Login)**, **Registro de Agentes** (con campos requeridos marcados) y **Recuperación de Clave**. Todos los accesos muestran simulaciones de Handshakes PGP en consola y exclusión estricta de motores de búsqueda (`NOINDEX, NOFOLLOW`).
4. **Enrutador Dinámico de Páginas Estáticas**:
   - Un solo controlador dinámico (`/pagina/:slug`) para cargar y renderizar en formato HTML directo políticas de privacidad (`privacy-policy`), lineamientos editoriales (`politicas-de-publicacion`) y suscripción de alertas (`suscripcion`).

---

## 🎨 Sistema de Diseño y Estética Ciberpunk

El diseño está regido por principios de bordes angulares afilados, rejillas de escaneo tácticas y contrastes de terminales de fósforo.

### 🟥 Paleta de Colores
Definida en [tailwind.config.js](file:///c:/Users/carlo/OneDrive/Escritorio/hackeandoelsistema%202.0/tailwind.config.js) para mantener la consistencia cromática:

| Color | Hexadecimal | Variable CSS / Tailwind | Propósito / Uso |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | `#131313` | `bg-background` | Fondo general oscuro del sistema de terminales |
| **Contenedor Primario** | `#1f1f1f` | `bg-surface-container` | Cajas de componentes, widgets laterales y bloques |
| **Rojo Sistema** | `#E63946` | `text-system-red` / `bg-system-red` | Color de acento primario, botones H.E.S, alertas y cursor |
| **Verde Matriz** | `#00FF41` | `text-data-green` | Textos de sesión segura, captchas válidos e inyecciones de datos |
| **Gris Terminal** | `#212121` | `border-terminal-gray` | Bordes de grilla y divisores de líneas HUD |
| **Texto Principal** | `#e2e2e2` | `text-on-surface` | Texto general de lectura, títulos secundarios |
| **Texto Secundario** | `#e4bebc` | `text-on-surface-variant` | Extractos de noticias, descripciones y pies de foto |

### 🔠 Tipografía
Importada desde fuentes seguras para recrear la visualización de datos:

* **Títulos y Cabeceras**: `Anton` (Sans-serif)
  - *Clase*: `font-headline-xl`, `font-headline-lg`
  - *Visual*: Estilo condensado, alto impacto, mayúsculas cerradas.
* **Texto de Lectura / Párrafos**: `Hanken Grotesk` (Sans-serif)
  - *Clase*: `font-body-md`, `font-body-lg`
  - *Visual*: Altamente legible para columnas de opinión y textos extensos de investigación.
* **Etiquetas, Métricas y Terminal**: `JetBrains Mono` (Monospace)
  - *Clase*: `font-label-caps`, `font-label-sm`
  - *Visual*: Ancho fijo para logs de conexión, contadores de visitas, coordenadas PGP y clearance de agentes.

### 📐 Reglas de Estilo Visual
- **Sharp Corners (Esquinas Afiladas)**: No se utilizan bordes redondeados (`border-radius: 0px`) en botones, contenedores de tarjetas, envoltorios de imágenes ni paneles de formularios para emular interfaces de hardware industrial de red.
- **Scanlines**: Superposición de animación css animada (`scanline`) para crear un efecto de monitor de tubo de rayos catódicos (CRT) sobre retratos e imágenes destacadas.
- **Glassmorphism**: Fondos semi-translúcidos difuminados (`glass-terminal`) para consolas modales o flotantes.

---

## 🔍 Migración y Control SEO
Cada página actualiza dinámicamente sus meta-etiquetas del DOM al ser montada:
- **Indexación Selectiva**: Pantallas como artículos, planes y categorías se marcan con `INDEX, FOLLOW`. Vistas privadas, resultados de búsqueda y paneles de login fuerzan `NOINDEX, NOFOLLOW`.
- **Estructura Canonical**: Se inyectan etiquetas `<link rel="canonical" href="...">` para asegurar que el motor de búsqueda no detecte contenido duplicado.
- **Checklist**: Se incluye un checklist interactivo directamente en el IDE en [MIGRATION_CHECKLIST.md](file:///c:/Users/carlo/OneDrive/Escritorio/hackeandoelsistema%202.0/MIGRATION_CHECKLIST.md) para auditar los 15 puntos de data antes de la delegación final de DNS.

---

## 🚀 Instrucciones de Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- npm (v9 o superior)

### Instalación de Dependencias
```bash
npm install
```

### Ejecutar Servidor de Desarrollo
```bash
npm run dev
```

### Compilar para Producción
```bash
npm run build
```
La build optimizada se generará en el directorio `/dist/` lista para ser desplegada en Vercel, Netlify o cualquier servidor estático.
