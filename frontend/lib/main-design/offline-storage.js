const STORAGE_KEY = 'hes_offline_articles';
const EVENT_NAME = 'hes-offline-change';

export function getOfflineArticles() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading offline articles from localStorage:', err);
    return [];
  }
}

export function isArticleSavedOffline(idOrSlug) {
  if (!idOrSlug || typeof window === 'undefined') return false;
  const articles = getOfflineArticles();
  const search = String(idOrSlug).toLowerCase().trim();
  return articles.some(
    (item) =>
      String(item.id || '').toLowerCase() === search ||
      String(item.slug || '').toLowerCase() === search ||
      String(item.canonicalPath || '').replace(/^\/+|\/+$/g, '') === search.replace(/^\/+|\/+$/g, '')
  );
}

export function saveArticleOffline(article) {
  if (!article || typeof window === 'undefined') return false;
  try {
    const articles = getOfflineArticles();
    const id = article.id || article.postId || article.raw?.id || article.slug;
    const slug = article.slug || article.raw?.slug || String(id);
    const canonicalPath =
      article.canonicalPath ||
      article.raw?.canonicalPath ||
      article.route ||
      `/${slug}/`;

    // Remove existing if any
    const filtered = articles.filter(
      (item) =>
        String(item.id || '') !== String(id) &&
        String(item.slug || '') !== String(slug) &&
        String(item.canonicalPath || '').replace(/^\/+|\/+$/g, '') !== String(canonicalPath).replace(/^\/+|\/+$/g, '')
    );

    const offlinePayload = {
      id: String(id),
      slug: String(slug),
      canonicalPath: String(canonicalPath),
      title: article.title || 'Sin título',
      subtitle: article.subtitle || article.excerpt || '',
      image: article.image || '/isotipo.png',
      category: article.category || 'NOTICIAS',
      categoryPath: article.categoryPath || '/archivo',
      authorName: article.authorName || 'Redacción HES',
      date: article.date || new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }),
      readTime: article.readTime || '3 MIN',
      contentHtml: article.contentHtml || '',
      contentText: article.contentText || '',
      savedAt: new Date().toISOString(),
    };

    // Store newest first, limit to 60 articles
    const updated = [offlinePayload, ...filtered].slice(0, 60);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { count: updated.length } }));
    return true;
  } catch (err) {
    console.error('Error saving article offline:', err);
    return false;
  }
}

export function removeOfflineArticle(idOrSlug) {
  if (!idOrSlug || typeof window === 'undefined') return false;
  try {
    const articles = getOfflineArticles();
    const search = String(idOrSlug).toLowerCase().trim();
    const filtered = articles.filter(
      (item) =>
        String(item.id || '').toLowerCase() !== search &&
        String(item.slug || '').toLowerCase() !== search &&
        String(item.canonicalPath || '').replace(/^\/+|\/+$/g, '') !== search.replace(/^\/+|\/+$/g, '')
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { count: filtered.length } }));
    return true;
  } catch (err) {
    console.error('Error removing offline article:', err);
    return false;
  }
}

export function clearOfflineArticles() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { count: 0 } }));
  } catch (err) {
    console.error('Error clearing offline articles:', err);
  }
}

export function getOfflineStorageEstimate() {
  if (typeof window === 'undefined') return '0 KB';
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([raw]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } catch {
    return '0 KB';
  }
}
