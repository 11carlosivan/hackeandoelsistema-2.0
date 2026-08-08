import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsAutoPostPanel from '@/components/main-design/cms-auto-post-panel';
import CmsSessionActions from '@/components/main-design/cms-session-actions';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getCmsAutoPostSettings, getCmsCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Auto-Post IA - CMS',
  description: 'Módulo de recopilación y generación automática de noticias con IA.',
  path: '/cms/auto-post',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;

  const [settings, categoriesResult] = await Promise.all([
    getCmsAutoPostSettings(accessToken),
    getCmsCategories(accessToken, { limit: 100 }),
  ]);

  return (
    <Layout>
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / AUTOMATIZACIÓN Y REDACCIÓN IA"
          title="Auto-Post Noticiero IA"
          description="Recopila noticias de periódicos vía RSS, las reescribe en profundidad con Gemini/OpenAI e inserta la imagen destacada automáticamente."
          stats={[
            { label: 'PROVEEDOR', value: (settings.aiProvider || 'gemini').toUpperCase(), icon: 'psychology' },
            { label: 'ESTADO DEFAULT', value: settings.postStatus || 'DRAFT', icon: 'edit_note' },
            { label: 'NOTICIAS PROCESADAS', value: Number(settings.processedCount || 0).toLocaleString('es-DO'), icon: 'check_circle' },
          ]}
        />

        <div className="flex justify-end mb-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cms"
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
            >
              Volver al Dashboard
            </Link>
            <CmsSessionActions />
          </div>
        </div>

        <CmsAutoPostPanel
          initialSettings={settings}
          categories={categoriesResult.categories || []}
          accessToken={accessToken}
        />
      </div>
    </Layout>
  );
}
