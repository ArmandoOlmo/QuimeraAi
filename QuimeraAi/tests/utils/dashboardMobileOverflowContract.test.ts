import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Dashboard mobile overflow contract', () => {
    const appShell = read('src/design-system/components/AppShell.tsx');
    const dashboard = read('components/dashboard/Dashboard.tsx');
    const styles = read('src/styles/main.css');

    it('keeps the shared app shell from exposing horizontal pan on mobile', () => {
        expect(appShell).toContain('flex h-[100dvh] min-w-0 overflow-hidden');
        expect(appShell).toContain('min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain');
    });

    it('locks the Dashboard home center area to vertical panning only', () => {
        expect(dashboard).toContain('quimera-dashboard-home-bg quimera-dashboard-mobile-lock');
        expect(styles).toContain('.quimera-dashboard-home-bg');
        expect(styles).toContain('overscroll-behavior-x: none');
        expect(styles).toContain('.quimera-dashboard-mobile-lock');
        expect(styles).toContain('touch-action: pan-y');
    });

    it('does not animate the decorative home glow sideways into the scroll area', () => {
        expect(dashboard).toContain('initial={{ opacity: 0.55, y: -20 }}');
        expect(dashboard).toContain("animate={{ opacity: 0, y: 10 }}");
        expect(dashboard).not.toContain("x: '-18%'");
        expect(dashboard).not.toContain("x: '18%'");
    });
});
