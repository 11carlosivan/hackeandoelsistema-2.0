import { getPublicCategories } from '@/lib/main-design/api';
import Layout from './layout';

async function loadNavigationCategories() {
  try {
    return await getPublicCategories();
  } catch {
    return [];
  }
}

export default async function PublicLayout({ children }) {
  const categories = await loadNavigationCategories();

  return <Layout categories={categories}>{children}</Layout>;
}
