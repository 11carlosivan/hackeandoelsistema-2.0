import { API_BASE_URL } from '@/constants/Config';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface PostComment {
  id: string;
  user: string;
  text: string;
  date: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string | null;
  coverImage?: string;
  category?: string;
  categorySlug?: string;
  primaryCategory?: {
    name: string;
    slug: string;
  };
  author?: {
    name: string;
    avatar?: string | null;
  };
  publishedAt?: string;
  createdAt?: string;
  isOpinion?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  comments?: PostComment[];
}

export interface Category {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
}

export interface EngagementData {
  postId: string;
  liked: boolean;
  saved: boolean;
  authenticated: boolean;
  counts: {
    likes: number;
    saves: number;
    shares: number;
    comments: number;
  };
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
}

export async function fetchPublicPosts(options: { limit?: number; q?: string; categorySlug?: string } = {}): Promise<Post[]> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.q) params.set('q', options.q);

  let endpoint = `${API_BASE_URL}/api/v1/public/posts?${params.toString()}`;

  if (options.categorySlug) {
    endpoint = `${API_BASE_URL}/api/v1/public/categories/${encodeURIComponent(options.categorySlug)}/posts?${params.toString()}`;
  }

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rawPosts = json.data?.posts || json.data || [];

    return rawPosts.map((item: any) => {
      const rawImage = item.featuredMedia?.url || item.featuredImage || item.coverImage || item.image || item.thumbnailUrl || null;
      return {
        id: item.id || item.slug,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt || item.metaDescription || '',
        content: item.content || item.contentHtml || item.contentText || '',
        featuredImage: resolveImageUrl(rawImage),
        category: item.primaryCategory?.name || item.categoryName || item.category || 'General',
        categorySlug: item.primaryCategory?.slug || item.categorySlug || 'general',
        author: {
          name: item.author?.displayName || item.author?.name || item.authorName || 'Redacción HES',
          avatar: resolveImageUrl(item.author?.avatarUrl || item.author?.avatar),
        },
        publishedAt: item.publishedAt || item.createdAt || new Date().toISOString(),
        isOpinion: (item.primaryCategory?.slug === 'opinion' || item.categorySlug === 'opinion' || item.category?.toLowerCase() === 'opinión' || item.category?.toLowerCase() === 'opinion'),
        likeCount: Number(item.likeCount ?? 0),
        commentCount: Number(item.commentCount ?? 0),
        shareCount: Number(item.shareCount ?? 0),
      };
    });
  } catch (error) {
    console.warn('[API Fetch Error] endpoint:', endpoint, error);
    return getFallbackPosts();
  }
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const endpoint = `${API_BASE_URL}/api/v1/public/posts/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const item = json.data;
    if (!item) return null;

    const rawImage = item.featuredMedia?.url || item.featuredImage || item.coverImage || item.image || null;

    return {
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      content: item.contentHtml || item.content || item.contentText || '',
      featuredImage: resolveImageUrl(rawImage),
      category: item.primaryCategory?.name || item.category || 'Noticias',
      categorySlug: item.primaryCategory?.slug || 'noticias',
      author: {
        name: item.author?.displayName || item.author?.name || 'Redacción HES',
      },
      publishedAt: item.publishedAt || item.createdAt,
      isOpinion: item.primaryCategory?.slug === 'opinion',
      likeCount: Number(item.likeCount ?? 0),
      commentCount: Number(item.commentCount ?? 0),
      shareCount: Number(item.shareCount ?? 0),
      comments: (item.comments || []).map((c: any) => ({
        id: c.id,
        user: c.authorName || c.user?.displayName || c.user || 'Lector HES',
        text: c.body || c.text || '',
        date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' }) : (c.date || ''),
      })),
    };
  } catch (error) {
    console.warn('[API Fetch Error] slug endpoint:', endpoint, error);
    return null;
  }
}

export async function fetchPostEngagement(postId: string, token?: string | null): Promise<EngagementData | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/engagement`, {
      headers,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

export async function togglePostLike(postId: string, liked: boolean, token?: string | null): Promise<{ liked: boolean; likeCount: number } | null> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ liked }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

export async function registerPostShare(postId: string, channel = 'native'): Promise<{ shareCount: number } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

