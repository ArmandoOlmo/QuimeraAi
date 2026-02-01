/**
 * Template Matching Service
 * 
 * Provides intelligent template selection based on industry, aesthetic, and color preferences.
 * Designed to be scalable - automatically adapts when new templates are added.
 * 
 * NOTE: Templates are now loaded dynamically from Firestore (Super Admin) - NOT hardcoded.
 * All functions receive templates as a parameter.
 */

import { INDUSTRY_CATEGORIES } from '../data/industries';
import { Project } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateMatchResult {
  templateId: string;
  score: number;
  confidence: number;
  matchReasons: string[];
}

export interface ColorAdjustments {
  needed: boolean;
  newPrimary?: string;
  newSecondary?: string;
  reason?: string;
}

export interface TemplateSelectionResult {
  selectedTemplateId: string | null;
  confidence: number;
  matchAnalysis: {
    industryMatch: 'exact' | 'related' | 'none';
    toneMatch: 'exact' | 'similar' | 'none';
    colorCompatibility: 'high' | 'medium' | 'low';
  };
  reasoning: string;
  colorAdjustments: ColorAdjustments;
  alternativeTemplateId?: string;
  suggestNewTemplate?: boolean;
}

export interface TemplateCoverageStats {
  coveredIndustries: string[];
  uncoveredIndustries: string[];
  templatesByCategory: Record<string, number>;
  totalTemplates: number;
}

// ============================================================================
// COLOR ANALYSIS
// ============================================================================

type ColorMood = 'warm' | 'cool' | 'dark' | 'light' | 'vibrant' | 'muted' | 'neutral';

interface ColorProfile {
  mood: ColorMood;
  dominantHues: string[];
  isDark: boolean;
}

/**
 * Analyze a hex color to determine its characteristics
 */
const analyzeColor = (hex: string): { hue: string; luminance: number; saturation: number } => {
  const cleanHex = (hex || '#000000').replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = (max + min) / 2;
  
  let saturation = 0;
  if (max !== min) {
    saturation = luminance > 0.5 
      ? (max - min) / (2 - max - min)
      : (max - min) / (max + min);
  }

  // Determine hue category
  let hue = 'neutral';
  if (saturation > 0.1) {
    if (r >= g && r >= b) {
      hue = g > b ? 'orange' : 'red';
      if (r > 0.8 && g > 0.6 && b < 0.4) hue = 'gold';
    } else if (g >= r && g >= b) {
      hue = r > b ? 'yellow' : 'green';
    } else {
      hue = r > g ? 'purple' : 'blue';
      if (b > 0.6 && g > 0.5) hue = 'cyan';
    }
  } else {
    if (luminance > 0.8) hue = 'white';
    else if (luminance < 0.2) hue = 'black';
    else hue = 'gray';
  }

  return { hue, luminance, saturation };
};

/**
 * Analyze a template's color profile
 */
const analyzeTemplateColors = (globalColors: any): ColorProfile => {
  if (!globalColors) {
    return { mood: 'neutral', dominantHues: [], isDark: true };
  }
  
  const primary = analyzeColor(globalColors.primary || '#000000');
  const background = analyzeColor(globalColors.background || '#ffffff');
  const accent = analyzeColor(globalColors.accent || globalColors.primary || '#000000');

  const dominantHues = [primary.hue, accent.hue].filter(h => h !== 'neutral' && h !== 'white' && h !== 'black');
  const isDark = background.luminance < 0.5;

  // Determine mood
  let mood: ColorMood = 'neutral';
  
  if (isDark) {
    mood = primary.saturation > 0.5 ? 'vibrant' : 'dark';
  } else {
    if (primary.saturation < 0.3) {
      mood = 'muted';
    } else if (['red', 'orange', 'gold', 'yellow'].includes(primary.hue)) {
      mood = 'warm';
    } else if (['blue', 'cyan', 'green'].includes(primary.hue)) {
      mood = 'cool';
    } else {
      mood = 'vibrant';
    }
  }

  return { mood, dominantHues, isDark };
};

/**
 * Map color vibe descriptions to moods
 */
