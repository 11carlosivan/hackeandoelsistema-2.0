import PublicLayout from '@/components/main-design/public-layout';
import EditProfileForm from '@/components/user/EditProfileForm';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Editar Perfil - Área Administrativa',
  description: 'Administración de perfil y datos personales de lector.',
  path: '/perfil/editar',
  noIndex: true,
});

export default function Page() {
  const initialUserData = {
    nombre: 'Carlos',
    apellido: 'Iván',
    correo: 'carlos@hackeandoelsistema.com',
    telefono: '+1 (809) 555-0199',
    pais: 'República Dominicana',
    ciudad: 'Santo Domingo',
    provincia: 'Distrito Nacional',
    sectorBarrio: 'Piantini',
    calle: 'Av. Winston Churchill #102',
    fotoPerfil: '/isotipo.png',
    fotoPortada: '/hes developer.png',
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EditProfileForm initialData={initialUserData} />
      </div>
    </PublicLayout>
  );
}
