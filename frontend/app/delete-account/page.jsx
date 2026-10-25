import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';
import DeleteAccountView from '../eliminar-cuenta/delete-account-view';

export const metadata = buildMetadata({
  title: 'Account & Data Deletion Request | Hackeando El Sistema',
  description: 'Submit an account deletion request for Hackeando El Sistema.',
  path: '/delete-account',
});

export default function DeleteAccountEnglishPage() {
  return (
    <PublicLayout>
      <DeleteAccountView />
    </PublicLayout>
  );
}
