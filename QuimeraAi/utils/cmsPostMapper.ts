import type { CMSPost } from '../types';

const resolveBooleanFlag = (snakeValue: unknown, camelValue: unknown): boolean => {
    if (snakeValue === false || camelValue === false) return false;
    return true;
};

const normalizeSlugKey = (row: any): string => {
    const source = `${row?.slug || row?.title || row?.id || ''}`;
    return source.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const rowTimestamp = (row: any): number => (
    new Date(row?.updated_at || row?.updatedAt || row?.created_at || row?.createdAt || 0).getTime() || 0
);

export const pickCanonicalSupabasePostRow = (rows: any[]): any | null => {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    return [...rows].sort((a, b) => {
        const timeDiff = rowTimestamp(b) - rowTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return `${b?.id || ''}`.localeCompare(`${a?.id || ''}`);
    })[0];
};

export const dedupeSupabasePostRowsBySlug = (rows: any[]): any[] => {
    if (!Array.isArray(rows)) return [];

    const bySlug = new Map<string, any>();
    rows.forEach(row => {
        const key = normalizeSlugKey(row);
        const current = bySlug.get(key);
        const canonical = pickCanonicalSupabasePostRow(current ? [current, row] : [row]);
        if (canonical) bySlug.set(key, canonical);
    });

    return Array.from(bySlug.values()).sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
};

export const mapSupabasePostToCMSPost = (row: any, projectId?: string): CMSPost => {
    const authorName = row?.author_name || row?.authorName || row?.author || '';

    return {
        id: row?.id || '',
        projectId: projectId || row?.project_id || row?.projectId || '',
        title: row?.title || '',
        slug: row?.slug || '',
        content: row?.content || '',
        excerpt: row?.excerpt || '',
        featuredImage: row?.featured_image || row?.featuredImage || '',
        categoryId: row?.category || row?.categoryId || '',
        status: (row?.status || 'draft') as CMSPost['status'],
        tags: Array.isArray(row?.tags) ? row.tags : [],
        authorId: row?.user_id || row?.authorId || '',
        author: authorName,
        authorName,
        seoTitle: row?.seo_title || row?.seoTitle || '',
        seoDescription: row?.seo_description || row?.seoDescription || '',
        createdAt: row?.created_at || row?.createdAt || '',
        updatedAt: row?.updated_at || row?.updatedAt || '',
        publishedAt: row?.published_at || row?.publishedAt || undefined,
        showAuthor: resolveBooleanFlag(row?.show_author, row?.showAuthor),
        showDate: resolveBooleanFlag(row?.show_date, row?.showDate),
        isFeatured: row?.is_featured ?? row?.isFeatured ?? false,
        sortOrder: row?.sort_order ?? row?.sortOrder,
        podcastAudioUrl: row?.podcast_audio_url || row?.podcastAudioUrl || '',
        podcastVideoUrl: row?.podcast_video_url || row?.podcastVideoUrl || '',
    };
};
