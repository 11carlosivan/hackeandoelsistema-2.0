import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import UserProfileTabs from '@/components/user/UserProfileTabs';
import { getAuthorArchiveById } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  getAuthorCanonicalPath,
  shouldRedirectToCanonical,
  tryLoadAuthorByIdentifier,
} from '@/lib/main-design/public-shortcuts';

export const dynamicParams = true;
export const revalidate = 180;

async function loadAuthor(id) {
  try {
    return await tryLoadAuthorByIdentifier(id, {
      getById: getAuthorArchiveById,
    });
  } catch (_) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sourcePath = `/perfil/${id}/`;
  const author = await loadAuthor(id);

  if (!author) {
    return buildMetadata({ title: 'Perfil no encontrado', path: sourcePath, noIndex: true });
  }

  return buildMetadata({
    title: author.displayName || author.name,
    description: author.bio || `Perfil de lector y publicaciones de ${author.displayName || author.name}.`,
    path: getAuthorCanonicalPath(author) || sourcePath,
    image: author.avatar?.url || author.photo,
    type: 'profile',
  });
}

export function generateStaticParams() {
  return [];
}

export default async function Page({ params }) {
  const { id } = await params;
  const sourcePath = `/perfil/${id}/`;
  const author = await loadAuthor(id);

  const decodedId = decodeURIComponent(id || '');
  const formattedName = decodedId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // Si no se encuentra autor en el mock/api legacy, creamos un objeto lector por defecto
  const user = author ? {
    nombre: author.displayName || author.name,
    apellido: '',
    correo: author.email || 'lector@hackeandoelsistema.com',
    fotoPerfil: author.avatar?.url || author.photo || '/isotipo.png',
    fotoPortada: author.coverUrl || '/hes developer.png',
    isVerified: true,
    bio: author.bio || 'Lector verificado y colaborador activo de Hackeando el Sistema Network.',
    stats: {
      posts: author.stats?.posts || 3,
      reposts: 5,
      commentsMade: 14,
      commentsReceived: 8,
    },
    direccion: {
      pais: 'República Dominicana',
      ciudad: 'Santo Domingo',
      provincia: 'Distrito Nacional',
      sectorBarrio: 'Piantini',
      calle: 'Av. Winston Churchill',
    }
  } : {
    nombre: formattedName || 'Lector',
    apellido: '',
    correo: `${decodedId}@hackeandoelsistema.com`,
    fotoPerfil: '/isotipo.png',
    fotoPortada: '/hes developer.png',
    isVerified: true,
    bio: 'Lector verificado y colaborador activo de Hackeando el Sistema Network.',
    stats: { posts: 0, reposts: 2, commentsMade: 6, commentsReceived: 4 },
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <UserProfileHeader user={user} isOwnProfile={true} />
        <UserProfileTabs />
      </div>
    </PublicLayout>
  );
}

