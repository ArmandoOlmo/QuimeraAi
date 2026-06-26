import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const migration = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260626040910_canonical_chatbot_engine_events.sql'),
    'utf8',
);

describe('Chatbot Engine event log migration', () => {
    it('creates the project-scoped canonical event log with audit fields', () => {
        expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.chatbot_engine_events');
        expect(migration).toContain('project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE');
        expect(migration).toContain('conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE SET NULL');
        expect(migration).toContain('appointment_id UUID REFERENCES public.project_appointments(id) ON DELETE SET NULL');
        expect(migration).toContain('idempotency_key TEXT');
        expect(migration).toContain('request_fingerprint TEXT');
        expect(migration).toContain("action_status IN ('allowed', 'blocked', 'executed', 'observed', 'failed', 'duplicate')");
        expect(migration).toContain("actor_type IN ('visitor', 'project_user', 'system', 'anonymous')");
    });

    it('adds idempotency, correlation, and dashboard query indexes', () => {
        expect(migration).toContain('chatbot_engine_events_project_created_idx');
        expect(migration).toContain('chatbot_engine_events_project_action_created_idx');
        expect(migration).toContain('chatbot_engine_events_project_status_created_idx');
        expect(migration).toContain('chatbot_engine_events_correlation_idx');
        expect(migration).toContain('chatbot_engine_events_project_event_idempotency_uidx');
    });

    it('enables RLS for authenticated project members and service role writes only', () => {
        expect(migration).toContain('ALTER TABLE public.chatbot_engine_events ENABLE ROW LEVEL SECURITY');
        expect(migration).toContain('CREATE OR REPLACE FUNCTION public.is_project_chatbot_engine_member');
        expect(migration).toContain('Project members can read chatbot engine events');
        expect(migration).toContain('Project members can insert chatbot engine events');
        expect(migration).toContain('GRANT SELECT, INSERT ON public.chatbot_engine_events TO authenticated');
        expect(migration).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_engine_events TO service_role');
        expect(migration).not.toContain('TO anon');
    });

    it('reloads PostgREST schema after the new Data API surface is defined', () => {
        expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
    });
});
