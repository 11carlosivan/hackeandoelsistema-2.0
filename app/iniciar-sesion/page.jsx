import PublicLayout from '@/components/main-design/public-layout';
import LoginForm from '@/components/main-design/login-form';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Iniciar sesion',
  description: 'Acceso de usuarios y editores de Hackeando el Sistema.',
  path: '/iniciar-sesion',
  noIndex: true,
});

export default function Page() {
  return (
    <PublicLayout>
      <LoginForm />
    </PublicLayout>
  );
}
