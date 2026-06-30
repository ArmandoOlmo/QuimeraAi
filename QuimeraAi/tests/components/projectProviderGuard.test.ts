import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(__dirname, '../..');

describe('authenticated project provider guard', () => {
  it('keeps authenticated route children behind feature providers while auth is settling', () => {
    const source = readFileSync(resolve(appRoot, 'contexts/AppProviders.tsx'), 'utf8');

    expect(source).toContain('const { user, loadingAuth } = useAuth();');
    expect(source).toContain('if (!user && !loadingAuth)');
    expect(source).toContain('<FeatureProviders>{children}</FeatureProviders>');
  });

  it('prevents AuthenticatedAppContent from crashing if project context is briefly unavailable', () => {
    const source = readFileSync(resolve(appRoot, 'components/app/AuthenticatedAppContent.tsx'), 'utf8');

    expect(source).toContain("import { useSafeProject } from '../../contexts/project';");
    expect(source).toContain('const projectContext = useSafeProject();');
    expect(source).toContain('if (!projectContext)');
    expect(source).toContain('return <MinimalLoader />;');
  });

  it('keeps AuthenticatedAppContent SEO setup safe outside ProjectProvider', () => {
    const source = readFileSync(resolve(appRoot, 'hooks/useSEO.ts'), 'utf8');

    expect(source).toContain("import { useSafeProject } from '../contexts/project';");
    expect(source).toContain('const projectContext = useSafeProject();');
    expect(source).not.toContain('useProject();');
  });

  it('keeps the root language provider free of react-i18next hooks', () => {
    const source = readFileSync(resolve(appRoot, 'contexts/LanguageContext.tsx'), 'utf8');

    expect(source).toContain("import i18n from '../i18n';");
    expect(source).not.toContain('useTranslation');
    expect(source).not.toContain("from 'react-i18next'");
  });
});
