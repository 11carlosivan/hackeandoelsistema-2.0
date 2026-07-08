import Layout from '@/components/main-design/layout';
import ProfilePage from '@/components/main-design/profile-page';

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <Layout>
      <ProfilePage authorId={id} />
    </Layout>
  );
}
