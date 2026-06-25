import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KnowledgeDocumentUploader from '../../components/dashboard/ai/KnowledgeDocumentUploader';
import { KnowledgeDocument } from '../../types';

describe('KnowledgeDocumentUploader', () => {
    it('renders partial legacy documents without crashing', () => {
        const documents = [
            {
                id: 'legacy-doc',
                name: 'Legacy document',
            },
        ] as unknown as KnowledgeDocument[];

        render(
            <KnowledgeDocumentUploader
                documents={documents}
                onDocumentsChange={vi.fn()}
            />
        );

        expect(screen.getByText('Legacy document')).toBeInTheDocument();
        expect(screen.getByText(/0 characters/)).toBeInTheDocument();
    });

    it('accepts an undefined document list', () => {
        render(
            <KnowledgeDocumentUploader
                documents={undefined}
                onDocumentsChange={vi.fn()}
            />
        );

        expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    });
});
