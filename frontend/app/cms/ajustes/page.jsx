import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsHomeSettingsPanel from '@/components/main-design/cms-home-settings-panel';
import { getCmsCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Ajustes de Portada - CMS',
  description: 'Gestiona la selección de categorías y diseño de cuadros en la página de inicio.',
  path: '/cms/ajustes',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  
  const categoriesResult = await getCmsCategories(accessToken, { limit: 100 });

  return (
    <Layout>
      <CmsHomeSettingsPanel
        allCategories={categoriesResult.categories || []}
        accessToken={accessToken}
      />
    </Layout>
  );
}
