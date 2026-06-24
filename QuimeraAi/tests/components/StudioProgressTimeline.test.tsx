import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StudioProgressTimeline from '../../components/studio/StudioProgressTimeline';

describe('StudioProgressTimeline', () => {
    it('renders progress steps and event messages', () => {
        render(
            <StudioProgressTimeline
                steps={[
                    'Understanding business',
                    'Planning website structure',
                    'Writing content',
                ]}
                currentStep={1}
                completedSteps={1}
                progress={42}
                messages={[
                    { message: 'Planning website structure' },
                    { message: 'Selecting components' },
                ]}
            />
        );

        expect(screen.getByText('Understanding business')).toBeInTheDocument();
        expect(screen.getAllByText('Planning website structure').length).toBeGreaterThan(0);
        expect(screen.getByText('Writing content')).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(screen.getByText('Selecting components')).toBeInTheDocument();
    });
});
