import { describe, expect, it } from 'vitest';
import {
    canDeleteComponent,
    canEditComponent,
    canManagePermissions,
    canViewComponent,
    getPermissionLevel,
} from '../../utils/permissionsManager';

const privateComponent = {
    id: 'component-1',
    createdBy: 'creator-1',
    isPublic: false,
    permissions: {
        isPublic: false,
        canView: [],
        canEdit: [],
    },
} as any;

describe('permissionsManager platform roles', () => {
    it('treats owner and Super Admin aliases as component admins', () => {
        for (const role of ['owner', 'superadmin', 'super_admin', 'super-admin', 'super admin']) {
            expect(canViewComponent(privateComponent, 'platform-user', role), role).toBe(true);
            expect(canEditComponent(privateComponent, 'platform-user', role), role).toBe(true);
            expect(canDeleteComponent(privateComponent, 'platform-user', role), role).toBe(true);
            expect(canManagePermissions(privateComponent, 'platform-user', role), role).toBe(true);
            expect(getPermissionLevel(privateComponent, 'platform-user', role), role).toBe('admin');
        }
    });

    it('does not grant platform component privileges to agency owners', () => {
        expect(canViewComponent(privateComponent, 'agency-owner', 'agency_owner')).toBe(false);
        expect(canEditComponent(privateComponent, 'agency-owner', 'agency_owner')).toBe(false);
        expect(getPermissionLevel(privateComponent, 'agency-owner', 'agency_owner')).toBe('none');
    });
});
