import type { GlobalColors, ThemeData } from '../types/ui';
import type {
    ColorBrief,
    ColorCandidate,
    ColorSignal,
    ColorSystemMode,
    ColorSystemValidationIssue,
    ColorSystemValidationResult,
    WebsiteColorSystem,
} from '../types/colorSystem';
import type { WebsitePlan } from '../types/websitePlan';
import { getDefaultGlobalColors } from '../data/colorPalettes';
import { getLuminance, parseColorToRgb, toHex } from './colorUtils';

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };
type StrategyStyle = 'brand' | 'earth' | 'pastel' | 'monochrome' | 'botanical' | 'dopamine' | 'premium-dark';

interface StrategyProfile {
    id: string;
    label: string;
    labelEs: string;
    description: string;
    descriptionEs: string;
    style: StrategyStyle;
    mode: Exclude<ColorSystemMode, 'auto'>;
    primaryHueOffset: number;
    secondaryHueOffset: number;
    accentHueOffset: number;
    saturation: number;
    backgroundTint: number;
}

const DEFAULT_LIGHT_TEXT = '#22252b';
const DEFAULT_DARK_TEXT = '#e7e9ee';
const KNOWN_NEUTRALS = new Set(['#ffffff', '#000000', '#fff', '#000', '#f8fafc', '#f9fafb']);

