import PublicLayout from '@/components/main-design/public-layout';
import RegisterForm from '@/components/user/RegisterForm';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Registro de lectores',
  description: 'Registro de miembros de Hackeando el Sistema Network.',
  path: '/register',
  noIndex: true,
});

export default function Page() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <RegisterForm />
      </div>
    </PublicLayout>
  );
}

