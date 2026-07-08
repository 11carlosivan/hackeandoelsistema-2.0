import Layout from '@/components/main-design/layout';
import OpinionPage from '@/components/main-design/opinion-page';

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <Layout>
      <OpinionPage opinionId={id} />
    </Layout>
  );
}