const vibeToMoods: Record<string, ColorMood[]> = {
  'warm': ['warm', 'vibrant'],
  'cool': ['cool', 'muted'],
  'dark': ['dark', 'vibrant'],
  'light': ['light', 'muted'],
  'energetic': ['vibrant', 'warm'],
  'professional': ['muted', 'cool', 'dark'],
  'trustworthy': ['cool', 'muted'],
  'luxurious': ['dark', 'warm'],
  'elegant': ['muted', 'dark', 'warm'],
  'bold': ['vibrant', 'dark'],
  'playful': ['vibrant', 'warm'],
  'organic': ['warm', 'muted'],
  'tech': ['dark', 'cool', 'vibrant'],
  'modern': ['cool', 'muted', 'dark'],
  'fresh': ['cool', 'light'],
  'earthy': ['warm', 'muted'],
  'gold': ['warm'],
  'blue': ['cool'],
  'green': ['cool', 'muted'],
  'red': ['warm', 'vibrant'],
  'navy': ['dark', 'cool'],
  'cream': ['warm', 'light', 'muted'],
};

/**
 * Extract matching moods from a color vibe string
 */
const extractMoodsFromVibe = (colorVibe: string): ColorMood[] => {
  const vibeLower = colorVibe.toLowerCase();
  const matchedMoods = new Set<ColorMood>();

  Object.entries(vibeToMoods).forEach(([keyword, moods]) => {
    if (vibeLower.includes(keyword)) {
      moods.forEach(m => matchedMoods.add(m));
    }
  });

  return Array.from(matchedMoods);
};

// ============================================================================
// AESTHETIC MAPPING
// ============================================================================

type AestheticType = 'Minimalist' | 'Bold' | 'Elegant' | 'Playful' | 'Tech' | 'Organic';

const aestheticToTones: Record<AestheticType, string[]> = {
  'Minimalist': ['professional', 'minimal', 'clean', 'modern'],
  'Bold': ['urgent', 'bold', 'dynamic', 'energetic'],
  'Elegant': ['luxury', 'elegant', 'sophisticated', 'premium'],
  'Playful': ['friendly', 'playful', 'fun', 'casual'],
  'Tech': ['professional', 'modern', 'innovative', 'tech'],
  'Organic': ['natural', 'organic', 'eco', 'authentic'],
};

const toneToAesthetics: Record<string, AestheticType[]> = {
  'luxury': ['Elegant'],
  'professional': ['Minimalist', 'Tech'],
  'urgent': ['Bold'],
  'friendly': ['Playful'],
  'modern': ['Tech', 'Minimalist'],
  'elegant': ['Elegant'],
  'bold': ['Bold'],
  'playful': ['Playful'],
  'natural': ['Organic'],
  'organic': ['Organic'],
  'minimal': ['Minimalist'],
  'dynamic': ['Bold'],
  'sophisticated': ['Elegant'],
  'innovative': ['Tech'],
  'clean': ['Minimalist'],
  'premium': ['Elegant'],
  'fun': ['Playful'],
  'casual': ['Playful'],
  'eco': ['Organic'],
  'authentic': ['Organic'],
  'tech': ['Tech'],
  'energetic': ['Bold'],
};

// ============================================================================
// HELPER FUNCTIONS FOR SAFE PROPERTY ACCESS
// ============================================================================

const getTemplateIndustry = (template: Project): string => {
  return template.brandIdentity?.industry || template.category || 'General';
};

const getTemplateTone = (template: Project): string => {
  return template.brandIdentity?.toneOfVoice || 'Professional';
};

const getTemplateTags = (template: Project): string[] => {
  return template.tags || [];
};