export async function submitPostComment(postId: string, body: string, token: string): Promise<{ success: boolean; comment?: PostComment; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data?.comment) {
      return { success: false, error: json?.message || 'Error al enviar comentario' };
    }
    const c = json.data.comment;
    return {
      success: true,
      comment: {
        id: c.id,
        user: c.user || c.authorName || 'Tú',
        text: c.text || c.body,
        date: 'Reciente',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const endpoint = `${API_BASE_URL}/api/v1/public/categories`;
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    return [
      { id: '1', name: 'Opinión', slug: 'opinion' },
      { id: '2', name: 'Política', slug: 'politica' },
      { id: '3', name: 'Nacionales', slug: 'nacionales' },
      { id: '4', name: 'Internacionales', slug: 'internacionales' },
      { id: '5', name: 'Investigación', slug: 'investigacion' },
      { id: '6', name: 'Tecnología', slug: 'tecnologia' },
    ];
  }
}

function getFallbackPosts(): Post[] {
  return [
    {
      id: 'mock-1',
      title: 'El impacto de la transformación digital en el periodismo independiente',
      slug: 'transformacion-digital-periodismo',
      excerpt: 'Un análisis profundo sobre cómo las nuevas plataformas están cambiando la difusión de noticias en tiempo real.',
      category: 'OPINIÓN',
      categorySlug: 'opinion',
      isOpinion: true,
      author: { name: 'Carlos Castillo' },
      publishedAt: new Date().toISOString(),
      featuredImage: 'https://picsum.photos/800/450',
      likeCount: 14,
      commentCount: 3,
      shareCount: 5,
    },
    {
      id: 'mock-2',
      title: 'Nuevas reformas tecnológicas impulsan la transparencia pública',
      slug: 'reformas-tecnologicas-transparencia',
      excerpt: 'El sector digital recibe un importante respaldo gubernamental para garantizar el acceso ciudadano a la información.',
      category: 'POLÍTICA',
      categorySlug: 'politica',
      isOpinion: false,
      author: { name: 'Redacción HES' },
      publishedAt: new Date().toISOString(),
      featuredImage: 'https://picsum.photos/800/451',
      likeCount: 22,
      commentCount: 6,
      shareCount: 8,
    },
  ];
}

/* ==========================================================================
   SISTEMA DE EMPLEOS (JOBS)
   ========================================================================== */

export interface Job {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  location: string;
  workplaceType: 'ONSITE' | 'REMOTE' | 'HYBRID';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
  category?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  salaryPeriod?: string;
  isSalaryNegotiable?: boolean;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  applicantCount?: number;
  createdAt: string;
}

export interface JobApplicationData {
  fullName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  resumeFileName: string;
  coverLetter?: string;
}

export interface JobApplicationItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  resumeFileName: string;
  coverLetter?: string | null;
  status: 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';
  notes?: string | null;
  createdAt: string;
}

