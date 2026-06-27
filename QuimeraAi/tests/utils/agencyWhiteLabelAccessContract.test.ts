import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency White Label Service Access contract', () => {
    const whiteLabelSettings = read('components/dashboard/agency/WhiteLabelSettings.tsx');
    const contentDashboard = read('components/dashboard/agency/AgencyContentDashboard.tsx');
    const navigationManagement = read('components/dashboard/agency/AgencyNavigationManagement.tsx');
    const dashboard = read('components/dashboard/agency/AgencyDashboardMain.tsx');

    it('keeps White Label tab and nested settings aligned to the canonical Agency module', () => {
        expect(dashboard).toContain("'white-label': { route: ROUTES.AGENCY_WHITE_LABEL, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' }");
        expect(dashboard).toContain("cms: { route: ROUTES.AGENCY_CMS, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' }");
        expect(dashboard).toContain("navigation: { route: ROUTES.AGENCY_NAVIGATION, moduleId: 'agency-white-label', requiredPermission: 'canManageSettings' }");
        expect(whiteLabelSettings).toContain("import { useServiceAccess }");
        expect(whiteLabelSettings).toContain("serviceAccess.canAccessModule('agency-white-label'");
        expect(whiteLabelSettings).toContain("requiredPermission: 'canManageSettings'");
        expect(contentDashboard).toContain("serviceAccess.canAccessModule('agency-white-label'");
        expect(navigationManagement).toContain("serviceAccess.canAccessModule('agency-white-label'");
    });

    it('blocks White Label uploads and saves unless Service Access allows settings management', () => {
        expect(whiteLabelSettings).toContain('const requireWhiteLabelAccess = useCallback(() =>');
        expect(whiteLabelSettings).toContain('if (!requireWhiteLabelAccess()) return');
        expect(whiteLabelSettings).toContain('disabled={saving || !hasChanges || !canManageWhiteLabel}');
        expect(whiteLabelSettings).toContain('disabled={uploadingLogo || !canManageWhiteLabel}');
        expect(whiteLabelSettings).toContain('disabled={uploadingFavicon || !canManageWhiteLabel}');
        expect(whiteLabelSettings).toContain('whiteLabelAccess.message');
    });

    it('blocks Agency CMS mutations unless Service Access allows White Label settings management', () => {
        expect(contentDashboard).toContain("import { useServiceAccess }");
        expect(contentDashboard).toContain("requiredPermission: 'canManageSettings'");
        expect(contentDashboard).toContain('const requireAgencyContentAccess = () =>');
        expect(contentDashboard).toContain('if (!requireAgencyContentAccess()) return');
        expect(contentDashboard).toContain('await saveArticle(duplicatedArticle)');
        expect(contentDashboard).toContain('await deleteArticle(deleteConfirmId)');
        expect(contentDashboard).toContain('Promise.all(selectedArticles.map(id => deleteArticle(id)))');
        expect(contentDashboard).toContain('disabled={!canManageAgencyContent}');
        expect(contentDashboard).toContain('contentAccess.message');
    });

    it('blocks Agency navigation mutations unless Service Access allows White Label settings management', () => {
        expect(navigationManagement).toContain("import { useServiceAccess }");
        expect(navigationManagement).toContain("requiredPermission: 'canManageSettings'");
        expect(navigationManagement).toContain('const requireAgencyNavigationAccess = useCallback(() =>');
        expect(navigationManagement).toContain('if (!requireAgencyNavigationAccess()) return');
        expect(navigationManagement).toContain('await saveAgencyLanding(currentTenant.id');
        expect(navigationManagement).toContain('setHeaderLinks(prev =>');
        expect(navigationManagement).toContain('setFooterColumns(prev =>');
        expect(navigationManagement).toContain('setSocialLinks(prev =>');
        expect(navigationManagement).toContain('disabled={isSaving || !hasChanges || !canManageNavigation}');
        expect(navigationManagement).toContain('navigationAccess.message');
    });
});
