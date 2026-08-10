import PublicLayout from '@/components/main-design/public-layout';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import UserProfileTabs from '@/components/user/UserProfileTabs';
import { getAuthorArchiveById } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  getAuthorCanonicalPath,
  tryLoadAuthorByIdentifier,
} from '@/lib/main-design/public-shortcuts';

export const dynamicParams = true;
export const revalidate = 180;

async function loadAuthor(id) {
  try {
    return await tryLoadAuthorByIdentifier(id, {
      getById: getAuthorArchiveById,
    });
  } catch {
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
  const author = await loadAuthor(id);

  const decodedId = decodeURIComponent(id || '');
  const formattedName = decodedId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const normalizedId = decodedId.toLowerCase().trim();
  const authorRoles = Array.isArray(author?.roles) ? author.roles : [];
  const isCmsProfile = ['admin', 'administrador-hes', 'administrador hes', 'administrator-hes'].includes(normalizedId)
    || authorRoles.some((role) => ['ADMIN', 'EDITOR'].includes(String(role).toUpperCase()))
    || ['administrador hes', 'administrator hes'].includes(String(author?.displayName || author?.name || '').toLowerCase().trim());

  // Si no se encuentra autor en la API, creamos un objeto lector por defecto.
  const user = author ? {
    nombre: isCmsProfile ? 'Administrador HES' : (author.displayName || author.name),
    apellido: '',
    correo: author.email || 'lector@hackeandoelsistema.com',
    fotoPerfil: author.avatar?.url || author.photo || '/isotipo.png',
    fotoPortada: author.coverUrl || '/logo.png',
    isVerified: true,
    isAdmin: isCmsProfile,
    roles: authorRoles,
    bio: author.bio || 'Lector verificado y colaborador activo de Hackeando el Sistema Network.',
    stats: {
      posts: author.stats?.posts || (isCmsProfile ? 2 : 3),
      reposts: isCmsProfile ? 2 : 5,
      commentsMade: isCmsProfile ? 6 : 14,
      commentsReceived: isCmsProfile ? 4 : 8,
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
    fotoPortada: '/logo.png',
    isVerified: true,
    isAdmin: isCmsProfile,
    roles: isCmsProfile ? ['ADMIN'] : ['MEMBER'],
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

