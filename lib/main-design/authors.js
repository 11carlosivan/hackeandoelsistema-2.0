import { authors } from './mock-data';

export function getAuthorName(authorId) {
  const author = authors.find((item) => item.id === authorId);
  return author ? author.name : 'Redaccion';
}
