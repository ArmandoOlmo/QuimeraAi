import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('CMS author/date visibility persistence', () => {
    const cmsContext = read('contexts/cms/CMSContext.tsx');
    const migration = read('supabase/migrations/20260629193103_add_cms_author_date_visibility.sql');

    it('reads and writes the visibility controls through Supabase posts columns', () => {
        expect(cmsContext).toContain('showAuthor: p.show_author ?? true');
        expect(cmsContext).toContain('showDate: p.show_date ?? true');
        expect(cmsContext).toContain('show_author: post.showAuthor !== false');
        expect(cmsContext).toContain('show_date: post.showDate !== false');
    });

    it('adds idempotent default-on columns for existing posts', () => {
        expect(migration).toContain('add column if not exists show_author boolean not null default true');
        expect(migration).toContain('add column if not exists show_date boolean not null default true');
    });
});
