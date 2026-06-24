import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudioActionBar from '../../components/studio/StudioActionBar';

describe('StudioActionBar', () => {
    it('renders distinct AI Studio and Template Studio action labels', () => {
        const onWebsite = vi.fn();
        const onTemplate = vi.fn();
        const { rerender } = render(
            <StudioActionBar
                primaryLabel="Generate Website"
                onPrimary={onWebsite}
                helperText="You can edit everything later."
                secondaryActions={[{ label: 'Improve Brief', onClick: vi.fn() }]}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /generate website/i }));
        expect(onWebsite).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Improve Brief')).toBeInTheDocument();

        rerender(
            <StudioActionBar
                primaryLabel="Generate Template"
                onPrimary={onTemplate}
                helperText="Sample content will be marked as template content."
                secondaryActions={[{ label: 'Improve Template Brief', onClick: vi.fn() }]}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /generate template/i }));
        expect(onTemplate).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Improve Template Brief')).toBeInTheDocument();
    });

    it('disables the primary action when critical context is missing', () => {
        render(
            <StudioActionBar
                primaryLabel="Generate Website"
                onPrimary={vi.fn()}
                primaryDisabled
                helperText="Add the missing critical context before generating."
            />
        );

        expect(screen.getByRole('button', { name: /generate website/i })).toBeDisabled();
    });
});