/** 60-30-10 color proportion rule used by Quimera Color Expert and AI Studio. */
export const COLOR_PROPORTION_RULE_603010 = {
    id: '60-30-10',
    label: '60-30-10 Rule',
    labelEs: 'Regla 60-30-10',
    description: '60% dominant neutrals (background/surface), 30% brand colors (primary/secondary), 10% accent pop.',
    descriptionEs: '60% neutros dominantes (fondo/superficie), 30% colores de marca (primario/secundario), 10% acento.',
    roles: {
        dominant: ['background', 'surface', 'text', 'textMuted', 'heading', 'border'] as const,
        brand: ['primary', 'secondary'] as const,
        accent: ['accent'] as const,
    },
    targets: {
        dominantMaxSaturation: 22,
        brandMinSaturation: 36,
        brandMaxSaturation: 78,
        accentMinSaturationBoost: 8,
        accentMinHueDistance: 24,
    },
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundScore = (value: number) => Math.round(clamp(value, 0, 100));

function isWebsiteColorSystem(value: WebsiteColorSystem | GlobalColors | ColorCandidate): value is WebsiteColorSystem {
    return Boolean(value && typeof value === 'object' && typeof (value as WebsiteColorSystem).colors === 'object' && typeof (value as WebsiteColorSystem).score === 'number');
}

function isColorCandidate(value: WebsiteColorSystem | GlobalColors | ColorCandidate): value is ColorCandidate {
    return Boolean(value && typeof value === 'object' && typeof (value as ColorCandidate).system === 'object');
}

export function normalizeHexColor(value?: string | null): string | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (/^rgba?\(/i.test(trimmed)) return toHex(trimmed).toLowerCase();
    if (!trimmed.startsWith('#')) return null;
    let hex = trimmed.slice(1).replace(/[^0-9a-f]/gi, '');
    if (hex.length === 3 || hex.length === 4) {
        hex = hex.slice(0, 3).split('').map(char => char + char).join('');
    } else if (hex.length >= 6) {
        hex = hex.slice(0, 6);
    }
    return hex.length === 6 ? `#${hex.toLowerCase()}` : null;
}

function rgbToHex({ r, g, b }: Rgb): string {
    const toPart = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return `#${toPart(r)}${toPart(g)}${toPart(b)}`;
}

function hexToHsl(color: string): Hsl {
    const { r, g, b } = parseColorToRgb(color);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    if (delta !== 0) {
        if (max === rn) h = ((gn - bn) / delta) % 6;
        else if (max === gn) h = (bn - rn) / delta + 2;
        else h = (rn - gn) / delta + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
    const hn = (((h % 360) + 360) % 360) / 60;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs((hn % 2) - 1));
    const m = ln - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (hn >= 0 && hn < 1) [r, g, b] = [c, x, 0];
    else if (hn < 2) [r, g, b] = [x, c, 0];
    else if (hn < 3) [r, g, b] = [0, c, x];
    else if (hn < 4) [r, g, b] = [0, x, c];
    else if (hn < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

function rotateHue(color: string, degrees: number, saturation?: number, lightness?: number): string {
    const hsl = hexToHsl(color);
    return hslToHex({
        h: hsl.h + degrees,
        s: saturation ?? hsl.s,
        l: lightness ?? hsl.l,
    });
}

function mix(colorA: string, colorB: string, amount: number): string {
    const a = parseColorToRgb(colorA);
    const b = parseColorToRgb(colorB);
    const t = clamp(amount, 0, 1);
    return rgbToHex({
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
    });
}

export function contrastRatio(colorA: string, colorB: string): number {
    const a = getLuminance(colorA);
    const b = getLuminance(colorB);
    const light = Math.max(a, b);
    const dark = Math.min(a, b);
    return (light + 0.05) / (dark + 0.05);
}

function bestTextFor(background: string): string {
    return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#111827') ? '#ffffff' : '#111827';
}

function setTone(color: string, saturation: number, lightness: number, hueOffset = 0): string {
    const hsl = hexToHsl(color);
    return hslToHex({
        h: hsl.h + hueOffset,
        s: clamp(saturation, 0, 100),
        l: clamp(lightness, 0, 100),
    });
}

function safeBrandColor(color: string, mode: 'light' | 'dark', saturationBoost = 0): string {
    const hsl = hexToHsl(color);
    const s = clamp(Math.max(hsl.s, 42) + saturationBoost, 36, 78);
    const l = mode === 'dark'
        ? clamp(hsl.l < 48 ? 58 : hsl.l, 54, 68)
        : clamp(hsl.l > 62 ? 46 : hsl.l, 36, 54);
    return hslToHex({ h: hsl.h, s, l });
}

function ensureButtonReady(color: string): string {
    const hsl = hexToHsl(color);
    const whiteRatio = contrastRatio(color, '#ffffff');
    const blackRatio = contrastRatio(color, '#111827');
    if (Math.max(whiteRatio, blackRatio) >= 3) return color;
    return hslToHex({ ...hsl, l: hsl.l > 55 ? 43 : 62 });
}

function pickWeightedSeed(signals: ColorSignal[] = [], fallback: string): string {
    const scored = signals
        .map(signal => ({ ...signal, color: normalizeHexColor(signal.color) }))
        .filter((signal): signal is ColorSignal & { color: string } => Boolean(signal.color))
        .filter(signal => !KNOWN_NEUTRALS.has(signal.color.toLowerCase()))
        .map(signal => {
            const hsl = hexToHsl(signal.color);
            const roleBoost = ['primary', 'logo', 'accent'].includes(signal.roleGuess || '') ? 20 : 0;
            const chromaScore = hsl.s >= 18 && hsl.l >= 18 && hsl.l <= 82 ? 15 : -20;
            return { color: signal.color, score: signal.weight + roleBoost + chromaScore };
        })
        .sort((a, b) => b.score - a.score);

    return scored[0]?.color || fallback;
}

function normalizeSignals(signals: ColorSignal[] = []): ColorSignal[] {
    return signals
        .map(signal => {
            const color = normalizeHexColor(signal.color);
            return color ? { ...signal, color, weight: Number.isFinite(signal.weight) ? signal.weight : 10 } : null;
        })
        .filter((signal): signal is ColorSignal => Boolean(signal));
}

function dedupeSignals(signals: ColorSignal[]): ColorSignal[] {
    const seen = new Set<string>();
    return signals.filter(signal => {
        const key = `${signal.color}-${signal.source}-${signal.roleGuess || 'unknown'}-${signal.label || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeIndustry(industry?: string): string {
    const value = (industry || '').toLowerCase();
    if (/restaurant|cafe|food|bar|bakery/.test(value)) return 'restaurant';
    if (/real|property|inmobili|realtor/.test(value)) return 'real-estate';
    if (/shop|store|ecommerce|retail|fashion|jewelry|product/.test(value)) return 'ecommerce';
    if (/photo|portfolio|creative|agency|art|culture|cultural|craft/.test(value)) return 'creative';
    if (/tech|software|saas|ai|web3|cyber|gaming/.test(value)) return 'technology';
    if (/legal|law|finance|consult|service|construction|health|clinic|dental/.test(value)) return 'services';
    return 'services';
}

function industryFallbackColor(industry: string): string {
    switch (normalizeIndustry(industry)) {
        case 'restaurant': return '#b45309';
        case 'real-estate': return '#1d4ed8';
        case 'ecommerce': return '#2563eb';
        case 'creative': return '#0ea5e9';
        case 'technology': return '#7c3aed';
        default: return '#2563eb';
    }
}

function inferMood(plan: Pick<WebsitePlan, 'businessProfile' | 'brandProfile' | 'generationMode'>): string[] {
    const text = `${plan.businessProfile.industry} ${plan.businessProfile.description} ${plan.brandProfile.visualStyle || ''}`.toLowerCase();
    const mood: string[] = [];
    if (/premium|luxury|elegant|boutique|fine|high-end/.test(text)) mood.push('premium');
    if (/culture|cultural|puerto rico|boricua|craft|artisan|art/.test(text)) mood.push('cultural');
    if (/restaurant|food|cafe|bakery/.test(text)) mood.push('warm');
    if (/tech|software|ai|cyber|web3/.test(text)) mood.push('modern');
    if (/real|finance|legal|consult/.test(text)) mood.push('trustworthy');
    if (/shop|store|ecommerce|retail/.test(text)) mood.push('commerce');
    if (plan.generationMode === 'modernize') mood.push('modernize');
    return [...new Set(mood.length ? mood : ['professional'])];
}

export function createColorBriefFromWebsitePlan(plan: WebsitePlan): ColorBrief {
    const colors = plan.brandProfile.colors;
    const importedColors: ColorSignal[] = Object.entries(colors)
        .filter(([, value]) => Boolean(value))
        .map(([key, value], index) => ({
            color: String(value),
            source: plan.source === 'imported-url' ? 'import' : 'ai',
            weight: key === 'primary' ? 80 : Math.max(20, 62 - index * 7),
            roleGuess: key as ColorSignal['roleGuess'],
            label: key,
        }));

    const extractedImageSignals = (plan.contentMap.extractedImages || [])
        .filter(image => image.recommendedUse === 'logo' || image.recommendedUse === 'hero')
        .map<ColorSignal>((image, index) => ({
            color: colors.primary || industryFallbackColor(plan.businessProfile.industry),
            source: image.recommendedUse === 'logo' ? 'logo' : 'image',
            weight: image.recommendedUse === 'logo' ? 72 : 38 - index,
            roleGuess: image.recommendedUse === 'logo' ? 'logo' : 'image',
            label: image.alt || image.recommendedUse,
        }));

    return {
        source: plan.source,
        industry: plan.businessProfile.industry,
        mood: inferMood(plan),
        personality: plan.brandProfile.visualStyle,
        mode: plan.brandProfile.isDarkTheme === true ? 'dark' : plan.brandProfile.isDarkTheme === false ? 'light' : 'auto',
        generationMode: plan.generationMode,
        importedColors,
        logoColors: extractedImageSignals.filter(signal => signal.source === 'logo'),
        imageColors: extractedImageSignals.filter(signal => signal.source === 'image'),
        hasEcommerce: Boolean(plan.businessProfile.hasEcommerce || plan.componentPlan.some(item => item.component.toLowerCase().includes('product') || item.component === 'categoryGrid')),
        activeComponents: plan.componentPlan.map(item => item.component),
    };
}

export function createColorBriefFromTheme(params: {
    theme?: Partial<ThemeData>;
    industry?: string;
    businessName?: string;
    description?: string;
    activeComponents?: string[];
    hasEcommerce?: boolean;
}): ColorBrief {
    const globalColors = params.theme?.globalColors || getDefaultGlobalColors();
    return {
        source: 'editor',
        industry: params.industry || 'services',
        mood: inferMood({
            generationMode: 'modernize',
            businessProfile: {
                businessName: params.businessName || '',
                industry: params.industry || '',
                description: params.description || '',
                services: [],
                contactInfo: {},
            },
            brandProfile: {
                colors: globalColors,
                visualStyle: '',
                isDarkTheme: getLuminance(globalColors.background) < 0.35,
            },
        }),
        mode: 'auto',
        importedColors: Object.entries(globalColors).map(([key, color], index) => ({
            color,
            source: 'user',
            weight: key === 'primary' ? 90 : Math.max(20, 68 - index * 5),
            roleGuess: key as ColorSignal['roleGuess'],
            label: key,
        })),
        hasEcommerce: params.hasEcommerce,
        activeComponents: params.activeComponents,
    };
}

function getStrategies(brief: ColorBrief, seed: string): StrategyProfile[] {
    const industry = normalizeIndustry(brief.industry);
    const seedHue = hexToHsl(seed).h;
    const prefersDark = brief.mode === 'dark' || (brief.mode === 'auto' && ['technology'].includes(industry) && brief.mood.includes('modern'));
    const commerceLight = brief.hasEcommerce && brief.mode !== 'dark';
    const expressive = ['creative', 'ecommerce', 'restaurant'].includes(industry) || brief.mood.some(item => ['cultural', 'commerce', 'warm'].includes(item));

    const base: StrategyProfile[] = [
        {
            id: 'editorial-brand',
            label: 'Editorial Brand',
            labelEs: 'Marca Editorial',
            description: 'A modern brand system with warm depth, clean CTAs, and stronger contrast.',
            descriptionEs: 'Sistema moderno de marca con profundidad cálida, CTAs claros y contraste fuerte.',
            style: 'brand',
            mode: commerceLight ? 'light' : prefersDark ? 'dark' : 'light',
            primaryHueOffset: 0,
            secondaryHueOffset: industry === 'restaurant' ? 24 : 34,
            accentHueOffset: industry === 'creative' ? 148 : 64,
            saturation: 8,
            backgroundTint: 0.05,
        },
        {
            id: 'mineral-earth',
            label: 'Mineral Earth',
            labelEs: 'Tierra Mineral',
            description: 'Clay, olive, oat and warm neutrals for a grounded premium website.',
            descriptionEs: 'Arcilla, oliva, avena y neutros cálidos para un website premium y natural.',
            style: 'earth',
            mode: 'light',
            primaryHueOffset: 0,
            secondaryHueOffset: seedHue > 80 && seedHue < 170 ? -36 : 42,
            accentHueOffset: seedHue > 170 && seedHue < 260 ? 124 : 74,
            saturation: -4,
            backgroundTint: 0.1,
        },
        {
            id: 'soft-pastel-contrast',
            label: 'Soft Pastel Contrast',
            labelEs: 'Pastel con Contraste',
            description: 'Pastel surfaces with darker interactive colors so the design feels soft, not weak.',
            descriptionEs: 'Superficies pastel con colores interactivos más profundos para verse suave, no débil.',
            style: 'pastel',
            mode: 'light',
            primaryHueOffset: industry === 'restaurant' ? 12 : 0,
            secondaryHueOffset: 46,
            accentHueOffset: expressive ? 138 : 92,
            saturation: 6,
            backgroundTint: 0.12,
        },
        {
            id: 'mono-depth',
            label: 'Monochrome Depth',
            labelEs: 'Monocromo con Profundidad',
            description: 'A refined single-hue system with visible surfaces, strong hierarchy and readable CTAs.',
            descriptionEs: 'Sistema de un solo tono con superficies visibles, jerarquía fuerte y CTAs legibles.',
            style: 'monochrome',
            mode: prefersDark && !commerceLight ? 'dark' : 'light',
            primaryHueOffset: 0,
            secondaryHueOffset: 0,
            accentHueOffset: 0,
            saturation: -6,
            backgroundTint: 0.04,
        },
        {
            id: 'botanical-pop',
            label: 'Botanical Pop',
            labelEs: 'Botánico Pop',
            description: 'Jade, wasabi and persimmon-style highlights balanced with calm editorial neutrals.',
            descriptionEs: 'Toques jade, wasabi y persimmon equilibrados con neutros editoriales calmados.',
            style: 'botanical',
            mode: commerceLight ? 'light' : prefersDark ? 'dark' : 'light',
            primaryHueOffset: 0,
            secondaryHueOffset: 96,
            accentHueOffset: 34,
            saturation: 10,
            backgroundTint: 0.07,
        },
        {
            id: prefersDark && !commerceLight ? 'carbon-chroma' : 'dopamine-highlight',
            label: prefersDark && !commerceLight ? 'Carbon Chroma' : 'Dopamine Highlight',
            labelEs: prefersDark && !commerceLight ? 'Carbono Cromático' : 'Acento Dopamina',
            description: prefersDark && !commerceLight
                ? 'A dark modern interface with electric accents and premium contrast.'
                : 'A confident bright palette for modern, energetic and conversion-driven sites.',
            descriptionEs: prefersDark && !commerceLight
                ? 'Interfaz oscura moderna con acentos eléctricos y contraste premium.'
                : 'Paleta brillante y segura para sitios modernos, energéticos y enfocados en conversión.',
            style: prefersDark && !commerceLight ? 'premium-dark' : 'dopamine',
            mode: prefersDark && !commerceLight ? 'dark' : 'light',
            primaryHueOffset: 0,
            secondaryHueOffset: 150,
            accentHueOffset: industry === 'creative' ? 38 : 102,
            saturation: 18,
            backgroundTint: 0.03,
        },
    ];

    if (industry === 'restaurant') {
        base[1] = { ...base[1], id: 'clay-table', label: 'Clay Table', labelEs: 'Mesa Arcilla', secondaryHueOffset: 38, accentHueOffset: 76 };
    }
    if (industry === 'technology') {
        base[4] = { ...base[4], id: 'cool-blue-citron', label: 'Cool Blue + Citron', labelEs: 'Azul Frío + Citron', secondaryHueOffset: 112, accentHueOffset: 158, saturation: 14 };
    }
    return base;
}

function buildSystemFromStrategy(brief: ColorBrief, strategy: StrategyProfile, seed: string): GlobalColors {
    const mode = strategy.mode;
    const industry = normalizeIndustry(brief.industry);
    const isDark = mode === 'dark';
    const primarySeed = rotateHue(seed, strategy.primaryHueOffset);
    let primary = ensureButtonReady(safeBrandColor(primarySeed, mode, strategy.saturation));
    let secondary = safeBrandColor(rotateHue(seed, strategy.secondaryHueOffset), mode, strategy.saturation - 4);
    let accent = ensureButtonReady(safeBrandColor(rotateHue(seed, strategy.accentHueOffset), mode, strategy.saturation + 8));
    let background: string;
    let surface: string;
    let heading: string;
    let text: string;

    switch (strategy.style) {
        case 'earth': {
            const clay = industry === 'restaurant' ? '#a84f2d' : '#9a5f3f';
            const olive = '#5f6f3f';
            const persimmon = '#d66a35';
            primary = ensureButtonReady(mix(safeBrandColor(primarySeed, 'light', -6), clay, 0.58));
            secondary = mix(safeBrandColor(rotateHue(seed, strategy.secondaryHueOffset), 'light', -14), olive, 0.64);
            accent = ensureButtonReady(mix(safeBrandColor(rotateHue(seed, strategy.accentHueOffset), 'light', 6), persimmon, 0.48));
            background = '#f7f0e6';
            surface = '#fffaf3';
            heading = '#2c211b';
            text = '#4b4037';
            break;
        }
        case 'pastel': {
            const powder = rotateHue(seed, strategy.secondaryHueOffset, 42, 82);
            const peach = mix(rotateHue(seed, strategy.accentHueOffset, 62, 76), '#f7b7a3', 0.45);
            primary = ensureButtonReady(setTone(primarySeed, 56, 42));
            secondary = powder;
            accent = ensureButtonReady(setTone(peach, 66, 48));
            background = mix('#fffaf3', rotateHue(seed, 0, 36, 92), 0.22);
            surface = mix('#ffffff', powder, 0.16);
            heading = '#1f2633';
            text = '#4a5363';
            break;
        }
        case 'monochrome': {
            const hue = hexToHsl(seed).h;
            primary = ensureButtonReady(hslToHex({ h: hue, s: isDark ? 54 : 48, l: isDark ? 64 : 36 }));
            secondary = hslToHex({ h: hue, s: isDark ? 34 : 30, l: isDark ? 48 : 54 });
            accent = ensureButtonReady(hslToHex({ h: hue, s: isDark ? 62 : 56, l: isDark ? 70 : 43 }));
            background = isDark
                ? hslToHex({ h: hue, s: 18, l: 7.5 })
                : hslToHex({ h: hue, s: 20, l: 97 });
            surface = isDark
                ? hslToHex({ h: hue, s: 20, l: 14 })
                : hslToHex({ h: hue, s: 24, l: 91 });
            heading = isDark ? '#f8fafc' : hslToHex({ h: hue, s: 34, l: 15 });
            text = isDark ? DEFAULT_DARK_TEXT : hslToHex({ h: hue, s: 18, l: 25 });
            break;
        }
        case 'botanical': {
            const jade = '#047857';
            const wasabi = '#8fb339';
            const persimmon = '#e85d3f';
            primary = ensureButtonReady(mix(safeBrandColor(primarySeed, mode, 2), jade, isDark ? 0.42 : 0.5));
            secondary = mix(safeBrandColor(rotateHue(seed, strategy.secondaryHueOffset), mode, 3), wasabi, 0.58);
            accent = ensureButtonReady(mix(safeBrandColor(rotateHue(seed, strategy.accentHueOffset), mode, 12), persimmon, 0.48));
            background = isDark ? '#0c1410' : '#f6f7ec';
            surface = isDark ? '#14211a' : '#fffdf6';
            heading = isDark ? '#f7fbe9' : '#172414';
            text = isDark ? '#dfe7d8' : '#344131';
            break;
        }
        case 'dopamine': {
            primary = ensureButtonReady(setTone(primarySeed, 76, 43));
            secondary = setTone(seed, 68, 47, strategy.secondaryHueOffset);
            accent = ensureButtonReady(setTone(seed, 86, 50, strategy.accentHueOffset));
            background = industry === 'ecommerce' ? '#fff8ef' : '#fff7fb';
            surface = '#ffffff';
            heading = '#191622';
            text = '#3e3948';
            break;
        }
        case 'premium-dark': {
            const plum = '#2d102c';
            const mint = '#2dd4bf';
            const electric = rotateHue(seed, strategy.secondaryHueOffset, 72, 62);
            primary = ensureButtonReady(safeBrandColor(primarySeed, 'dark', 8));
            secondary = mix(electric, mint, 0.46);
            accent = ensureButtonReady(rotateHue(seed, strategy.accentHueOffset, 82, 64));
            background = mix('#09080d', plum, 0.38);
            surface = mix('#111827', plum, 0.42);
            heading = '#fff7ed';
            text = '#e9e4ee';
            break;
        }
        case 'brand':
        default: {
            const primaryHsl = hexToHsl(primary);
            const neutralHue = primaryHsl.h;
            background = mode === 'dark'
                ? hslToHex({ h: neutralHue, s: clamp(12 + strategy.backgroundTint * 100, 8, 20), l: 8.5 })
                : mix(hslToHex({ h: neutralHue, s: clamp(10 + strategy.backgroundTint * 100, 8, 18), l: 97 }), '#fff7ed', 0.14);
            surface = mode === 'dark'
                ? hslToHex({ h: neutralHue, s: clamp(14 + strategy.backgroundTint * 100, 10, 24), l: 14 })
                : '#ffffff';
            heading = mode === 'dark' ? '#f6f7fb' : '#151821';
            text = mode === 'dark' ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT;
        }
    }

    const locked = brief.lockedColors || {};
    primary = normalizeHexColor(locked.primary) || primary;
    secondary = normalizeHexColor(locked.secondary) || secondary;
    accent = normalizeHexColor(locked.accent) || accent;
    background = normalizeHexColor(locked.background) || background;
    surface = normalizeHexColor(locked.surface) || surface;
    text = normalizeHexColor(locked.text) || text;
    heading = normalizeHexColor(locked.heading) || heading;

    const textMuted = mode === 'dark' ? mix(text, background, 0.36) : mix(text, background, 0.42);
    const border = mode === 'dark' ? mix(surface, '#ffffff', 0.12) : mix(background, '#111827', 0.12);
    const error = mode === 'dark' ? '#f87171' : '#dc2626';
    const success = mode === 'dark' ? '#4ade80' : '#16a34a';

    return repairColorSystem({
        primary,
        secondary,
        accent,
        background,
        surface,
        text,
        textMuted,
        heading,
        border,
        success,
        error,
    }).colors;
}

function isNeutralColor(color: string, maxSaturation = COLOR_PROPORTION_RULE_603010.targets.dominantMaxSaturation): boolean {
    return hexToHsl(color).s <= maxSaturation;
}

function isMonochromePalette(colors: GlobalColors): boolean {
    const hues = [colors.primary, colors.secondary, colors.accent].map(color => hexToHsl(color).h);
    const spread = Math.max(...hues) - Math.min(...hues);
    return spread < 18;
}

function neutralizeForDominantRole(color: string, referenceHue: number, mode: 'light' | 'dark'): string {
    const hsl = hexToHsl(color);
    const targetSaturation = clamp(Math.min(hsl.s, COLOR_PROPORTION_RULE_603010.targets.dominantMaxSaturation), 4, COLOR_PROPORTION_RULE_603010.targets.dominantMaxSaturation);
    const targetLightness = mode === 'dark'
        ? clamp(hsl.l, 6, 18)
        : clamp(hsl.l, 92, 98);
    return hslToHex({
        h: Number.isFinite(referenceHue) ? referenceHue : hsl.h,
        s: targetSaturation,
        l: targetLightness,
    });
}

export function score603010Compliance(colors: GlobalColors, options: { allowMonochrome?: boolean } = {}): number {
    const { targets } = COLOR_PROPORTION_RULE_603010;
    const bgHsl = hexToHsl(colors.background);
    const surfaceHsl = hexToHsl(colors.surface);
    const primaryHsl = hexToHsl(colors.primary);
    const secondaryHsl = hexToHsl(colors.secondary);
    const accentHsl = hexToHsl(colors.accent);
    const textHsl = hexToHsl(colors.text);
    const monochrome = options.allowMonochrome ?? isMonochromePalette(colors);

    let score = 42;

    if (bgHsl.s <= targets.dominantMaxSaturation) score += 14;
    else if (bgHsl.s <= targets.dominantMaxSaturation + 8) score += 7;

    if (surfaceHsl.s <= targets.dominantMaxSaturation + 4) score += 10;
    if (textHsl.s <= 14) score += 8;

    if (primaryHsl.s >= targets.brandMinSaturation && primaryHsl.s <= targets.brandMaxSaturation) score += 10;
    if (secondaryHsl.s >= targets.brandMinSaturation - 8 && secondaryHsl.s <= targets.brandMaxSaturation) score += 6;
    if (primaryHsl.s >= secondaryHsl.s + 2) score += 5;

    if (accentHsl.s >= primaryHsl.s + targets.accentMinSaturationBoost) score += 12;
    else if (accentHsl.s >= primaryHsl.s + 3) score += 6;

    if (monochrome) {
        const brandSpread = Math.abs(primaryHsl.l - accentHsl.l);
        if (brandSpread >= 8) score += 10;
    } else if (hueDistance(colors.accent, colors.primary) >= targets.accentMinHueDistance) {
        score += 10;
    } else if (hueDistance(colors.accent, colors.secondary) >= targets.accentMinHueDistance) {
        score += 6;
    }

    return roundScore(score);
}

export function apply603010Rule(colors: GlobalColors): { colors: GlobalColors; warnings: string[] } {
    const warnings: string[] = [];
    const { targets } = COLOR_PROPORTION_RULE_603010;
    const mode: 'light' | 'dark' = getLuminance(colors.background) < 0.35 ? 'dark' : 'light';
    const referenceHue = hexToHsl(colors.primary).h;
    const monochrome = isMonochromePalette(colors);
    const adjusted: GlobalColors = { ...colors };

    if (!isNeutralColor(adjusted.background)) {
        adjusted.background = neutralizeForDominantRole(adjusted.background, referenceHue, mode);
        warnings.push('Adjusted background toward the 60% dominant neutral layer.');
    }
    if (!isNeutralColor(adjusted.surface, targets.dominantMaxSaturation + 4)) {
        adjusted.surface = mode === 'dark'
            ? mix(adjusted.background, '#ffffff', 0.08)
            : mix(adjusted.background, '#ffffff', 0.72);
        warnings.push('Adjusted surface to stay within the 60% dominant neutral layer.');
    }

    const primaryHsl = hexToHsl(adjusted.primary);
    if (primaryHsl.s < targets.brandMinSaturation) {
        adjusted.primary = ensureButtonReady(hslToHex({
            ...primaryHsl,
            s: clamp(primaryHsl.s + 10, targets.brandMinSaturation, targets.brandMaxSaturation),
        }));
        warnings.push('Boosted primary saturation for the 30% brand layer.');
    }

    const secondaryHsl = hexToHsl(adjusted.secondary);
    const targetSecondarySaturation = clamp(primaryHsl.s - 8, targets.brandMinSaturation - 6, targets.brandMaxSaturation - 4);
    if (secondaryHsl.s > primaryHsl.s + 4 || secondaryHsl.s < targets.brandMinSaturation - 10) {
        adjusted.secondary = hslToHex({
            ...secondaryHsl,
            s: targetSecondarySaturation,
        });
        warnings.push('Rebalanced secondary color for the 30% brand layer.');
    }

    const accentHsl = hexToHsl(adjusted.accent);
    const targetAccentSaturation = clamp(
        Math.max(accentHsl.s, primaryHsl.s + targets.accentMinSaturationBoost),
        targets.brandMinSaturation,
        88,
    );
    let nextAccent = hslToHex({ ...accentHsl, s: targetAccentSaturation });

    if (!monochrome && hueDistance(nextAccent, adjusted.primary) < targets.accentMinHueDistance) {
        const accentPrimaryHueDelta = Math.min(
            Math.abs(accentHsl.h - primaryHsl.h),
            360 - Math.abs(accentHsl.h - primaryHsl.h),
        );
        nextAccent = rotateHue(
            adjusted.primary,
            accentPrimaryHueDelta >= 12 ? (accentHsl.h - primaryHsl.h) : 58,
            targetAccentSaturation,
            accentHsl.l,
        );
        warnings.push('Shifted accent hue to preserve the 10% pop layer.');
    }
    adjusted.accent = ensureButtonReady(nextAccent);
    if (targetAccentSaturation > accentHsl.s) {
        warnings.push('Boosted accent saturation for the 10% pop layer.');
    }

    return { colors: adjusted, warnings: [...new Set(warnings)] };
}

function scoreSystem(colors: GlobalColors, brief: ColorBrief, seed: string, strategy?: StrategyProfile | { style?: StrategyStyle; id?: string }): WebsiteColorSystem['scores'] {
    const textContrast = contrastRatio(colors.text, colors.background);
    const headingContrast = contrastRatio(colors.heading, colors.background);
    const surfaceTextContrast = contrastRatio(colors.text, colors.surface);
    const buttonContrast = Math.max(contrastRatio(colors.primary, '#ffffff'), contrastRatio(colors.primary, '#111827'));
    const contrast = roundScore(((Math.min(textContrast, 7) / 7) * 35) + ((Math.min(headingContrast, 7) / 7) * 25) + ((Math.min(surfaceTextContrast, 7) / 7) * 20) + ((Math.min(buttonContrast, 4.5) / 4.5) * 20));

    const primaryHue = hexToHsl(colors.primary).h;
    const secondaryHue = hexToHsl(colors.secondary).h;
    const accentHue = hexToHsl(colors.accent).h;
    const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const hasUsefulSeparation = hueDistance(primaryHue, accentHue) >= 28 && hueDistance(primaryHue, secondaryHue) >= 18;
    const isMonochrome = strategy?.style === 'monochrome' || strategy?.id?.includes('mono');
    const harmony = isMonochrome
        ? roundScore(78 + (Math.abs(getLuminance(colors.surface) - getLuminance(colors.background)) >= 0.04 ? 12 : 0) + (contrast >= 82 ? 8 : 0))
        : roundScore((hasUsefulSeparation ? 78 : 55) + (Math.abs(hueDistance(secondaryHue, accentHue) - 90) < 45 ? 14 : 0) + (strategy?.style && strategy.style !== 'brand' ? 6 : 0));

    const seedHue = hexToHsl(seed).h;
    const brandDistance = hueDistance(primaryHue, seedHue);
    const trendStrategy = Boolean(strategy?.style && strategy.style !== 'brand' && strategy.style !== 'monochrome');
    const brandPenalty = trendStrategy ? 0.32 : isMonochrome ? 0.22 : 0.55;
    const brandFit = roundScore(100 - Math.min(brandDistance, 120) * brandPenalty + (brief.importedColors?.length ? 8 : 0));

    const surfaceDelta = Math.abs(getLuminance(colors.surface) - getLuminance(colors.background));
    const ecommerceBoost = brief.hasEcommerce
        ? (contrastRatio(colors.error, colors.background) >= 3 ? 12 : 0) + (contrastRatio(colors.accent, colors.background) >= 2 ? 8 : 0)
        : 10;
    const componentReadiness = roundScore(55 + (buttonContrast >= 3 ? 18 : 0) + (surfaceDelta >= 0.04 ? 15 : 0) + ecommerceBoost);
    const proportionBalance = score603010Compliance(colors, {
        allowMonochrome: isMonochrome || strategy?.style === 'monochrome' || strategy?.id?.includes('mono'),
    });

    return { contrast, harmony, brandFit, componentReadiness, proportionBalance };
}

function totalScore(scores: WebsiteColorSystem['scores']): number {
    return roundScore(
        scores.contrast * 0.40
        + scores.harmony * 0.22
        + scores.brandFit * 0.18
        + scores.componentReadiness * 0.10
        + scores.proportionBalance * 0.10,
    );
}

function hueDistance(colorA: string, colorB: string): number {
    const a = hexToHsl(colorA).h;
    const b = hexToHsl(colorB).h;
    return Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
}

function buildImportedPaletteBase(brief: ColorBrief): { colors: Partial<GlobalColors>; mode: 'light' | 'dark'; seed: string; sourceColors: string[] } | null {
    const signals = dedupeSignals(normalizeSignals([
        ...(brief.logoColors || []),
        ...(brief.importedColors || []),
        ...(brief.imageColors || []),
    ]))
        .map(signal => ({
            ...signal,
            weight: signal.label && signal.label.includes('.') ? signal.weight + 18 : signal.weight,
        }))
        .sort((a, b) => b.weight - a.weight);

    if (signals.length === 0) return null;

    const fallback = industryFallbackColor(brief.industry);
    const seed = pickWeightedSeed(signals, fallback);
    const sourceColors = [...new Set(signals.map(signal => signal.color))].slice(0, 8);
    const chromaticSignals = signals.filter(signal => {
        const hsl = hexToHsl(signal.color);
        return hsl.s >= 12 && hsl.l >= 12 && hsl.l <= 88 && !KNOWN_NEUTRALS.has(signal.color.toLowerCase());
    });
    const roleColor = (roles: ColorSignal['roleGuess'][], exclude: string[] = []) => (
        signals.find(signal => roles.includes(signal.roleGuess) && !exclude.includes(signal.color))?.color || null
    );
    const distinctChromatic = (exclude: string[], minDistance = 18) => (
        chromaticSignals.find(signal => !exclude.includes(signal.color) && exclude.every(color => hueDistance(signal.color, color) >= minDistance))?.color ||
        chromaticSignals.find(signal => !exclude.includes(signal.color))?.color ||
        null
    );

    const primary = roleColor(['primary', 'logo']) || chromaticSignals[0]?.color || seed;
    const secondary = roleColor(['secondary'], [primary]) || distinctChromatic([primary], 16) || rotateHue(primary, 32);
    const accent = roleColor(['accent'], [primary, secondary]) || distinctChromatic([primary, secondary], 28) || rotateHue(primary, 58);
    const detectedBackground = roleColor(['background']) || signals.find(signal => getLuminance(signal.color) > 0.82 || getLuminance(signal.color) < 0.18)?.color;
    const mode = brief.mode === 'dark'
        ? 'dark'
        : brief.mode === 'light'
            ? 'light'
            : detectedBackground && getLuminance(detectedBackground) < 0.35 ? 'dark' : 'light';
    const background = detectedBackground || (mode === 'dark' ? '#0f1117' : '#ffffff');
    const surface = roleColor(['surface'], [background]) || (mode === 'dark' ? mix(background, '#ffffff', 0.08) : mix(background, '#111827', 0.025));
    const text = roleColor(['text'], [background, surface]) || (mode === 'dark' ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT);
    const heading = roleColor(['text'], [background, surface]) || (mode === 'dark' ? '#f6f7fb' : '#151821');

    return {
        colors: {
            primary,
            secondary,
            accent,
            background,
            surface,
            text,
            textMuted: mode === 'dark' ? mix(text, background, 0.36) : mix(text, background, 0.42),
            heading,
            border: mode === 'dark' ? mix(surface, '#ffffff', 0.12) : mix(background, '#111827', 0.12),
            success: mode === 'dark' ? '#4ade80' : '#16a34a',
            error: mode === 'dark' ? '#f87171' : '#dc2626',
        },
        mode,
        seed,
        sourceColors,
    };
}

function buildImportedPaletteCandidate(brief: ColorBrief, variant: 'faithful' | 'polished'): ColorCandidate | null {
    const base = buildImportedPaletteBase(brief);
    if (!base) return null;

    const mode = base.mode;
    const baseColors = base.colors;
    const colors = variant === 'polished'
        ? {
            ...baseColors,
            primary: ensureButtonReady(safeBrandColor(baseColors.primary || base.seed, mode, 1)),
            secondary: safeBrandColor(baseColors.secondary || rotateHue(base.seed, 32), mode, -4),
            accent: ensureButtonReady(safeBrandColor(baseColors.accent || rotateHue(base.seed, 58), mode, 7)),
            background: mode === 'dark'
                ? mix(baseColors.background || '#0f1117', '#000000', 0.12)
                : mix(baseColors.background || '#ffffff', '#ffffff', 0.24),
            surface: mode === 'dark'
                ? mix(baseColors.surface || '#171923', '#ffffff', 0.04)
                : mix(baseColors.surface || '#ffffff', '#ffffff', 0.18),
        }
        : baseColors;

    const repaired = repairColorSystem(colors);
    const scores = scoreSystem(repaired.colors, brief, base.seed);
    const validation = validateColorSystem(repaired.colors);
    const score = validation.valid ? totalScore(scores) : Math.min(totalScore(scores), 58);
    const warnings = [
        ...repaired.warnings,
        ...validation.issues.filter(issue => issue.severity === 'warning').map(issue => issue.message),
    ];
    const id = variant === 'faithful' ? 'imported-palette-faithful' : 'imported-palette-polished';
    const system: WebsiteColorSystem = {
        id,
        name: variant === 'faithful' ? 'Use Imported Palette' : 'Lightly Improve Imported Palette',
        nameEs: variant === 'faithful' ? 'Usar paleta importada' : 'Mejorar paleta levemente',
        strategy: variant === 'faithful' ? 'imported-faithful' : 'imported-polished',
        mode,
        colors: repaired.colors,
        score,
        scores,
        warnings: [...new Set(warnings)],
        sourceColors: base.sourceColors,
    };

    return {
        id,
        label: system.name,
        labelEs: system.nameEs,
        description: variant === 'faithful'
            ? 'Uses the website colors as closely as possible, only repairing required readability issues.'
            : 'Keeps the imported color identity while slightly improving contrast, CTA strength and surfaces.',
        descriptionEs: variant === 'faithful'
            ? 'Usa los colores del website lo más fiel posible y solo repara problemas necesarios de legibilidad.'
            : 'Mantiene la identidad importada mientras mejora levemente contraste, CTAs y superficies.',
        preview: [repaired.colors.background, repaired.colors.primary, repaired.colors.secondary, repaired.colors.accent, repaired.colors.heading],
        system,
    };
}

export function validateColorSystem(systemOrColors: WebsiteColorSystem | GlobalColors): ColorSystemValidationResult {
    const isSystem = isWebsiteColorSystem(systemOrColors);
    const colors = isSystem ? systemOrColors.colors : systemOrColors;
    const issues: ColorSystemValidationIssue[] = [];

    if (contrastRatio(colors.text, colors.background) < 4.5) {
        issues.push({ severity: 'error', path: 'text/background', message: 'Body text contrast is below WCAG AA.' });
    }
    if (contrastRatio(colors.heading, colors.background) < 4.5) {
        issues.push({ severity: 'error', path: 'heading/background', message: 'Heading contrast is below WCAG AA.' });
    }
    if (contrastRatio(colors.text, colors.surface) < 4.5) {
        issues.push({ severity: 'error', path: 'text/surface', message: 'Body text contrast on cards/surfaces is below WCAG AA.' });
    }
    if (contrastRatio(colors.heading, colors.surface) < 4.5) {
        issues.push({ severity: 'error', path: 'heading/surface', message: 'Heading contrast on cards/surfaces is below WCAG AA.' });
    }
    if (Math.max(contrastRatio(colors.primary, '#ffffff'), contrastRatio(colors.primary, '#111827')) < 3) {
        issues.push({ severity: 'error', path: 'primary/buttonText', message: 'Primary color cannot support a readable button label.' });
    }
    if (Math.abs(getLuminance(colors.surface) - getLuminance(colors.background)) < 0.025) {
        issues.push({ severity: 'warning', path: 'surface/background', message: 'Surface is too close to the page background.' });
    }
    const hueSpread = [
        hexToHsl(colors.primary).h,
        hexToHsl(colors.secondary).h,
        hexToHsl(colors.accent).h,
    ];
    const maxSpread = Math.max(...hueSpread) - Math.min(...hueSpread);
    const allowsMonochrome = (isSystem && (
        systemOrColors.strategy.includes('mono') ||
        systemOrColors.strategy.includes('monochrome')
    )) || isMonochromePalette(colors);
    if (maxSpread < 18 && !allowsMonochrome) {
        issues.push({ severity: 'warning', path: 'primary/secondary/accent', message: 'Palette is too monochromatic for a full website system.' });
    }

    const proportionScore = score603010Compliance(colors, { allowMonochrome: allowsMonochrome });
    if (proportionScore < 62) {
        issues.push({
            severity: 'warning',
            path: '60-30-10',
            message: 'Palette does not follow the 60-30-10 proportion rule closely enough (dominant neutrals, brand layer, accent pop).',
        });
    }
    if (!isNeutralColor(colors.background)) {
        issues.push({
            severity: 'warning',
            path: 'background/60-30-10',
            message: 'Background should stay neutral as the 60% dominant layer.',
        });
    }
    if (hexToHsl(colors.accent).s < hexToHsl(colors.primary).s + COLOR_PROPORTION_RULE_603010.targets.accentMinSaturationBoost - 2) {
        issues.push({
            severity: 'warning',
            path: 'accent/60-30-10',
            message: 'Accent should be the most vivid color in the 10% pop layer.',
        });
    }

    const score = isSystem ? systemOrColors.score : roundScore(100 - issues.length * 18 + proportionScore * 0.08);
    return {
        valid: !issues.some(issue => issue.severity === 'error'),
        score: roundScore(score),
        issues,
    };
}

export function repairColorSystem(colors: Partial<GlobalColors>): { colors: GlobalColors; warnings: string[] } {
    const defaults = getDefaultGlobalColors();
    const repaired: GlobalColors = {
        ...defaults,
        ...Object.fromEntries(
            Object.entries(colors)
                .map(([key, value]) => {
                    const normalized = typeof value === 'string' ? normalizeHexColor(value) : null;
                    return normalized ? [key, normalized] : null;
                })
                .filter((entry): entry is [string, string] => Boolean(entry))
        ),
    } as GlobalColors;
    const warnings: string[] = [];

    const bgIsDark = getLuminance(repaired.background) < 0.35;
    const readableText = bgIsDark ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT;
    const readableHeading = bgIsDark ? '#f6f7fb' : '#151821';

    if (contrastRatio(repaired.text, repaired.background) < 4.5) {
        repaired.text = readableText;
        warnings.push('Adjusted text color for background contrast.');
    }
    if (contrastRatio(repaired.heading, repaired.background) < 4.5) {
        repaired.heading = readableHeading;
        warnings.push('Adjusted heading color for background contrast.');
    }
    if (contrastRatio(repaired.textMuted, repaired.background) < 3) {
        repaired.textMuted = bgIsDark ? mix(repaired.text, repaired.background, 0.36) : mix(repaired.text, repaired.background, 0.42);
    }
    if (Math.max(contrastRatio(repaired.primary, '#ffffff'), contrastRatio(repaired.primary, '#111827')) < 3) {
        repaired.primary = ensureButtonReady(repaired.primary);
        warnings.push('Adjusted primary color so buttons can remain readable.');
    }
    if (
        contrastRatio(repaired.text, repaired.surface) < 4.5 ||
        contrastRatio(repaired.heading, repaired.surface) < 4.5
    ) {
        repaired.surface = bgIsDark
            ? mix(repaired.background, '#ffffff', 0.08)
            : mix(repaired.background, '#111827', 0.035);
        warnings.push('Adjusted surface color so cards and ecommerce sections stay readable.');
    }
    if (Math.abs(getLuminance(repaired.surface) - getLuminance(repaired.background)) < 0.025) {
        repaired.surface = bgIsDark ? mix(repaired.background, '#ffffff', 0.08) : mix(repaired.background, '#111827', 0.035);
        warnings.push('Adjusted surface color to separate cards from the page background.');
    }
    if (contrastRatio(repaired.accent, repaired.background) < 2) {
        const accentHsl = hexToHsl(repaired.accent);
        repaired.accent = hslToHex({ ...accentHsl, l: bgIsDark ? 68 : 42, s: clamp(accentHsl.s + 12, 45, 82) });
        warnings.push('Adjusted accent color for visibility.');
    }

    repaired.border = repaired.border || (bgIsDark ? mix(repaired.surface, '#ffffff', 0.12) : mix(repaired.background, '#111827', 0.12));
    repaired.success = repaired.success || (bgIsDark ? '#4ade80' : '#16a34a');
    repaired.error = repaired.error || (bgIsDark ? '#f87171' : '#dc2626');

    const proportionAdjusted = apply603010Rule(repaired);
    warnings.push(...proportionAdjusted.warnings);
    const finalColors = proportionAdjusted.colors;

    if (contrastRatio(finalColors.text, finalColors.background) < 4.5) {
        finalColors.text = readableText;
        warnings.push('Re-adjusted text color after applying the 60-30-10 rule.');
    }
    if (contrastRatio(finalColors.heading, finalColors.background) < 4.5) {
        finalColors.heading = readableHeading;
        warnings.push('Re-adjusted heading color after applying the 60-30-10 rule.');
    }
    if (Math.max(contrastRatio(finalColors.primary, '#ffffff'), contrastRatio(finalColors.primary, '#111827')) < 3) {
        finalColors.primary = ensureButtonReady(finalColors.primary);
        warnings.push('Re-adjusted primary color after applying the 60-30-10 rule.');
    }
    if (Math.max(contrastRatio(finalColors.accent, '#ffffff'), contrastRatio(finalColors.accent, '#111827')) < 3) {
        finalColors.accent = ensureButtonReady(finalColors.accent);
        warnings.push('Re-adjusted accent color after applying the 60-30-10 rule.');
    }

    return { colors: finalColors, warnings: [...new Set(warnings)] };
}

export function generateColorCandidates(brief: ColorBrief): ColorCandidate[] {
    const normalizedBrief: ColorBrief = {
        ...brief,
        importedColors: normalizeSignals(brief.importedColors),
        logoColors: normalizeSignals(brief.logoColors),
        imageColors: normalizeSignals(brief.imageColors),
    };
    const allSignals = [
        ...(normalizedBrief.lockedColors?.primary ? [{ color: normalizedBrief.lockedColors.primary, source: 'user' as const, weight: 120, roleGuess: 'primary' as const }] : []),
        ...(normalizedBrief.logoColors || []),
        ...(normalizedBrief.importedColors || []),
        ...(normalizedBrief.imageColors || []),
    ];
    const fallback = industryFallbackColor(normalizedBrief.industry);
    const seed = pickWeightedSeed(allSignals, fallback);
    const sourceColors = [...new Set(allSignals.map(signal => normalizeHexColor(signal.color)).filter(Boolean) as string[])].slice(0, 8);

    return getStrategies(normalizedBrief, seed).map((strategy, index) => {
        const colors = buildSystemFromStrategy(normalizedBrief, strategy, seed);
        const repaired = repairColorSystem(colors);
        const scores = scoreSystem(repaired.colors, normalizedBrief, seed, strategy);
        const validation = validateColorSystem(repaired.colors);
        const score = validation.valid ? totalScore(scores) : Math.min(totalScore(scores), 58);
        const warnings = [
            ...repaired.warnings,
            ...validation.issues.filter(issue => issue.severity === 'warning').map(issue => issue.message),
        ];
        const system: WebsiteColorSystem = {
            id: `${strategy.id}-${index + 1}`,
            name: strategy.label,
            nameEs: strategy.labelEs,
            strategy: strategy.id,
            mode: strategy.mode,
            colors: repaired.colors,
            score,
            scores,
            warnings: [...new Set(warnings)],
            sourceColors,
        };
        return {
            id: system.id,
            label: strategy.label,
            labelEs: strategy.labelEs,
            description: strategy.description,
            descriptionEs: strategy.descriptionEs,
            preview: [repaired.colors.background, repaired.colors.primary, repaired.colors.secondary, repaired.colors.accent, repaired.colors.heading],
            system,
        };
    }).sort((a, b) => b.system.score - a.system.score);
}

export function createImportedPaletteCandidates(brief: ColorBrief): ColorCandidate[] {
    return [
        buildImportedPaletteCandidate(brief, 'faithful'),
        buildImportedPaletteCandidate(brief, 'polished'),
    ].filter((candidate): candidate is ColorCandidate => Boolean(candidate));
}

export function selectBestColorSystem(candidates: ColorCandidate[]): WebsiteColorSystem {
    const viable = candidates.filter(candidate => validateColorSystem(candidate.system).valid);
    return (viable[0] || candidates[0])?.system || {
        id: 'default',
        name: 'Default',
        nameEs: 'Predeterminada',
        strategy: 'default',
        mode: 'dark',
        colors: getDefaultGlobalColors(),
        score: 70,
        scores: { contrast: 70, harmony: 70, brandFit: 70, componentReadiness: 70, proportionBalance: 70 },
        warnings: ['Using default colors because no candidates were available.'],
        sourceColors: [],
    };
}

export function toGlobalColors(systemOrCandidate: WebsiteColorSystem | ColorCandidate | GlobalColors): GlobalColors {
    if (isColorCandidate(systemOrCandidate)) return systemOrCandidate.system.colors;
    if (isWebsiteColorSystem(systemOrCandidate)) return systemOrCandidate.colors;
    return systemOrCandidate;
}

export function buildWebsiteColorSystemFromBrief(brief: ColorBrief): WebsiteColorSystem {
    const candidates = generateColorCandidates(brief);
    return selectBestColorSystem(candidates);
}
