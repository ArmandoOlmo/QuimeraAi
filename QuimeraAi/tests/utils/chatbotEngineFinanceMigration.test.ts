import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const migration = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260626071812_chatbot_engine_finance_quote_requests.sql'),
    'utf8',
);
const executableSql = migration
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

describe('Chatbot Engine finance quote request migration', () => {
    it('extends accounting invoices for reviewed chatbot finance drafts', () => {
        expect(migration).toContain('ALTER TABLE public.accounting_invoices');
        expect(migration).toContain("ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'");
        expect(migration).toContain("ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT 'Due on receipt'");
        expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_module TEXT');
        expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_event TEXT');
        expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_entity_type TEXT');
        expect(migration).toContain('ADD COLUMN IF NOT EXISTS source_entity_id TEXT');
        expect(migration).toContain('ADD COLUMN IF NOT EXISTS idempotency_key TEXT');
        expect(migration).toContain("ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb");
    });

    it('keeps quote creation idempotent and queryable by source entity', () => {
        expect(migration).toContain('accounting_invoices_source_entity_idx');
        expect(migration).toContain('accounting_invoices_project_idempotency_uidx');
        expect(migration).toContain('ON public.accounting_invoices(project_id, idempotency_key)');
        expect(migration).toContain('WHERE idempotency_key IS NOT NULL');
    });

    it('does not create payment provider side effects', () => {
        expect(executableSql).not.toMatch(/payment_intent|checkout_session|payment_link|stripe_/i);
        expect(executableSql).not.toMatch(/ledger/i);
    });
});
