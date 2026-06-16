import React from 'react';
import { useTranslation } from 'react-i18next';
import FilterChip from '../FilterChip';

/** Project lifecycle: all | Published | Draft */
export type ProjectFilterStatus = 'all' | 'Published' | 'Draft';

/** CMS / content lifecycle: all | published | draft */
export type ContentFilterStatus = 'all' | 'published' | 'draft';

interface StatusFilterChipsBaseProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    totalCount: number;
    publishedCount: number;
    draftCount: number;
    allValue: T;
    publishedValue: T;
    draftValue: T;
    allLabel?: string;
    publishedLabel?: string;
    draftLabel?: string;
    className?: string;
}

function StatusFilterChips<T extends string>({
    value,
    onChange,
    totalCount,
    publishedCount,
    draftCount,
    allValue,
    publishedValue,
    draftValue,
    allLabel,
    publishedLabel,
    draftLabel,
    className = '',
}: StatusFilterChipsBaseProps<T>) {
    const { t } = useTranslation();

    return (
        <div className={`flex flex-wrap items-center gap-2 md:gap-3 ${className}`}>
            <FilterChip
                label={allLabel ?? t('dashboard.allStatus', 'Todos')}
                active={value === allValue}
                count={totalCount}
                onClick={() => onChange(allValue)}
            />
            <FilterChip
                label={publishedLabel ?? t('dashboard.published', 'Publicados')}
                active={value === publishedValue}
                count={publishedCount}
                onClick={() => onChange(publishedValue)}
                color="green"
            />
            <FilterChip
                label={draftLabel ?? t('dashboard.draft', 'Borradores')}
                active={value === draftValue}
                count={draftCount}
                onClick={() => onChange(draftValue)}
                color="gray"
            />
        </div>
    );
}

interface ProjectStatusFilterChipsProps {
    value: ProjectFilterStatus;
    onChange: (value: ProjectFilterStatus) => void;
    totalCount: number;
    publishedCount: number;
    draftCount: number;
    className?: string;
}

export const ProjectStatusFilterChips: React.FC<ProjectStatusFilterChipsProps> = (props) => (
    <StatusFilterChips
        {...props}
        allValue="all"
        publishedValue="Published"
        draftValue="Draft"
    />
);

interface ContentStatusFilterChipsProps {
    value: ContentFilterStatus;
    onChange: (value: ContentFilterStatus) => void;
    totalCount: number;
    publishedCount: number;
    draftCount: number;
    className?: string;
}

export const ContentStatusFilterChips: React.FC<ContentStatusFilterChipsProps> = (props) => (
    <StatusFilterChips
        {...props}
        allValue="all"
        publishedValue="published"
        draftValue="draft"
    />
);

export default StatusFilterChips;
