import Layout from './layout';
import Home from './home';

export function MainDesignApp({ feed }) {
  return (
    <Layout>
      <Home
        initialArticles={feed?.articles}
        initialCategories={feed?.categories}
        summary={feed?.summary}
      />
    </Layout>
  );
}
