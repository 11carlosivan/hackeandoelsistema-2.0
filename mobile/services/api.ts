import { API_BASE_URL } from '@/constants/Config';

export interface Post {
  id: string | number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  coverImage?: string;
  category?: string;
  categorySlug?: string;
  primaryCategory?: {
    name: string;
    slug: string;
  };
  author?: {
    name: string;
    avatar?: string;
  };
  publishedAt?: string;
  createdAt?: string;
  isOpinion?: boolean;
}

export interface Category {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
}

export async function fetchPublicPosts(options: { limit?: number; q?: string; categorySlug?: string } = {}): Promise<Post[]> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.q) params.set('q', options.q);

    let endpoint = `${API_BASE_URL}/api/v1/public/posts?${params.toString()}`;

    if (options.categorySlug) {
      endpoint = `${API_BASE_URL}/api/v1/public/categories/${encodeURIComponent(options.categorySlug)}/posts?${params.toString()}`;
    }

    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rawPosts = json.data?.posts || json.data || [];

    return rawPosts.map((item: any) => ({
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || item.metaDescription || '',
      content: item.content || '',
      featuredImage: item.featuredImage || item.coverImage || item.image || item.thumbnailUrl || null,
      category: item.primaryCategory?.name || item.categoryName || item.category || 'General',
      categorySlug: item.primaryCategory?.slug || item.categorySlug || 'general',
      author: {
        name: item.author?.displayName || item.author?.name || item.authorName || 'Redacción HES',
        avatar: item.author?.avatarUrl || null,
      },
      publishedAt: item.publishedAt || item.createdAt || new Date().toISOString(),
      isOpinion: (item.primaryCategory?.slug === 'opinion' || item.categorySlug === 'opinion' || item.category?.toLowerCase() === 'opinión' || item.category?.toLowerCase() === 'opinion'),
    }));
  } catch (error) {
    console.warn('API Fetch Error:', error);
    return getFallbackPosts();
  }
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/posts/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const item = json.data;

    return {
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      content: item.content || '',
      featuredImage: item.featuredImage || item.coverImage || item.image || null,
      category: item.primaryCategory?.name || item.category || 'Noticias',
      categorySlug: item.primaryCategory?.slug || 'noticias',
      author: {
        name: item.author?.displayName || item.author?.name || 'Redacción HES',
      },
      publishedAt: item.publishedAt || item.createdAt,
      isOpinion: item.primaryCategory?.slug === 'opinion',
    };
  } catch (error) {
    return null;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/public/categories`, {
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
    },
    {
      id: 'mock-3',
      title: '¿Hacia dónde va la ciberseguridad en los medios de comunicación?',
      slug: 'ciberseguridad-medios-comunicacion',
      excerpt: 'Los retos actuales de proteger la integridad periodística frente a los ataques distribuidos.',
      category: 'OPINIÓN',
      categorySlug: 'opinion',
      isOpinion: true,
      author: { name: 'Jorge Lu' },
      publishedAt: new Date().toISOString(),
      featuredImage: 'https://picsum.photos/800/452',
    },
  ];
}
