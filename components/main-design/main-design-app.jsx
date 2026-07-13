import Layout from './layout';
import Home from './home';

export function MainDesignApp({ feed }) {
  return (
    <Layout categories={feed?.categories}>
      <Home
        initialArticles={feed?.articles}
        initialCategories={feed?.categories}
        summary={feed?.summary}
        useMockFallback={!feed || feed.source === 'mock'}
      />
    </Layout>
  );
}
