import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';
import DeleteAccountView from './delete-account-view';

export const metadata = buildMetadata({
  title: 'Eliminación de Cuenta y Datos | Hackeando El Sistema',
  description: 'Solicitud formal para darse de baja y eliminar definitivamente tu cuenta y datos asociados en Hackeando El Sistema.',
  path: '/eliminar-cuenta',
});

export default function DeleteAccountPage() {
  return (
    <PublicLayout>
      <DeleteAccountView />
    </PublicLayout>
  );
}