const getTemplateCategory = (template: Project): string => {
  return template.category || 'General';
};

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class TemplateMatchingService {
  
  /**
   * Generate context string for LLM with all template information
   * Automatically includes all templates - no manual updates needed
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static generateTemplateContextForLLM(templates: Project[]): string {
    if (!templates || templates.length === 0) {
      return 'No hay templates disponibles.';
    }
    
    return templates.map(t => {
      const globalColors = (t.theme?.globalColors || {}) as Partial<{ primary: string; secondary: string; background: string; accent: string; text: string }>;
      const colorProfile = analyzeTemplateColors(globalColors);
      const industry = getTemplateIndustry(t);
      const tone = getTemplateTone(t);
      const tags = getTemplateTags(t);
      const category = getTemplateCategory(t);
      
      return `
## TEMPLATE: ${t.id}
**Nombre:** ${t.name}
**Categoría:** ${category}
**Tags:** ${tags.join(', ') || 'Sin tags'}
**Descripción:** ${t.description || 'Sin descripción'}

**Brand Identity:**
- Industria: ${industry}
- Tono: ${tone}
- Audiencia: ${t.brandIdentity?.targetAudience || 'General'}
- Valores: ${t.brandIdentity?.coreValues || 'No especificado'}

**Paleta de Colores:**
- Primary (Brand): ${globalColors.primary || '#6366f1'}
- Secondary: ${globalColors.secondary || '#8b5cf6'}
- Background: ${globalColors.background || '#0d0514'}
- Accent: ${globalColors.accent || '#f59e0b'}
- Text: ${globalColors.text || '#ffffff'}
- Color Mood: ${colorProfile.mood}
- Es tema oscuro: ${colorProfile.isDark ? 'Sí' : 'No'}
- Tonos dominantes: ${colorProfile.dominantHues.join(', ') || 'neutros'}

**Tipografía:**
- Headers: ${t.theme?.fontFamilyHeader || 'inter'}
- Body: ${t.theme?.fontFamilyBody || 'inter'}

**Estilo UI:**
- Cards: ${t.theme?.cardBorderRadius || 'md'}
- Buttons: ${t.theme?.buttonBorderRadius || 'md'}

**Secciones:** ${(t.componentOrder || []).filter(c => !['colors', 'typography'].includes(c)).join(', ') || 'hero, footer'}
`;
    }).join('\n---\n');
  }

  /**
   * Pre-filter templates based on industry and aesthetic
   * Returns top candidates for LLM to choose from
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static preFilterTemplates(
    templates: Project[],
    industry: string,
    aesthetic: string,
    colorVibe?: string
  ): TemplateMatchResult[] {
    if (!templates || templates.length === 0) {
      return [];
    }
    
    // Find the category for the given industry
    const industryCategory = Object.entries(INDUSTRY_CATEGORIES)
      .find(([_, industries]) => industries.includes(industry))?.[0];

    const results: TemplateMatchResult[] = templates.map(template => {
      let score = 0;
      const matchReasons: string[] = [];

      // --- Industry Matching (50 points max) ---
      const templateIndustry = getTemplateIndustry(template).toLowerCase();
      const templateCategory = getTemplateCategory(template).toLowerCase();
      const searchIndustry = industry.toLowerCase();
      const templateTags = getTemplateTags(template);
      
      // Exact industry match
      if (templateIndustry.includes(searchIndustry) || searchIndustry.includes(templateIndustry)) {
        score += 50;
        matchReasons.push('industria_exacta');
      }
      // Category match
      else if (industryCategory && templateCategory.includes(industryCategory.toLowerCase())) {
        score += 30;
        matchReasons.push('categoria_industria');
      }
      // Tag match
      else if (templateTags.some(tag => tag.toLowerCase().includes(searchIndustry))) {
        score += 25;
        matchReasons.push('tag_relacionado');
      }

      // --- Aesthetic/Tone Matching (30 points max) ---
      const templateTone = getTemplateTone(template).toLowerCase();
      
      // Direct aesthetic match
      const matchingTones = aestheticToTones[aesthetic as AestheticType] || [];
      if (matchingTones.some(tone => templateTone.includes(tone))) {
        score += 30;
        matchReasons.push('estetica_exacta');
      }
      // Reverse match (tone matches aesthetic)
      else if (toneToAesthetics[templateTone]?.includes(aesthetic as AestheticType)) {
        score += 25;
        matchReasons.push('tono_compatible');
      }

      // --- Color Matching (20 points max) ---
      if (colorVibe && template.theme?.globalColors) {
        const templateColorProfile = analyzeTemplateColors(template.theme.globalColors);
        const vibeMoods = extractMoodsFromVibe(colorVibe);
        
        if (vibeMoods.includes(templateColorProfile.mood)) {
          score += 20;
          matchReasons.push('color_compatible');
        } else if (vibeMoods.length > 0) {
          // Partial color match
          score += 10;
          matchReasons.push('color_parcial');
        }
      }

      // --- Featured bonus (5 points) ---
      if (template.isFeatured) {
        score += 5;
      }

      return {
        templateId: template.id,
        score,
        confidence: Math.min(score / 100, 1),
        matchReasons,
      };
    });

    // Sort by score descending and return top candidates
    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Find the best template match (quick, without LLM)
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static findBestMatch(
    templates: Project[],
    industry: string,
    aesthetic: string,
    colorVibe?: string
  ): TemplateMatchResult | null {
    const matches = this.preFilterTemplates(templates, industry, aesthetic, colorVibe);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Get template by ID
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static getTemplateById(templates: Project[], templateId: string): Project | undefined {
    return templates.find(t => t.id === templateId);
  }

  /**
   * Get coverage statistics - useful for admin dashboard
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static getCoverageStats(templates: Project[]): TemplateCoverageStats {
    if (!templates || templates.length === 0) {
      return {
        coveredIndustries: [],
        uncoveredIndustries: Object.values(INDUSTRY_CATEGORIES).flat(),
        templatesByCategory: {},
        totalTemplates: 0,
      };
    }
    
    const allIndustries = Object.values(INDUSTRY_CATEGORIES).flat();
    const coveredIndustries = new Set<string>();
    const templatesByCategory: Record<string, number> = {};

    templates.forEach(template => {
      // Check which industries this template covers
      const templateIndustry = getTemplateIndustry(template).toLowerCase();
      const templateTags = getTemplateTags(template).map(t => t.toLowerCase());
      
      allIndustries.forEach(industry => {
        if (
          templateIndustry.includes(industry) ||
          industry.includes(templateIndustry.split(' ')[0]) ||
          templateTags.some(tag => tag.includes(industry) || industry.includes(tag))
        ) {
          coveredIndustries.add(industry);
        }
      });

      // Count by category
      const category = getTemplateCategory(template);
      templatesByCategory[category] = (templatesByCategory[category] || 0) + 1;
    });

    return {
      coveredIndustries: Array.from(coveredIndustries),
      uncoveredIndustries: allIndustries.filter(i => !coveredIndustries.has(i)),
      templatesByCategory,
      totalTemplates: templates.length,
    };
  }

  /**
   * Suggest color adjustments when template colors don't match user's vibe
   * 
   * @param templates - Templates from Firestore (Super Admin)
   */
  static suggestColorAdjustments(
    templates: Project[],
    templateId: string,
    colorVibe: string
  ): ColorAdjustments {
    const template = this.getTemplateById(templates, templateId);
    if (!template || !template.theme?.globalColors) {
      return { needed: false };
    }

    const templateProfile = analyzeTemplateColors(template.theme.globalColors);
    const vibeMoods = extractMoodsFromVibe(colorVibe);

    // If moods match, no adjustment needed
    if (vibeMoods.includes(templateProfile.mood)) {
      return { needed: false };
    }

    // Suggest adjustments based on vibe
    const vibeLower = colorVibe.toLowerCase();
    let suggestedPrimary: string | undefined;
    let reason = '';

    // Color suggestions based on common vibes
    if (vibeLower.includes('blue') || vibeLower.includes('trustworthy') || vibeLower.includes('professional')) {
      suggestedPrimary = '#3b82f6'; // Blue 500
      reason = 'Azul para transmitir confianza y profesionalismo';
    } else if (vibeLower.includes('green') || vibeLower.includes('organic') || vibeLower.includes('fresh')) {
      suggestedPrimary = '#22c55e'; // Green 500
      reason = 'Verde para transmitir frescura y naturalidad';
    } else if (vibeLower.includes('gold') || vibeLower.includes('luxury') || vibeLower.includes('elegant')) {
      suggestedPrimary = '#d4a373'; // Warm gold
      reason = 'Dorado para transmitir elegancia y lujo';
    } else if (vibeLower.includes('red') || vibeLower.includes('bold') || vibeLower.includes('energetic')) {
      suggestedPrimary = '#ef4444'; // Red 500
      reason = 'Rojo para transmitir energía y audacia';
    } else if (vibeLower.includes('purple') || vibeLower.includes('creative')) {
      suggestedPrimary = '#a855f7'; // Purple 500
      reason = 'Púrpura para transmitir creatividad';
    } else if (vibeLower.includes('orange') || vibeLower.includes('warm') || vibeLower.includes('friendly')) {
      suggestedPrimary = '#f97316'; // Orange 500
      reason = 'Naranja para transmitir calidez y amigabilidad';
    } else if (vibeLower.includes('cyan') || vibeLower.includes('tech') || vibeLower.includes('modern')) {
      suggestedPrimary = '#06b6d4'; // Cyan 500
      reason = 'Cian para un look moderno y tecnológico';
    }

    if (suggestedPrimary) {
      return {
        needed: true,
        newPrimary: suggestedPrimary,
        reason,
      };
    }

    return { needed: false };
  }

  /**
   * Log template gap for analytics (when no good match found)
   */
  static logTemplateGap(data: {
    industry: string;
    aesthetic: string;
    colorVibe: string;
    bestMatchId: string | null;
    bestMatchConfidence: number;
  }): void {
    // In production, log to Firestore or analytics service
    // Template gap logging disabled for production - enable for debugging
    if (import.meta.env.DEV) {
      console.log('📊 [TemplateMatchingService] Template gap detected:', {
        ...data,
        timestamp: new Date().toISOString(),
        suggestedNewTemplate: {
          industry: data.industry,
          aesthetic: data.aesthetic,
          colorVibe: data.colorVibe,
        },
      });
    }
  }
}

export default TemplateMatchingService;
