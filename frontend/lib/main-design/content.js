import { articles, authors, opinions } from './mock-data';

export const publicStaticPages = [
  {
    slug: 'terms-of-service',
    title: 'Terminos de Servicio',
    description: 'Condiciones de uso de Hackeando el Sistema Network.',
  },
  {
    slug: 'privacy-policy',
    title: 'Politica de Privacidad',
    description: 'Politicas de privacidad, tratamiento de datos y seguridad.',
  },
  {
    slug: 'advertising',
    title: 'Publicidad',
    description: 'Opciones comerciales y espacios publicitarios del network.',
  },
];

export function getArticleById(id) {
  return articles.find((article) => article.id === id) || null;
}

export function getOpinionById(id) {
  return opinions.find((opinion) => opinion.id === id) || null;
}

export function getAuthorById(id) {
  return authors.find((author) => author.id === id) || null;
}

export function getStaticPageBySlug(slug) {
  return publicStaticPages.find((page) => page.slug === slug) || null;
}

export function getCategoryById(id) {
  const category = decodeURIComponent(id || '').toUpperCase();
  const categoryArticles = articles.filter((article) => article.category === category);

  if (categoryArticles.length === 0) return null;

  return {
    id: category,
    title: category,
    description: `Archivo de noticias de ${category.toLowerCase()} en Hackeando el Sistema.`,
    articles: categoryArticles,
    updatedAt: categoryArticles[0]?.date,
  };
}

export function getAllCategoryIds() {
  return [...new Set(articles.map((article) => article.category))];
}
