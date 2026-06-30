import type { CMSPost } from '../types';

const resolveBooleanFlag = (snakeValue: unknown, camelValue: unknown): boolean => {
    if (snakeValue === false || camelValue === false) return false;
    return true;
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
