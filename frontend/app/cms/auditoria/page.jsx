import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsAuditLogs from '@/components/main-design/cms-audit-logs';
import { getCmsAuditLogs } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Auditoria CMS',
  description: 'Registro de auditoria protegido de Hackeando el Sistema.',
  path: '/cms/auditoria',
  noIndex: true,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const filters = {
    page: Number(params?.page || 1),
    limit: 20,
    action: params?.action || '',
    entityType: params?.entityType || '',
  };
  const result = await getCmsAuditLogs(accessToken, filters);

  return (
    <Layout>
      <CmsAuditLogs
        logs={result.logs}
        meta={result.meta}
        filters={{
          action: result.meta.filters?.action || filters.action,
          entityType: result.meta.filters?.entityType || filters.entityType,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
      />
    </Layout>
  );
}
