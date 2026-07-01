import { describe, expect, it } from 'vitest';
import {
    buildStoreIdentityOrFilter,
    getStorefrontReferenceId,
    getStoreIdentityQueryIds,
    isSupabaseUuid,
    resolveProjectBackedStoreIdentity,
} from '../../utils/ecommerce/storeIdentity';

describe('ecommerce store identity', () => {
    it('uses project-backed Ecommerce Engine identity when a project is present', () => {
        const identity = resolveProjectBackedStoreIdentity({
            projectId: '11111111-1111-4111-8111-111111111111',
            storeId: 'public-store-id',
        });

        expect(identity).toMatchObject({
            projectId: '11111111-1111-4111-8111-111111111111',
            engineStoreId: '11111111-1111-4111-8111-111111111111',
            storeId: '11111111-1111-4111-8111-111111111111',
            storefrontStoreId: '11111111-1111-4111-8111-111111111111',
            source: 'project-backed-engine',
        });
        expect(getStorefrontReferenceId(identity)).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('resolves public store data back to the source project', () => {
        const identity = resolveProjectBackedStoreIdentity({
            publicStoreId: 'public-store',
            publicStore: {
                id: 'public-store',
                data: {
                    projectId: '22222222-2222-4222-8222-222222222222',
                },
            },
        });

        expect(identity.projectId).toBe('22222222-2222-4222-8222-222222222222');
        expect(identity.engineStoreId).toBe('22222222-2222-4222-8222-222222222222');
        expect(identity.publicStoreId).toBe('public-store');
        expect(identity.storefrontStoreId).toBe('public-store');
        expect(getStorefrontReferenceId(identity)).toBe('public-store');
    });

    it('keeps checkout writes project-backed when a published store has no public store row', () => {
        const identity = resolveProjectBackedStoreIdentity({
            storeId: '0b15d914-a886-4374-a6d1-441f6638997b',
            projectId: '0b15d914-a886-4374-a6d1-441f6638997b',
        });

        expect(identity.storeId).toBe('0b15d914-a886-4374-a6d1-441f6638997b');
        expect(identity.publicStoreId).toBeNull();
        expect(identity.storefrontStoreId).toBe('0b15d914-a886-4374-a6d1-441f6638997b');
        expect(getStorefrontReferenceId(identity)).toBe('0b15d914-a886-4374-a6d1-441f6638997b');
    });

    it('builds read filters without comparing text store IDs to UUID project_id', () => {
        const filter = buildStoreIdentityOrFilter([
            'store-slug',
            '33333333-3333-4333-8333-333333333333',
        ]);

        expect(filter).toContain('store_id.eq.store-slug');
        expect(filter).toContain('public_store_id.eq.store-slug');
        expect(filter).not.toContain('project_id.eq.store-slug');
        expect(filter).toContain('project_id.eq.33333333-3333-4333-8333-333333333333');
    });

    it('recognizes only UUID-shaped values as Supabase project IDs', () => {
        expect(isSupabaseUuid('33333333-3333-4333-8333-333333333333')).toBe(true);
        expect(isSupabaseUuid('agency-landing-mode')).toBe(false);
        expect(isSupabaseUuid('store_123')).toBe(false);
        expect(isSupabaseUuid(null)).toBe(false);
    });

    it('dedupes all query ids for project-backed reads', () => {
        const ids = getStoreIdentityQueryIds({
            projectId: 'project-a',
            engineStoreId: 'project-a',
            storeId: 'project-a',
            publicStoreId: 'public-a',
            storefrontStoreId: 'public-a',
            source: 'project-backed-engine',
        });

        expect(ids).toEqual(['project-a', 'public-a']);
    });
});