export async function fetchPublicJobs(options: {
  page?: number;
  limit?: number;
  q?: string;
  location?: string;
  workplaceType?: string;
  employmentType?: string;
} = {}): Promise<{ jobs: Job[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.q) params.set('q', options.q);
    if (options.location) params.set('location', options.location);
    if (options.workplaceType) params.set('workplaceType', options.workplaceType);
    if (options.employmentType) params.set('employmentType', options.employmentType);

    const res = await fetch(`${API_BASE_URL}/api/v1/public/jobs?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      jobs: json.data || [],
      total: json.meta?.total || 0,
    };
  } catch (error) {
    console.warn('[Jobs Fetch Error]:', error);
    return { jobs: getFallbackJobs(), total: 2 };
  }
}

export async function fetchJobBySlug(slug: string): Promise<Job | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/jobs/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (error) {
    return null;
  }
}

export async function uploadResumeFile(
  uri: string,
  fileName: string,
  mimeType: string = 'application/pdf',
  token?: string | null
): Promise<{ resumeUrl: string; resumeFileName: string } | null> {
  const uploadUrl = `${API_BASE_URL}/api/v1/jobs/upload-resume`;
  const cleanFileName = fileName || 'curriculum.pdf';
  const cleanMime = mimeType || 'application/pdf';

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // 1. En iOS / Android nativo: FileSystem.uploadAsync delega la petición a NSURLSession / OkHttp
    // Esto evita el fallo 'Network request failed' de la capa JS/Blob de React Native al leer URIs locales
    if (Platform.OS !== 'web' && FileSystem && typeof (FileSystem as any).uploadAsync === 'function') {
      const response = await (FileSystem as any).uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 1,
        fieldName: 'file',
        mimeType: cleanMime,
        parameters: {
          name: cleanFileName,
        },
        headers,
      });

      if (response.status < 200 || response.status >= 300) {
        let errMessage = `Error al subir el currículum (${response.status})`;
        try {
          const parsed = JSON.parse(response.body);
          if (parsed?.message) errMessage = parsed.message;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const json = JSON.parse(response.body);
      if (!json?.data) {
        throw new Error('Respuesta no válida del servidor al subir currículum.');
      }

      return json.data;
    }

    // 2. Fallback para Web: FormData tradicional
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: cleanFileName,
      type: cleanMime,
    } as any);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.data) {
      throw new Error(json?.message || `Error al subir el currículum (${res.status})`);
    }

    return json.data;
  } catch (error: any) {
    console.warn('[Resume Upload Error]:', error);
    throw error;
  }
}


export async function applyToJob(
  jobId: string,
  data: JobApplicationData,
  token?: string | null
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/public/jobs/${encodeURIComponent(jobId)}/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: json?.message || 'No se pudo enviar la postulación' };
    }

    return { success: true, message: json.data?.message || '¡Postulación enviada con éxito!' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de conexión' };
  }
}

export async function createCompanyJob(
  data: any,
  token: string
): Promise<{ success: boolean; job?: Job; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/company/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: json?.message || 'Error al publicar la vacante' };
    }

    return { success: true, job: json.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de conexión' };
  }
}

export async function fetchCompanyJobs(token: string): Promise<Job[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/company/jobs`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function fetchJobApplicants(
  jobId: string,
  token: string
): Promise<{ jobTitle: string; applications: JobApplicationItem[] } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/company/jobs/${encodeURIComponent(jobId)}/applications`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

function getFallbackJobs(): Job[] {
  return [
    {
      id: 'mock-job-1',
      title: 'Desarrollador React Native & Node.js Senior',
      slug: 'desarrollador-react-native-node-senior',
      companyName: '11Ci Media Group',
      location: 'Santo Domingo, República Dominicana',
      workplaceType: 'HYBRID',
      employmentType: 'FULL_TIME',
      category: 'Tecnología',
      salaryMin: 90000,
      salaryMax: 140000,
      salaryCurrency: 'DOP',
      salaryPeriod: 'MONTHLY',
      isSalaryNegotiable: true,
      description: 'Buscamos un ingeniero de software con pasión por el periodismo digital para liderar el ecosistema de apps móviles de Hackeando El Sistema.',
      requirements: '- 3+ años con React Native / Expo\n- Experiencia con APIs REST Fastify/Node.js\n- Manejo de Git y despliegues en Linux/VPS',
      benefits: '- Trabajo híbrido\n- Seguro médico complementario\n- Bonos por objetivos',
      applicantCount: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-job-2',
      title: 'Periodista de Investigación y Redactor Digital',
      slug: 'periodista-investigacion-redactor-digital',
      companyName: 'Hackeando El Sistema',
      location: 'Distrito Nacional, RD',
      workplaceType: 'ONSITE',
      employmentType: 'FULL_TIME',
      category: 'Editorial',
      salaryMin: 65000,
      salaryMax: 95000,
      salaryCurrency: 'DOP',
      salaryPeriod: 'MONTHLY',
      isSalaryNegotiable: false,
      description: 'Responsable de la investigación de denuncias ciudadanas, redacción de reportajes especiales y cobertura de actualidad.',
      requirements: '- Licenciatura en Comunicación Social o Periodismo\n- Capacidad analítica y excelente ortografía\n- Experiencia en medios digitales',
      benefits: '- Viáticos y transporte\n- Horario flexible en coberturas especiales\n- Oportunidad de crecimiento en el canal HES TV',
      applicantCount: 7,
      createdAt: new Date().toISOString(),
    },
  ];
}
