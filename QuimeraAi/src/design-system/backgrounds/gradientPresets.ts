import type { CSSProperties } from 'react';

export type GradientPresetId = 'softAurora' | 'radialGlow' | 'linearPremium' | 'meshSoft';

export interface GradientPresetConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  intensity: number;
  focusX: number;
  focusY: number;
  opacity: number;
  blur: number;
  enabled: boolean;
}

export interface GradientPreset {
  id: GradientPresetId;
  name: string;
  description: string;
  defaultConfig: GradientPresetConfig;
}

export const gradientPresets: GradientPreset[] = [
  {
    id: 'softAurora',
    name: 'Soft Aurora',
    description: 'Diffuse multi-stop gradient for hero sections and landing page bands.',
    defaultConfig: {
      primaryColor: '#FBB92B',
      secondaryColor: '#F8F7F2',
      accentColor: '#8A7656',
      intensity: 42,
      focusX: 20,
      focusY: 18,
      opacity: 80,
      blur: 24,
      enabled: true,
    },
  },
  {
    id: 'radialGlow',
    name: 'Radial Glow',
    description: 'Single radial focus point for product promos and callouts.',
    defaultConfig: {
      primaryColor: '#FBB92B',
      secondaryColor: '#FFFFFF',
      accentColor: '#FBB92B',
      intensity: 52,
      focusX: 50,
      focusY: 28,
      opacity: 70,
      blur: 18,
      enabled: true,
    },
  },
  {
    id: 'linearPremium',
    name: 'Linear Premium',
    description: 'Controlled linear gradient for banners and high-contrast section headers.',
    defaultConfig: {
      primaryColor: '#211D19',
      secondaryColor: '#FBB92B',
      accentColor: '#FFFFFF',
      intensity: 36,
      focusX: 45,
      focusY: 45,
      opacity: 88,
      blur: 0,
      enabled: true,
    },
  },
  {
    id: 'meshSoft',
    name: 'Mesh Soft',
    description: 'Layered soft blobs for AI-generated hero and promo backgrounds.',
    defaultConfig: {
      primaryColor: '#FBB92B',
      secondaryColor: '#8A7656',
      accentColor: '#F8F7F2',
      intensity: 38,
      focusX: 38,
      focusY: 36,
      opacity: 78,
      blur: 32,
      enabled: true,
    },
  },
];

export const gradientPresetMap = Object.fromEntries(
  gradientPresets.map((preset) => [preset.id, preset]),
) as Record<GradientPresetId, GradientPreset>;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return '251, 185, 43';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

const rgba = (hex: string, alpha: number) => `rgba(${hexToRgb(hex)}, ${clamp(alpha, 0, 1)})`;

export function getGradientPreset(id: GradientPresetId): GradientPreset {
  return gradientPresetMap[id];
}

export function createGradientBackground(id: GradientPresetId, config: Partial<GradientPresetConfig> = {}): CSSProperties {
  const preset = getGradientPreset(id);
  const next = { ...preset.defaultConfig, ...config };

  if (!next.enabled) {
    return {};
  }

  const intensity = clamp(next.intensity) / 100;
  const opacity = clamp(next.opacity) / 100;
  const focusX = clamp(next.focusX);
  const focusY = clamp(next.focusY);
  const blur = Math.max(0, next.blur);

  const primary = rgba(next.primaryColor, Math.min(0.9, opacity * intensity));
  const secondary = rgba(next.secondaryColor, Math.min(0.72, opacity * (intensity * 0.72)));
  const accent = rgba(next.accentColor, Math.min(0.56, opacity * (intensity * 0.62)));

  const backgrounds: Record<GradientPresetId, string> = {
    softAurora: [
      `radial-gradient(circle at ${focusX}% ${focusY}%, ${primary}, transparent ${22 + intensity * 18}rem)`,
      `radial-gradient(circle at ${100 - focusX}% ${Math.max(8, focusY - 10)}%, ${accent}, transparent ${18 + intensity * 18}rem)`,
      `linear-gradient(135deg, ${secondary}, transparent 70%)`,
    ].join(', '),
    radialGlow: [
      `radial-gradient(circle at ${focusX}% ${focusY}%, ${primary}, transparent ${18 + intensity * 22}rem)`,
      `linear-gradient(180deg, ${secondary}, transparent 72%)`,
    ].join(', '),
    linearPremium: `linear-gradient(${Math.round(focusX * 3.6)}deg, ${rgba(next.primaryColor, opacity)} 0%, ${secondary} ${42 + intensity * 16}%, ${accent} 100%)`,
    meshSoft: [
      `radial-gradient(circle at ${focusX}% ${focusY}%, ${primary}, transparent ${16 + intensity * 18}rem)`,
      `radial-gradient(circle at ${Math.max(8, focusX - 28)}% ${Math.min(92, focusY + 24)}%, ${secondary}, transparent ${15 + intensity * 16}rem)`,
      `radial-gradient(circle at ${Math.min(92, focusX + 32)}% ${Math.max(8, focusY - 14)}%, ${accent}, transparent ${15 + intensity * 16}rem)`,
    ].join(', '),
  };

  return {
    backgroundImage: backgrounds[id],
    filter: blur > 0 ? `saturate(${1 + intensity * 0.3})` : undefined,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
  };
}
