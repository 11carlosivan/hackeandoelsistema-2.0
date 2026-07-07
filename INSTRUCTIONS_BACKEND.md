# Instrucciones de Integración Backend & Base de Datos
## Proyecto: Hackeando el Sistema (V2.0)

Este documento sirve como guía para el desarrollador de backend y base de datos. Detalla las rutas de API esperadas, los modelos de datos sugeridos y el flujo de integración para conectar este frontend de React con el backend definitivo.

Actualmente, el frontend utiliza datos simulados centralizados en `src/data/mockData.js`. La integración se puede realizar reemplazando las importaciones de ese archivo con llamadas `fetch` o `axios` a los endpoints detallados a continuación.

---

## 1. Endpoints de API Requeridos (REST API)

### 📌 Artículos e Investigaciones
*   **`GET /api/articles`**
    *   *Descripción:* Obtiene la lista de artículos. Debe soportar filtros.
    *   *Query Parameters:*
        *   `category` (Opcional): Filtra por categoría (ej. `NACIONALES`, `POLÍTICA`, `TECNOLOGÍA`).
        *   `q` (Opcional): Término de búsqueda para título, subtítulo o etiquetas.
        *   `limit` (Opcional): Limita la cantidad de resultados (ej. para la Portada).
    *   *Respuesta Excitosa (200 OK):* Array de objetos artículo.
*   **`GET /api/articles/:id`**
    *   *Descripción:* Obtiene el detalle completo de un artículo por su ID / Slug.
    *   *Respuesta Exitosa (200 OK):* Objeto artículo con sus bloques de contenido.
*   **`POST /api/articles`**
    *   *Descripción:* Permite a los redactores crear un nuevo artículo desde el CMS.
    *   *Headers:* Requiere Token de Sesión/Autenticación.
    *   *Body (JSON):* `{ title, subtitle, category, tag, clearance, content, attachments }`

### 📌 Autores y Agentes
*   **`GET /api/authors/:id`**
    *   *Descripción:* Obtiene la información de perfil de un redactor/agente y su listado de artículos publicados.
    *   *Respuesta Exitosa (200 OK):* `{ author: { id, name, role, bio, photo, clearance, location, fingerprint, specializations }, articles: [...] }`

### 📌 Comentarios (Sistema de Red Descentralizada)
*   **`GET /api/articles/:id/comments`**
    *   *Descripción:* Obtiene los comentarios de un artículo específico.
    *   *Respuesta:* Array de comentarios `{ id, user, date, text }`.
*   **`POST /api/articles/:id/comments`**
    *   *Descripción:* Inserta un nuevo comentario.
    *   *Body (JSON):* `{ user, text }` (Soportar usuario anónimo por defecto).

### 📌 Contacto Seguro (Buzón de Filtraciones)
*   **`POST /api/leaks`**
    *   *Descripción:* Recibe los paquetes de filtraciones encriptados enviados por informantes anónimos.
    *   *Body (JSON):* `{ alias, email, leakType, message, selfDestruct }`
    *   *Seguridad:* Se sugiere no registrar direcciones IP de origen y limpiar los metadatos de archivos adjuntos cargados.

### 📌 Estadísticas de Sistema (Widgets de Barra Lateral)
*   **`GET /api/system/stats`**
    *   *Descripción:* Obtiene los datos dinámicos de clima, tasa de cambio del dólar, video de HES TV y la encuesta activa.
    *   *Respuesta (200 OK):*
        ```json
        {
          "weather": { "city": "Santo Domingo", "temp": 29, "condition": "Nublado", "icon": "partly_cloudy_day" },
          "dollarRate": { "pair": "USD/DOP", "buy": 59.95, "sell": 60.15, "trend": "up" },
          "hesTv": { "title": "HES TV", "url": "iframe-url", "thumbnail": "url" },
          "activePoll": {
            "question": "¿Confía en los semáforos inteligentes?",
            "totalVotes": 3412,
            "options": [
              { "id": "a", "label": "No", "votes": 2450 },
              { "id": "b", "label": "Sí", "votes": 962 }
            ]
          }
        }
        ```
