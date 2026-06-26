import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260626120743_global_assistant_memory_store.sql');
const sql = readFileSync(migrationPath, 'utf8');

const requiredTables = [
    'assistant_memories',
    'assistant_memory_items',
    'assistant_conversations',
    'assistant_messages',
    'assistant_tasks',
    'assistant_actions',
    'assistant_runtime_events',
    'assistant_context_snapshots',
    'assistant_project_summaries',
    'assistant_module_summaries',
    'assistant_user_preferences',
    'assistant_admin_events',
];

describe('Global Assistant memory store migration', () => {
    it('creates every GA2 persistence table and enables RLS', () => {
        for (const table of requiredTables) {
            expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
            expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
        }
    });

    it('keeps assistant ids aligned with prefixed TypeScript ids', () => {
        expect(sql).toContain("id TEXT PRIMARY KEY DEFAULT ('asst_mem_' || gen_random_uuid()::text)");
        expect(sql).toContain("id TEXT PRIMARY KEY DEFAULT ('asst_task_' || gen_random_uuid()::text)");
        expect(sql).toContain("id TEXT PRIMARY KEY DEFAULT ('asst_action_' || gen_random_uuid()::text)");
        expect(sql).toContain("memory_ids TEXT[] NOT NULL DEFAULT '{}'::text[]");
        expect(sql).toContain("action_ids TEXT[] NOT NULL DEFAULT '{}'::text[]");
    });

    it('uses scoped authenticated policies instead of broad policies', () => {
        expect(sql).not.toMatch(/FOR\s+ALL/i);
        expect(sql).not.toContain('auth.role()');
        expect(sql).not.toContain('user_metadata');
        expect(sql).toContain('TO authenticated');
        expect(sql).toContain('public.global_assistant_can_access_scope(scope, tenant_id, user_id, project_id)');
        expect(sql).toContain('public.global_assistant_is_platform_owner()');
    });

    it('protects Data API access with explicit grants and no anon table grants', () => {
        for (const table of requiredTables) {
            expect(sql).toContain(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`);
        }
        expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assistant_memories TO authenticated');
        expect(sql).toContain('GRANT SELECT, INSERT ON TABLE public.assistant_runtime_events TO authenticated');
        expect(sql).not.toMatch(/GRANT\s+.*ON TABLE public\.assistant_.* TO anon/i);
    });

    it('uses SECURITY INVOKER helper functions for RLS decisions', () => {
        expect(sql).toContain('CREATE OR REPLACE FUNCTION public.global_assistant_is_platform_owner()');
        expect(sql).toContain('CREATE OR REPLACE FUNCTION public.global_assistant_is_tenant_member(target_tenant_id UUID)');
        expect(sql).toContain('CREATE OR REPLACE FUNCTION public.global_assistant_is_project_member(target_project_id UUID)');
        expect(sql).not.toMatch(/global_assistant_.*SECURITY DEFINER/is);
    });
});
