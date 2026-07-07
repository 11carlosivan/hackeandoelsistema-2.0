import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { postSummaryFixture } from '@/lib/contracts/public-content.fixtures';
import { PostCard } from './post-card';

describe('PostCard', () => {
  it('renders title, category and author metadata', () => {
    render(<PostCard post={postSummaryFixture} />);

    expect(screen.getByRole('heading', { name: postSummaryFixture.title })).toBeInTheDocument();
    expect(screen.getByText('Nacionales')).toBeInTheDocument();
    expect(screen.getByText('Melvin Sena')).toBeInTheDocument();
  });

  it('renders a fallback when no featured image is present', () => {
    render(<PostCard post={{ ...postSummaryFixture, featuredImage: null }} />);

    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
  });
});
