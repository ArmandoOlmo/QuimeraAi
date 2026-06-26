import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const supportedBioPageLocales = ['en', 'es'];
const builderSource = fs.readFileSync(path.join(rootDir, 'components/dashboard/BioPageBuilder.tsx'), 'utf8');
const publicBioPageSource = fs.readFileSync(path.join(rootDir, 'components/PublicBioPage.tsx'), 'utf8');
const generatedWebsitePreviewSource = fs.readFileSync(path.join(rootDir, 'components/onboarding/GeneratedWebsitePreview.tsx'), 'utf8');
const bioPageKeyPattern = /t\(\s*['"]bioPage\.([^'"`]+)['"]\s*,\s*(['"])(.*?)\2/gs;
const bioPageDeclaredKeyPattern = /(?:labelKey|descriptionKey):\s*['"]([^'"`]+)['"]/g;
const publicBioPageKeyPattern = /tp\(\s*['"]([^'"`]+)['"]\s*,\s*(['"])(.*?)\2/gs;
const aiWebsitePreviewKeyPattern = /t\(\s*['"](aiWebsiteStudio\.preview\.[^'"`]+)['"]/g;
const aiWebsitePreviewDeclaredKeyPattern = /['"](aiWebsiteStudio\.preview\.bioPage\.[^'"`]+)['"]/g;
const publicBioPageHelperKeys = ['leadFields.name', 'leadFields.email', 'leadFields.phone', 'leadFields.message'];

function getStaticBioPageKeys(): string[] {
    const keys = new Set<string>();
    let match: RegExpExecArray | null;

    bioPageKeyPattern.lastIndex = 0;
    while ((match = bioPageKeyPattern.exec(builderSource))) {
        const key = match[1];
        if (!key.includes('${')) keys.add(key);
    }

    bioPageDeclaredKeyPattern.lastIndex = 0;
    while ((match = bioPageDeclaredKeyPattern.exec(builderSource))) {
        const key = match[1];
        if (!key.includes('${')) keys.add(key);
    }

    return Array.from(keys).sort();
}

function getStaticPublicBioPageKeys(): string[] {
    const keys = new Set<string>();
    let match: RegExpExecArray | null;

    publicBioPageKeyPattern.lastIndex = 0;
    while ((match = publicBioPageKeyPattern.exec(publicBioPageSource))) {
        const key = match[1];
        if (!key.includes('${')) keys.add(key);
    }

    publicBioPageHelperKeys.forEach(key => keys.add(key));
    return Array.from(keys).sort();
}

function getStaticAiWebsitePreviewKeys(): string[] {
    const keys = new Set<string>();
    let match: RegExpExecArray | null;

    aiWebsitePreviewKeyPattern.lastIndex = 0;
    while ((match = aiWebsitePreviewKeyPattern.exec(generatedWebsitePreviewSource))) {
        const key = match[1];
        if (!key.includes('${')) keys.add(key);
    }

    aiWebsitePreviewDeclaredKeyPattern.lastIndex = 0;
    while ((match = aiWebsitePreviewDeclaredKeyPattern.exec(generatedWebsitePreviewSource))) {
        const key = match[1];
        if (!key.includes('${')) keys.add(key);
    }

    return Array.from(keys).sort();
}

function readLocale(locale: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(rootDir, `locales/${locale}/translation.json`), 'utf8'));
}

function hasNestedKey(record: Record<string, unknown> | undefined, key: string): boolean {
    let current: unknown = record;
    for (const part of key.split('.')) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) return false;
        if (!Object.prototype.hasOwnProperty.call(current, part)) return false;
        current = (current as Record<string, unknown>)[part];
    }
    return true;
}

describe('Bio Page i18n coverage', () => {
    it('defines every static Bio Page builder key in active locales', () => {
        const keys = getStaticBioPageKeys();

        expect(keys.length).toBeGreaterThan(250);

        for (const locale of supportedBioPageLocales) {
            const bioPage = readLocale(locale).bioPage as Record<string, unknown> | undefined;
            const missing = keys.filter(key => bioPage?.[key] === undefined);

            expect(missing, `${locale} missing Bio Page keys: ${missing.join(', ')}`).toEqual([]);
        }
    });

    it('defines every static public Bio Page key in active locales', () => {
        const keys = getStaticPublicBioPageKeys();

        expect(keys.length).toBeGreaterThan(40);

        for (const locale of supportedBioPageLocales) {
            const publicBioPage = readLocale(locale).publicBioPage as Record<string, unknown> | undefined;
            const missing = keys.filter(key => !hasNestedKey(publicBioPage, key));

            expect(missing, `${locale} missing public Bio Page keys: ${missing.join(', ')}`).toEqual([]);
        }
    });

    it('defines every Bio Page AI Studio preview key in supported locales', () => {
        const keys = getStaticAiWebsitePreviewKeys();

        expect(keys.length).toBeGreaterThan(60);

        for (const locale of supportedBioPageLocales) {
            const localeRoot = readLocale(locale);
            const missing = keys.filter(key => !hasNestedKey(localeRoot, key));

            expect(missing, `${locale} missing AI Website preview keys: ${missing.join(', ')}`).toEqual([]);
        }
    });
});
