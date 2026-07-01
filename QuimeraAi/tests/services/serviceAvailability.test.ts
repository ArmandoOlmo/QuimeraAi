import { describe, expect, it } from 'vitest';
import { canRoleAccessService, PLATFORM_SERVICES } from '../../types/serviceAvailability.ts';

describe('serviceAvailability helpers', () => {
    it('exposes hidden services only to platform owner roles', () => {
        expect(canRoleAccessService('public', 'user')).toBe(true);
        expect(canRoleAccessService('public', 'owner')).toBe(true);
        expect(canRoleAccessService('public', 'superadmin')).toBe(true);
        expect(canRoleAccessService('public', 'super_admin')).toBe(true);

        expect(canRoleAccessService('development', 'user')).toBe(false);
        expect(canRoleAccessService('development', 'owner')).toBe(true);
        expect(canRoleAccessService('development', 'superadmin')).toBe(true);
        expect(canRoleAccessService('development', 'super_admin')).toBe(true);

        expect(canRoleAccessService('not_public', 'user')).toBe(false);
        expect(canRoleAccessService('not_public', 'owner')).toBe(true);
        expect(canRoleAccessService('not_public', 'superadmin')).toBe(true);
        expect(canRoleAccessService('not_public', 'super_admin')).toBe(true);
    });

    it('includes Bio Page in the global service catalog', () => {
        expect(PLATFORM_SERVICES).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'bioPage',
                nameKey: 'services.bioPage',
                descriptionKey: 'services.bioPageDesc',
            }),
        ]));
    });
});
