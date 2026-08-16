import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CmsBlockEditor from './cms-gutenberg-editor';

vi.mock('./cms-media-selector-modal', () => ({
  default: () => null,
}));

vi.mock('./cms-related-post-modal', () => ({
  default: () => null,
}));

describe('CmsBlockEditor', () => {
  it('updates paragraph blocks without throwing a missing update function error', async () => {
    const onChange = vi.fn();
    const { container } = render(<CmsBlockEditor initialHtml="<p>Texto inicial</p>" onChange={onChange} />);

    const editor = container.querySelector('[contenteditable="true"]');
    expect(editor).toBeTruthy();

    editor.innerHTML = 'Texto actualizado';
    fireEvent.input(editor);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        contentHtml: '<p>Texto actualizado</p>',
        contentText: 'Texto actualizado',
      }));
    });
  });
});
