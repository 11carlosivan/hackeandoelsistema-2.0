import { cookies } from 'next/headers';
import Link from 'next/link';
import Layout from '@/components/main-design/layout';
import CmsAutoPostPanel from '@/components/main-design/cms-auto-post-panel';
import CmsSessionActions from '@/components/main-design/cms-session-actions';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getCmsAutoPostSettings, getCmsCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Auto-Post IA - CMS',
  description: 'Modulo de recopilacion y generacion asistida de noticias.',
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
          eyebrow="CMS / AUTOMATIZACION"
          title="Auto-Post IA"
          description="Recopila feeds RSS, reescribe notas con IA y crea borradores o publicaciones listas para revision editorial."
          stats={[
            { label: 'PROVEEDOR', value: (settings.aiProvider || 'gemini').toUpperCase(), icon: 'psychology' },
            { label: 'ESTADO', value: settings.postStatus || 'DRAFT', icon: 'edit_note' },
            { label: 'PROCESADAS', value: Number(settings.processedCount || 0).toLocaleString('es-DO'), icon: 'check_circle' },
          ]}
        />

        <div className="mb-8 flex justify-end">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cms"
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
            >
              Volver al dashboard
            </Link>
            <CmsSessionActions />
          </div>
        </div>

        <CmsAutoPostPanel
          initialSettings={settings}
          categories={categoriesResult.categories || []}
        />
      </div>
    </Layout>
  );
}
