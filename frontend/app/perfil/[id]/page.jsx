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
  return tryLoadAuthorByIdentifier(id, {
    getById: getAuthorArchiveById,
  });
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sourcePath = `/perfil/${id}/`;
  const author = await loadAuthor(id);

  if (!author) {
    return buildMetadata({ title: 'Perfil no encontrado', path: sourcePath, noIndex: true });
  }

  return buildMetadata({
    title: author.displayName,
    description: author.bio || `Archivo publico de publicaciones de ${author.displayName}.`,
    path: getAuthorCanonicalPath(author) || sourcePath,
    image: author.avatar?.url,
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

  if (!author) {
    notFound();
  }

  const canonicalPath = getAuthorCanonicalPath(author);

  if (shouldRedirectToCanonical(sourcePath, canonicalPath)) {
    permanentRedirect(canonicalPath);
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <UserProfileHeader author={author} />
        <UserProfileTabs author={author} />
      </div>
    </PublicLayout>
  );
}