*   **`POST /api/system/poll/vote`**
    *   *Descripción:* Registra un voto para la encuesta de la barra lateral.
    *   *Body (JSON):* `{ optionId }`

---

## 2. Modelos de Base de Datos Sugeridos (Relacional - PostgreSQL/MySQL)

### Tabla: `authors`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` (PK) | VARCHAR(50) | Identificador único / slug del autor (ej: `v-shadows`) |
| `name` | VARCHAR(100) | Nombre visible |
| `role` | VARCHAR(100) | Rol (ej: "Agente de Campo") |
| `bio` | TEXT | Biografía descriptiva |
| `photo` | VARCHAR(255) | URL de la foto de perfil |
| `clearance` | VARCHAR(50) | Nivel de acceso (ej: "LEVEL 5") |
| `location` | VARCHAR(100) | Ubicación simulada en coordenadas |
| `fingerprint` | VARCHAR(50) | Identificador de PGP |
| `specializations` | TEXT[] | Array de especialidades del agente |

### Tabla: `articles`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` (PK) | VARCHAR(100) | Slug identificador de ruta (ej: `la-gran-brecha-...`) |
| `title` | VARCHAR(255) | Título principal (Anton font) |
| `subtitle` | TEXT | Copete o resumen corto |
| `category` | VARCHAR(50) | Criterio de navegación (NACIONALES, POLÍTICA, etc.) |
| `tag` | VARCHAR(50) | Etiqueta HUD decorativa (ej: `OPERATIVO SQUASH`) |
| `author_id` (FK) | VARCHAR(50) | Relación con `authors.id` |
| `date` | TIMESTAMP | Fecha de publicación |
| `views` | INT | Contador de vistas |
| `read_time` | VARCHAR(20) | Tiempo de lectura estimado (ej: "12 MIN") |
| `image` | VARCHAR(255) | Imagen destacada principal |
| `is_hero` | BOOLEAN | Indica si se destaca en el slider superior |
| `is_featured` | BOOLEAN | Indica si figura en destacados |
| `content` | JSONB | Estructura de bloques del contenido (párrafos, imágenes, quotes) |
| `veracity` | JSONB | Métricas de veracidad: `{ factCheck: 95, sourceCheck: 92, aiAnalysis: 89 }` |

### Tabla: `comments`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` (PK) | BIGSERIAL | Autoincremental |
| `article_id` (FK) | VARCHAR(100) | Relación con `articles.id` |
| `user` | VARCHAR(50) | Identificador del comentador (firma) |
| `date` | TIMESTAMP | Fecha de creación |
| `text` | TEXT | Mensaje del comentario |

### Tabla: `leaks`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` (PK) | BIGSERIAL | Autoincremental |
| `alias` | VARCHAR(100) | Identificador provisto o anónimo |
| `email` | VARCHAR(255) | Correo opcional |
| `leak_type` | VARCHAR(50) | FILTRACIÓN_DATOS, VULNERABILIDAD_O_DAY, etc. |
| `message` | TEXT | Detalle encriptado |
| `self_destruct` | BOOLEAN | Si se elimina físicamente tras leerse |
| `created_at` | TIMESTAMP | Fecha de transmisión |

---

## 3. Ejemplo de Integración en React (Frontend)

Para conectar las llamadas dinámicas, puedes crear un servicio de API simple (`src/services/api.js`):

```javascript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getArticles = async (category = '') => {
  const url = category ? `${API_BASE}/articles?category=${category}` : `${API_BASE}/articles`;
  const res = await axios.get(url);
  return res.data;
};

export const getArticleById = async (id) => {
  const res = await axios.get(`${API_BASE}/articles/${id}`);
  return res.data;
};

export const postComment = async (articleId, user, text) => {
  const res = await axios.post(`${API_BASE}/articles/${articleId}/comments`, { user, text });
  return res.data;
};

export const postLeak = async (leakData) => {
  const res = await axios.post(`${API_BASE}/leaks`, leakData);
  return res.data;
};
```
Luego, en componentes como `Home.jsx` o `ArticleDetail.jsx`, reemplaza la lectura de variables locales por hooks de React (`useEffect`) consumiendo estas funciones de servicio de API.
