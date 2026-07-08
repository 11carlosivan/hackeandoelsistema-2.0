import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categoryPagePayloadFixture } from '@/lib/contracts/public-content.fixtures';
import { CategoryTemplate } from './category-template';

describe('CategoryTemplate', () => {
  it('renders an editorial category page from the category payload', () => {
    render(<CategoryTemplate payload={categoryPagePayloadFixture} />);

    expect(screen.getByRole('heading', { level: 1, name: /nacional/i })).toBeInTheDocument();
    expect(screen.getByText(/noticias nacionales/i)).toBeInTheDocument();
    expect(screen.getByText(/historia principal/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /radar de categoria/i })).toBeInTheDocument();
    expect(screen.getByText(/publicaciones/i)).toBeInTheDocument();
  });

  it('renders an empty state when the category has no posts', () => {
    render(
      <CategoryTemplate
        payload={{
          ...categoryPagePayloadFixture,
          posts: [],
          pagination: {
            ...categoryPagePayloadFixture.pagination,
            totalItems: 0,
          },
        }}
      />,
    );

    expect(screen.getByText(/todavia no tiene publicaciones/i)).toBeInTheDocument();
  });
});
