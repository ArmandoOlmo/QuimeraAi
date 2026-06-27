import React from 'react';

interface FormattedLeadNotesProps {
    notes?: string | null;
    emptyText?: string;
    compact?: boolean;
}

const isSectionHeading = (line: string): boolean => (
    line === 'Español / Spanish'
    || line === 'English / Inglés'
    || line === 'Resumen de solicitud del cliente / Customer request summary'
    || line === 'Resumen de seguimiento / Follow-up summary'
);

const isPrimaryHeading = (line: string): boolean => (
    line === 'Resumen de solicitud del cliente / Customer request summary'
    || line === 'Resumen de seguimiento / Follow-up summary'
);

const FormattedLeadNotes: React.FC<FormattedLeadNotesProps> = ({
    notes,
    emptyText = 'No notes added yet.',
    compact = false,
}) => {
    const lines = (notes || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trimEnd());

    if (!lines.some(line => line.trim())) {
        return <p className="text-sm italic text-q-text-muted">{emptyText}</p>;
    }

    return (
        <div className={compact ? 'space-y-1.5 text-xs leading-relaxed' : 'space-y-3 text-sm leading-relaxed'}>
            {lines.map((rawLine, index) => {
                const line = rawLine.trim();
                const isNestedBullet = rawLine.startsWith('  - ');
                if (!line) {
                    return <div key={`space-${index}`} className={compact ? 'h-1' : 'h-2'} aria-hidden="true" />;
                }

                if (isSectionHeading(line)) {
                    const primary = isPrimaryHeading(line);
                    return (
                        <div
                            key={`${line}-${index}`}
                            className={primary
                                ? 'border-b border-q-border pb-2 text-sm font-bold text-foreground'
                                : 'pt-1 text-xs font-bold uppercase tracking-wider text-q-text-muted'}
                        >
                            {line}
                        </div>
                    );
                }

                if (isNestedBullet) {
                    return (
                        <div key={`${line}-${index}`} className="ml-5 flex items-start gap-2 text-q-text-muted">
                            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-q-text-muted/60" aria-hidden="true" />
                            <span className="min-w-0 whitespace-pre-wrap">{line.slice(2)}</span>
                        </div>
                    );
                }

                if (line.startsWith('- ')) {
                    return (
                        <div key={`${line}-${index}`} className="flex items-start gap-2 text-foreground">
                            <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-q-accent" aria-hidden="true" />
                            <span className="min-w-0 whitespace-pre-wrap">{line.slice(2)}</span>
                        </div>
                    );
                }

                return (
                    <p key={`${line}-${index}`} className="whitespace-pre-wrap text-foreground">
                        {line}
                    </p>
                );
            })}
        </div>
    );
};

export default FormattedLeadNotes;
