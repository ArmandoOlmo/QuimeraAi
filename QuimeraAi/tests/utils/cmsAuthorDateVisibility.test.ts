import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    dedupeSupabasePostRowsBySlug,
    mapSupabasePostToCMSPost,
} from '../../utils/cmsPostMapper';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('CMS author/date visibility persistence', () => {
    const cmsContext = read('contexts/cms/CMSContext.tsx');
    const modernEditor = read('components/cms/modern/ModernCMSEditor.tsx');
    const publicPreview = read('components/PublicWebsitePreview.tsx');
    const landingPage = read('components/LandingPage.tsx');
    const migration = read('supabase/migrations/20260629193103_add_cms_author_date_visibility.sql');
    const duplicateGuardMigration = read('supabase/migrations/20260630004912_prevent_duplicate_cms_project_slugs.sql');

    it('reads and writes the visibility controls through Supabase posts columns', () => {
        expect(cmsContext).toContain('mapSupabasePostToCMSPost');
        expect(cmsContext).toContain('const showAuthor = post.showAuthor !== false');
        expect(cmsContext).toContain('const showDate = post.showDate !== false');
        expect(cmsContext).toContain('show_author: showAuthor');
        expect(cmsContext).toContain('show_date: showDate');
    });

    it('refreshes CMS posts from Supabase instead of exposing a no-op reload', () => {
        expect(cmsContext).toContain('const loadCMSPosts = useCallback(async () =>');
        expect(cmsContext).toContain(".from('posts')");
        expect(cmsContext).toContain(".contains('tags', [getProjectTag(activeProjectId)])");
        expect(cmsContext).toContain('setCmsPosts(dedupeSupabasePostRowsBySlug(data || []).map(mapPostRow))');
        expect(cmsContext).not.toContain('// Now handled by useEffect real-time channel');
    });

    it('hydrates the saved row back into CMS state after author/date changes persist', () => {
        expect(cmsContext).toContain('if (post.id && UUID_RE.test(post.id))');
        expect(cmsContext).toContain(".eq('tenant_id', currentTenantId)");
        expect(cmsContext).toContain(".select('*')");
        expect(cmsContext).toContain('savedPostRow = data');
        expect(cmsContext).toContain('const { data: syncedDuplicates, error: duplicateSyncError }');
        expect(cmsContext).toContain(".neq('id', savedPostRow.id)");
        expect(cmsContext).toContain('pickCanonicalSupabasePostRow([savedPostRow, ...(syncedDuplicates || [])])');
        expect(cmsContext).toContain('const normalizedPost = mapPostRow(savedPostRow)');
        expect(cmsContext).toContain('setCmsPosts(prev =>');
    });

    it('updates an existing project post instead of inserting duplicate slugs', () => {
        expect(cmsContext).toContain('const pendingPostSavesRef = useRef<Map<string, Promise<string>>>(new Map())');
        expect(cmsContext).toContain('const normalizePostSlug = (slug: string | undefined, title: string | undefined): string =>');
        expect(cmsContext).toContain("const projectTag = getProjectTag(activeProjectId)");
        expect(cmsContext).toContain(".eq('slug', normalizedSlug)");
        expect(cmsContext).toContain(".contains('tags', [projectTag])");
        expect(cmsContext).toContain("const { data: existingPosts, error: existingError }");
        expect(cmsContext).toContain(".order('updated_at', { ascending: false })");
        expect(cmsContext).toContain('if (existingPosts && existingPosts.length > 0)');
        expect(cmsContext).toContain('savedPostRow = pickCanonicalSupabasePostRow(data || existingPosts)');
        expect(cmsContext).toContain('pendingPostSavesRef.current.set(saveKey, savePromise)');
    });

    it('adds a database guard against duplicate CMS slugs per tenant/project', () => {
        expect(duplicateGuardMigration).toContain('create or replace function public.quimera_post_project_tag');
        expect(duplicateGuardMigration).toContain('bool_and(show_author)');
        expect(duplicateGuardMigration).toContain('bool_and(show_date)');
        expect(duplicateGuardMigration).toContain('order by content_length desc');
        expect(duplicateGuardMigration).toContain('delete from public.posts');
        expect(duplicateGuardMigration).toContain('create unique index if not exists posts_tenant_project_slug_unique_idx');
        expect(duplicateGuardMigration).toContain('public.quimera_post_project_tag(tags)');
        expect(duplicateGuardMigration).toContain('lower(btrim(slug))');
    });

    it('saves the modern editor author and date toggle in the CMSPost payload', () => {
        expect(modernEditor).toContain('post?.authorName || post?.author ||');
        expect(modernEditor).toContain("const [persistedPostId, setPersistedPostId] = useState(post?.id || '')");
        expect(modernEditor).toContain("const persistedPostIdRef = useRef(post?.id || '')");
        expect(modernEditor).toContain('const saveInFlightRef = useRef<Promise<string> | null>(null)');
        expect(modernEditor).toContain('if (saveInFlightRef.current)');
        expect(modernEditor).toContain('if (isAutoSave) return');
        expect(modernEditor).toContain("await saveInFlightRef.current.catch(() => '')");
        expect(modernEditor).toContain('const stablePostId = persistedPostIdRef.current || persistedPostId || post?.id ||');
        expect(modernEditor).toContain('id: stablePostId');
        expect(modernEditor).toContain('authorName: author');
        expect(modernEditor).toContain('showAuthor: showAuthor === true');
        expect(modernEditor).toContain('showDate: showDate === true');
        expect(modernEditor).toContain('currentSavePromise = saveCMSPost(postData).then');
        expect(modernEditor).toContain('saveInFlightRef.current = currentSavePromise');
        expect(modernEditor).toContain('setPersistedPostId(savedPostId)');
    });

    it('normalizes Supabase rows before public website rendering', () => {
        expect(publicPreview).toContain('mapSupabasePostToCMSPost');
        expect(landingPage).toContain('const postShowDate = showDate && post.showDate !== false');
        expect(landingPage).toContain('const postShowAuthor = showAuthor && post.showAuthor !== false');
    });

    it('keeps explicit false values when converting from Supabase snake_case', () => {
        const post = mapSupabasePostToCMSPost({
            id: 'post-1',
            title: 'Post',
            slug: 'post',
            content: '',
            excerpt: '',
            status: 'published',
            user_id: 'user-1',
            author_name: 'Author',
            show_author: false,
            show_date: false,
            created_at: '2026-06-29T00:00:00.000Z',
            updated_at: '2026-06-29T00:00:00.000Z',
        }, 'project-1');

        expect(post.showAuthor).toBe(false);
        expect(post.showDate).toBe(false);
        expect(post.author).toBe('Author');
        expect(post.authorName).toBe('Author');
    });

    it('keeps the newest row when duplicate Supabase rows share a CMS slug', () => {
        const rows = dedupeSupabasePostRowsBySlug([
            {
                id: 'old',
                slug: 'same-post',
                updated_at: '2026-06-29T00:00:00.000Z',
                show_author: false,
                show_date: false,
            },
            {
                id: 'new',
                slug: 'same-post',
                updated_at: '2026-06-30T00:00:00.000Z',
                show_author: true,
                show_date: true,
            },
        ]);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('new');
    });

    it('adds idempotent default-on columns for existing posts', () => {
        expect(migration).toContain('add column if not exists show_author boolean not null default true');
        expect(migration).toContain('add column if not exists show_date boolean not null default true');
    });
});
