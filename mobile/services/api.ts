export { API_BASE_URL } from '@/constants/Config';
import { API_BASE_URL } from '@/constants/Config';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PostComment {
  id: string;
  userId?: string | null;
  parentId?: string | null;
  user: string;
  avatarUrl?: string | null;
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
  relatedPosts?: Array<{
    id: string;
    title: string;
    slug: string;
    featuredImage?: string | null;
    category?: string;
    publishedAt?: string;
  }>;
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

export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('content://') ||
    url.startsWith('ph://') ||
    url.startsWith('data:')
  ) {
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
        isOpinion: Boolean(
          item.postType === 'OPINION' ||
          item.primaryCategory?.name === 'Opinión' ||
          item.primaryCategory?.slug === 'opinion' ||
          item.categorySlug === 'opinion' ||
          item.category === 'Opinión' ||
          item.category?.toLowerCase() === 'opinión' ||
          item.category?.toLowerCase() === 'opinion' ||
          (Array.isArray(item.categories) && item.categories.some((c: any) => (
            c.name === 'Opinión' ||
            c.name?.toLowerCase() === 'opinión' ||
            c.name?.toLowerCase() === 'opinion' ||
            c.slug === 'opinion'
          )))
        ),
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
      isOpinion: Boolean(
        item.postType === 'OPINION' ||
        item.primaryCategory?.name === 'Opinión' ||
        item.primaryCategory?.slug === 'opinion' ||
        item.category === 'Opinión' ||
        item.category?.toLowerCase() === 'opinión' ||
        item.category?.toLowerCase() === 'opinion' ||
        (Array.isArray(item.categories) && item.categories.some((c: any) => (
          c.name === 'Opinión' ||
          c.name?.toLowerCase() === 'opinión' ||
          c.name?.toLowerCase() === 'opinion' ||
          c.slug === 'opinion'
        )))
      ),
      likeCount: Number(item.likeCount ?? 0),
      commentCount: Number(item.commentCount ?? 0),
      shareCount: Number(item.shareCount ?? 0),
      comments: (item.comments || []).map((c: any) => ({
        id: c.id,
        parentId: c.parentId || null,
        user: c.authorName || c.user?.displayName || c.user || 'Lector HES',
        text: c.body || c.text || '',
        date: c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' }) : (c.date || ''),
      })),
      relatedPosts: (item.relatedPosts || []).map((rp: any) => ({
        id: rp.id,
        title: rp.title,
        slug: rp.slug,
        featuredImage: resolveImageUrl(rp.featuredMedia?.url || rp.featuredImage || rp.image || null),
        category: rp.primaryCategory?.name || rp.category || 'Noticias',
        publishedAt: rp.publishedAt || rp.createdAt,
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

export async function submitPostComment(
  postId: string,
  body: string,
  token: string,
  parentId?: string | null,
): Promise<{ success: boolean; comment?: PostComment; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body, parentId: parentId || undefined }),
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
        parentId: c.parentId || null,
        user: c.user || c.authorName || 'Tú',
        text: c.text || c.body,
        date: 'Reciente',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function togglePostSave(
  postId: string,
  saved: boolean,
  token: string
): Promise<{ saved: boolean; saveCount: number } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ saved }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

export async function fetchPostComments(postId: string): Promise<PostComment[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    if (!json?.data || !Array.isArray(json.data)) return [];
    return json.data.map((c: any) => ({
      id: c.id,
      userId: c.userId || null,
      parentId: c.parentId || null,
      user: c.user || c.authorName || 'Lector HES',
      avatarUrl: c.avatarUrl || null,
      text: c.text || c.body,
      date: c.date ? new Date(c.date).toLocaleDateString('es-DO', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Reciente',
    }));
  } catch (err) {
    return [];
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

export async function uploadAvatarImage(
  uri: string,
  fileName: string = 'avatar.jpg',
  mimeType: string = 'image/jpeg',
  token?: string | null
): Promise<{ avatarUrl: string } | null> {
  const uploadUrl = `${API_BASE_URL}/api/v1/auth/avatar`;
  const cleanFileName = fileName || 'avatar.jpg';
  const cleanMime = mimeType || 'image/jpeg';

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // 1. En iOS / Android nativo: FileSystem.uploadAsync para manejar URIs de archivo nativas
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
        let errMessage = `Error al subir la imagen (${response.status})`;
        try {
          const parsed = JSON.parse(response.body);
          if (parsed?.message) errMessage = parsed.message;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const json = JSON.parse(response.body);
      return json?.data || null;
    }

    // 2. Web fallback
    const formData = new FormData();
    const fetchBlob = await fetch(uri);
    const blob = await fetchBlob.blob();
    formData.append('file', blob, cleanFileName);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data) {
      throw new Error(json?.message || `Error al subir la foto (${res.status})`);
    }

    return json.data;
  } catch (error: any) {
    console.warn('[Avatar Upload Error]:', error);
    return null;
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

export interface UserProfileData {
  id: string;
  displayName: string;
  username?: string | null;
  email?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  createdAt?: string;
  followersCount: number;
  followingCount: number;
  savedPostsCount?: number;
  unreadNotificationsCount?: number;
  isFollowing?: boolean;
}

export interface InAppNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  postSlug?: string | null;
  postId?: string | null;
  commentId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
}

export interface FollowUserItem {
  id: string;
  displayName: string;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  followedAt: string;
}

export async function fetchSavedPosts(token: string): Promise<Post[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/saved-posts`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.data?.posts || [];
    return raw.map((item: any) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      featuredImage: resolveImageUrl(item.featuredImageUrl),
      category: item.category?.name || 'General',
      categorySlug: item.category?.slug || 'general',
      publishedAt: item.publishedAt,
      createdAt: item.savedAt,
      likeCount: item.likeCount || 0,
      commentCount: 0,
    }));
  } catch {
    return [];
  }
}

export async function fetchNotifications(token: string): Promise<{ notifications: InAppNotificationItem[]; unreadCount: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/notifications`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    const json = await res.json();
    return {
      notifications: json.data?.notifications || [],
      unreadCount: json.data?.unreadCount || 0,
    };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationRead(id: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/notifications/read-all`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchUserProfile(id: string, token?: string | null): Promise<UserProfileData | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/public/users/${encodeURIComponent(id)}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.user || null;
  } catch {
    return null;
  }
}

export async function updateMyProfile(
  data: { displayName?: string; bio?: string; avatarUrl?: string; phone?: string },
  token: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: json?.message || 'Error al actualizar el perfil' };
    }
    return { success: true, user: json.data?.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function toggleFollowUser(
  id: string,
  token: string
): Promise<{ success: boolean; following?: boolean; followersCount?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/users/${encodeURIComponent(id)}/follow`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: json?.message || 'No se pudo realizar la acción' };
    }
    return {
      success: true,
      following: json.data?.following,
      followersCount: json.data?.followersCount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function fetchUserFollowers(id: string): Promise<FollowUserItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/users/${encodeURIComponent(id)}/followers`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.users || [];
  } catch {
    return [];
  }
}

export async function fetchUserFollowing(id: string): Promise<FollowUserItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/users/${encodeURIComponent(id)}/following`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.users || [];
  } catch {
    return [];
  }
}

// ==================== TIPOS Y SERVICIOS COMUNIDAD & FEED ====================
export interface PollOptionItem {
  id: string;
  text: string;
  votesCount: number;
  percentage: number;
}

export interface PollItem {
  id: string;
  question: string;
  totalVotes: number;
  options: PollOptionItem[];
  daysRemaining?: string;
  expiresAt?: string;
}

export interface CommunityPostItem {
  id: string;
  content: string;
  mediaUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  isLiked?: boolean;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    isFollowing?: boolean;
    isNucleo?: boolean;
  };
  poll?: PollItem | null;
}

export interface SponsoredPostItem {
  id: string;
  sponsorName: string;
  sponsorHandle?: string | null;
  sponsorLogo?: string | null;
  title: string;
  content: string;
  mediaUrl?: string | null;
  ctaText: string;
  ctaUrl: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isSponsored: boolean;
}

export async function fetchCommunityPosts(token?: string | null): Promise<CommunityPostItem[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts?limit=50`, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.posts || [];
  } catch {
    return [];
  }
}

export async function createCommunityPost(
  data: {
    content: string;
    mediaUrl?: string | null;
    poll?: { question: string; options: string[]; expiresDays?: number } | null;
  },
  token: string
): Promise<{ success: boolean; post?: CommunityPostItem; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts`, {
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
      return { success: false, error: json?.message || 'Error al publicar' };
    }
    return { success: true, post: json.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

export async function toggleCommunityPostLike(
  postId: string,
  token: string
): Promise<{ success: boolean; liked?: boolean; likesCount?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return { success: false };
    const json = await res.json();
    return { success: true, liked: json.data?.liked, likesCount: json.data?.likesCount };
  } catch {
    return { success: false };
  }
}

export async function fetchCommunityComments(postId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts/${encodeURIComponent(postId)}/comments`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.comments || [];
  } catch {
    return [];
  }
}

export async function submitCommunityComment(
  postId: string,
  content: string,
  token: string
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { success: false, error: json?.message || 'Error al comentar' };
    return { success: true, comment: json.data?.comment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function repostCommunityPost(
  postId: string,
  token: string
): Promise<{ success: boolean; repostsCount?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/community/posts/${encodeURIComponent(postId)}/repost`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { success: false, error: json?.message || 'Error al repostear' };
    return { success: true, repostsCount: json.data?.repostsCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchPolls(): Promise<PollItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/polls`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.polls || [];
  } catch {
    return [];
  }
}

export async function submitPollVote(pollId: string, optionId: string): Promise<{ success: boolean; poll?: PollItem }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/polls/${encodeURIComponent(pollId)}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ optionId }),
    });
    if (!res.ok) return { success: false };
    const json = await res.json();
    return { success: true, poll: json.data?.poll };
  } catch {
    return { success: false };
  }
}

export async function fetchSponsoredPosts(): Promise<SponsoredPostItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/sponsored-posts`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.ads || [];
  } catch {
    return [];
  }
}

export interface SearchOverviewData {
  trends: Array<{ id: string; tag: string; topic: string; postsCount: string; category: string }>;
  users: Array<{ id: string; displayName: string; username?: string | null; bio?: string | null; avatarUrl?: string | null }>;
}

export async function fetchSearchOverview(q?: string): Promise<SearchOverviewData> {
  try {
    const url = q ? `${API_BASE_URL}/api/v1/public/search/overview?q=${encodeURIComponent(q)}` : `${API_BASE_URL}/api/v1/public/search/overview`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { trends: [], users: [] };
    const json = await res.json();
    return json.data || { trends: [], users: [] };
  } catch {
    return { trends: [], users: [] };
  }
}

export async function fetchSystemStats(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/system-stats`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

const COMMUNITY_BOOKMARKS_KEY = '@hes_saved_community_posts';

export async function getSavedCommunityPosts(): Promise<CommunityPostItem[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function toggleSaveCommunityPost(post: CommunityPostItem): Promise<boolean> {
  try {
    const posts = await getSavedCommunityPosts();
    const exists = posts.some((p) => p.id === post.id);
    let updated: CommunityPostItem[];
    if (exists) {
      updated = posts.filter((p) => p.id !== post.id);
    } else {
      updated = [post, ...posts];
    }
    await AsyncStorage.setItem(COMMUNITY_BOOKMARKS_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

export async function isCommunityPostSaved(postId: string): Promise<boolean> {
  try {
    const posts = await getSavedCommunityPosts();
    return posts.some((p) => p.id === postId);
  } catch {
    return false;
  }
}


