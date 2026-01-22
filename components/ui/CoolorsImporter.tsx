/**
 * CoolorsImporter - Importa paletas de colores desde Coolors.co
 * Usa AI para mapear los colores a las propiedades del tema
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { GlobalColors } from '../../types';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { Link2, Wand2, Loader2, AlertCircle, Check, Palette, Sparkles, Zap } from 'lucide-react';

interface CoolorsImporterProps {
    /** Callback cuando se genera/aplica una paleta. 
     * @param colors - Colores globales mapeados para el diseño
     * @param allColors - Todos los colores originales de la paleta (para acceso rápido en el selector)
     * @param paletteName - Nombre creativo de la paleta (opcional, generado por AI)
     */
    onPaletteGenerated: (colors: GlobalColors, allColors: string[], paletteName?: string) => Promise<void>;
    /** Optional project ID to use for AI calls (useful when no active project in context) */
    projectId?: string;
    /** Whether to generate palette name with AI (used for templates) */
    generatePaletteName?: boolean;
}

/**
 * Parsea una URL de Coolors.co y extrae los colores HEX
 * Formatos soportados:
 * - https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51
 * - https://coolors.co/palette/264653-2a9d8f-e9c46a-f4a261-e76f51
 * - 264653-2a9d8f-e9c46a-f4a261-e76f51 (solo los colores)
 */
const parseCoolorsUrl = (input: string): string[] | null => {
    // Limpiar el input
    const cleaned = input.trim().toLowerCase();

    // Regex para extraer colores HEX (grupos de 6 caracteres hex separados por -)
    const colorPattern = /([a-f0-9]{6}(?:-[a-f0-9]{6})*)/;
    const match = cleaned.match(colorPattern);

    if (!match) return null;

    const colorsString = match[1];
    const colors = colorsString.split('-').map(c => `#${c.toUpperCase()}`);

    // Validar que tengamos al menos 3 colores y máximo 10
    if (colors?.length < 3 || colors?.length > 10) return null;

    return colors;
};

/**
 * Genera el prompt para que AI mapee los colores
 */
const generateAIPrompt = (colors: string[]): string => {
    return `You are an expert UI/UX designer. I have a color palette from Coolors.co with ${colors?.length} colors:
${colors?.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Your task is to intelligently map these colors to a complete design system with the following properties:
- primary: Main brand color (buttons, links, primary actions)
- secondary: Complementary color for secondary elements
- accent: Highlight color for special emphasis
- background: Main page background color
- surface: Cards and elevated surfaces background
- text: Main body text color (must contrast well with background)
- textMuted: Secondary/muted text color
- heading: Headings and titles color (must contrast well with background)
- border: Border and divider color
- success: Success state color (green tones work best)
- error: Error state color (red tones work best)

IMPORTANT RULES:
1. Analyze the brightness of the palette - if most colors are dark, create a dark theme. If light, create a light theme.
2. For dark themes: background should be the darkest color, text and heading should be light (#ffffff or similar)
3. For light themes: background should be the lightest color, text and heading should be dark (#1a1a1a or similar)
4. Primary should be the most vibrant/distinctive color
5. Text colors MUST have high contrast with background for readability
6. If the palette doesn't have a green, derive success from the closest color or use #22c55e
7. If the palette doesn't have a red, derive error from the closest color or use #ef4444
8. Surface should be slightly different from background for depth
9. Border should be subtle - between background and surface

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "primary": "#hexcolor",
  "secondary": "#hexcolor",
  "accent": "#hexcolor",
  "background": "#hexcolor",
  "surface": "#hexcolor",
  "text": "#hexcolor",
  "textMuted": "#hexcolor",
  "heading": "#hexcolor",
  "border": "#hexcolor",
  "success": "#hexcolor",
  "error": "#hexcolor",
  "isDarkTheme": true/false,
  "paletteName": "A creative 2-3 word name for this palette in English (e.g., 'Sunset Glow', 'Mystic Forest', 'Deep Ocean')"
}`;
};

/**
 * Prompt específico para generar solo el nombre de la paleta (en inglés)
 */
const generatePaletteNamePrompt = (colors: string[]): string => {
    return `You are an expert in design and color psychology. Analyze this color palette and generate ONE CREATIVE NAME in English.

Palette colors:
${colors?.map((c, i) => `${i + 1}. ${c}`).join('\n')}

The name should:
- Be evocative and memorable (2-4 words)
- Reflect the feeling or mood the colors convey
- Start with a descriptive noun or adjective

Examples of good names:
- "Sunset Boulevard" (for warm oranges and blues)
- "Enchanted Forest" (for greens and browns)
- "Electric Night" (for dark colors with neon)
- "Lavender Dreams" (for soft purples and pinks)
- "Tropical Ocean" (for vibrant blues and turquoises)
- "Golden Desert" (for beiges and ochres)
- "Northern Lights" (for vibrant contrasting colors)
- "Mocha Cream" (for brown and cream tones)
- "Midnight Jazz" (for deep blues and purples)
- "Spring Meadow" (for fresh greens and yellows)
- "Coral Reef" (for pinks, oranges and teals)
- "Urban Steel" (for grays and metallic tones)

Respond ONLY with the name, no explanations or quotes. Just the words of the name.`;
};

const CoolorsImporter: React.FC<CoolorsImporterProps> = ({
    onPaletteGenerated,
    projectId: propProjectId,
    generatePaletteName = false
}) => {
    const { t } = useTranslation();
    const { activeProject } = useProject();

    // Use provided projectId, or fall back to active project, or use a default for AI calls
    const effectiveProjectId = propProjectId || activeProject?.id || 'template-editor';

    const [inputUrl, setInputUrl] = useState('');
    const [parsedColors, setParsedColors] = useState<string[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Manejar cambio en el input y parsear automáticamente
    const handleInputChange = (value: string) => {
        setInputUrl(value);
        setError(null);
        setSuccess(false);

        if (value.trim()) {
            const colors = parseCoolorsUrl(value);
            setParsedColors(colors);
            if (!colors && value.length > 10) {
                setError('No se detectaron colores válidos. Asegúrate de pegar una URL de Coolors.co');
            }
        } else {
            setParsedColors(null);
        }
    };

    /**
     * Genera una paleta inteligente sin AI como fallback
     * Analiza los colores y los asigna según su luminosidad y saturación
     * USA LOS COLORES DE LA PALETA para textos en lugar de valores hardcodeados
     */
    const generateFallbackPalette = (colors: string[]): GlobalColors => {
        // Función para calcular luminosidad de un color hex
        const getLuminance = (hex: string): number => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return 0.299 * r + 0.587 * g + 0.114 * b;
        };

        // Función para calcular saturación
        const getSaturation = (hex: string): number => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            if (max === 0) return 0;
            return (max - min) / max;
        };

        // Función para calcular contraste entre dos colores
        const getContrast = (hex1: string, hex2: string): number => {
            const lum1 = getLuminance(hex1);
            const lum2 = getLuminance(hex2);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        };

        // Función para ajustar luminosidad de un color
        const adjustLuminance = (hex: string, factor: number): string => {
            const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * factor)));
            const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * factor)));
            const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * factor)));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        };

        // Ordenar colores por luminosidad
        const sortedByLuminance = [...colors].sort((a, b) => getLuminance(a) - getLuminance(b));

        // Ordenar por saturación para encontrar el más vibrante
        const sortedBySaturation = [...colors].sort((a, b) => getSaturation(b) - getSaturation(a));

        // Determinar si es tema oscuro o claro
        const avgLuminance = colors?.reduce((acc, c) => acc + getLuminance(c), 0) / colors?.length;
        const isDarkTheme = avgLuminance < 0.5;

        // Asignar colores base
        const darkest = sortedByLuminance[0];
        const lightest = sortedByLuminance[sortedByLuminance.length - 1];
        const primary = sortedBySaturation[0]; // Más vibrante
        const secondary = sortedBySaturation[1] || sortedBySaturation[0];
        const accent = sortedBySaturation[2] || sortedBySaturation[1] || primary;

        // Background y Surface
        const background = isDarkTheme ? darkest : lightest;
        const surface = sortedByLuminance[isDarkTheme ? 1 : sortedByLuminance.length - 2] ||
            (isDarkTheme ? adjustLuminance(darkest, 1.3) : adjustLuminance(lightest, 0.95));

        // ============================================
        // COLORES DE TEXTO - Derivados de la paleta
        // ============================================

        // Para dark theme: buscar colores claros de la paleta
        // Para light theme: buscar colores oscuros de la paleta
        let textColor: string;
        let headingColor: string;
        let textMutedColor: string;

        if (isDarkTheme) {
            // Tema oscuro: usar colores claros de la paleta para texto
            // Heading: el más claro con buen contraste
            const lightColors = sortedByLuminance.filter(c => getLuminance(c) > 0.6);
            if (lightColors.length > 0) {
                headingColor = lightColors[lightColors.length - 1]; // El más claro
                textColor = lightColors.length > 1 ? lightColors[lightColors.length - 2] : adjustLuminance(headingColor, 0.85);
            } else {
                // No hay colores suficientemente claros, aclarar el más claro disponible
                headingColor = adjustLuminance(lightest, 1.5);
                textColor = adjustLuminance(lightest, 1.3);
            }
            // TextMuted: versión más tenue del texto o color intermedio
            const midLightColors = sortedByLuminance.filter(c => getLuminance(c) > 0.4 && getLuminance(c) < 0.7);
            textMutedColor = midLightColors.length > 0 ? midLightColors[0] : adjustLuminance(textColor, 0.7);
        } else {
            // Tema claro: usar colores oscuros de la paleta para texto
            // Heading: el más oscuro con buen contraste
            const darkColors = sortedByLuminance.filter(c => getLuminance(c) < 0.4);
            if (darkColors.length > 0) {
                headingColor = darkColors[0]; // El más oscuro
                textColor = darkColors.length > 1 ? darkColors[1] : adjustLuminance(headingColor, 1.3);
            } else {
                // No hay colores suficientemente oscuros, oscurecer el más oscuro disponible
                headingColor = adjustLuminance(darkest, 0.5);
                textColor = adjustLuminance(darkest, 0.7);
            }
            // TextMuted: versión más tenue del texto o color intermedio
            const midDarkColors = sortedByLuminance.filter(c => getLuminance(c) > 0.3 && getLuminance(c) < 0.6);
            textMutedColor = midDarkColors.length > 0 ? midDarkColors[0] : adjustLuminance(textColor, 1.4);
        }

        // Verificar contraste mínimo y ajustar si es necesario
        if (getContrast(headingColor, background) < 4.5) {
            headingColor = isDarkTheme ? '#F8FAFC' : '#0F172A';
        }
        if (getContrast(textColor, background) < 4.5) {
            textColor = isDarkTheme ? '#E2E8F0' : '#1E293B';
        }
        if (getContrast(textMutedColor, background) < 3) {
            textMutedColor = isDarkTheme ? '#94A3B8' : '#64748B';
        }

        // Border: derivar del fondo
        const borderColor = isDarkTheme
            ? adjustLuminance(background, 1.8)
            : adjustLuminance(background, 0.85);

        return {
            primary,
            secondary,
            accent,
            background,
            surface,
            text: textColor,
            textMuted: textMutedColor,
            heading: headingColor,
            border: borderColor,
            success: '#22c55e',
            error: '#ef4444',
        };
    };

    // Generate simple palette name based on colors (English fallback)
    const generateSimplePaletteName = (colors: string[]): string => {
        if (!colors || colors?.length === 0) return 'Custom Palette';

        // Analyze all colors to determine the theme
        let totalR = 0, totalG = 0, totalB = 0;
        let darkCount = 0, lightCount = 0;

        colors?.forEach(color => {
            const hex = color.replace('#', '').toLowerCase();
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            totalR += r;
            totalG += g;
            totalB += b;

            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luminance < 100) darkCount++;
            if (luminance > 180) lightCount++;
        });

        const avgR = totalR / colors?.length;
        const avgG = totalG / colors?.length;
        const avgB = totalB / colors?.length;

        // Determine theme based on averages
        if (darkCount >= colors?.length / 2) return 'Midnight Theme';
        if (lightCount >= colors?.length / 2) return 'Light Breeze';

        // Determine by dominant color
        if (avgR > avgG + 30 && avgR > avgB + 30) {
            if (avgR > 180) return 'Coral Sunset';
            return 'Terracotta Earth';
        }
        if (avgG > avgR + 30 && avgG > avgB + 30) {
            return 'Forest Green';
        }
        if (avgB > avgR + 30 && avgB > avgG + 30) {
            return 'Ocean Blue';
        }
        if (avgR > 150 && avgG > 120 && avgB < 100) {
            return 'Golden Hour';
        }
        if (avgR > 150 && avgB > 150 && avgG < 120) {
            return 'Purple Haze';
        }
        if (avgR > 180 && avgG > 100 && avgB > 100 && avgR > avgG && avgR > avgB) {
            return 'Rose Garden';
        }

        // Mixed color palettes
        if (Math.abs(avgR - avgG) < 40 && Math.abs(avgG - avgB) < 40) {
            return 'Neutral Tones';
        }

        return 'Creative Blend';
    };

    // Generar nombre con AI
    const generatePaletteNameWithAI = async (colors: string[]): Promise<string> => {
        try {
            const prompt = generatePaletteNamePrompt(colors);

            // Timeout de 8 segundos para el nombre
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('timeout')), 8000);
            });

            const response = await Promise.race([
                generateContentViaProxy(
                    effectiveProjectId,
                    prompt,
                    'gemini-2.5-flash',
                    { temperature: 0.8, maxOutputTokens: 50 }
                ),
                timeoutPromise
            ]);

            const text = extractTextFromResponse(response);

            if (text) {
                // Limpiar el texto - quitar comillas, puntos, saltos de línea, etc.
                const cleanName = text.trim()
                    .split('\n')[0] // Solo primera línea
                    .replace(/^["']|["']$/g, '')
                    .replace(/\.$/g, '')
                    .replace(/^Nombre:\s*/i, '')
                    .replace(/^Name:\s*/i, '')
                    .replace(/^Palette:\s*/i, '')
                    .trim();

                if (cleanName && cleanName.length > 2 && cleanName.length < 50) {
                    return cleanName;
                }
            }
        } catch (err) {
            // AI failed, will use fallback
        }

        return generateSimplePaletteName(colors);
    };

    // Aplicar paleta con nombre generado por AI
    const handleApplyDirectly = async () => {
        if (!parsedColors || parsedColors.length < 3) {
            setError('Necesitas al menos 3 colores para generar una paleta');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const globalColors = generateFallbackPalette(parsedColors);

            // Generar nombre con AI solo si se requiere (templates)
            let paletteName: string | undefined;
            if (generatePaletteName) {
                paletteName = await generatePaletteNameWithAI(parsedColors);
                console.log('🎨 Palette name generated:', paletteName);
            }

            // Pasar todos los colores originales de la paleta para acceso rápido en el selector
            await onPaletteGenerated(globalColors, parsedColors, paletteName);

            setSuccess(true);
            setTimeout(() => {
                setInputUrl('');
                setParsedColors(null);
                setSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Error applying palette:', err);
            setError(err instanceof Error ? err.message : 'Error al aplicar la paleta');
        } finally {
            setIsLoading(false);
        }
    };

    // Generar paleta con AI (con timeout)
    const handleGeneratePalette = async () => {
        if (!parsedColors || parsedColors.length < 3) {
            setError('Necesitas al menos 3 colores para generar una paleta');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let globalColors: GlobalColors;

            // Crear promesa con timeout de 10 segundos
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('timeout')), 10000);
            });

            try {
                const prompt = generateAIPrompt(parsedColors);

                const response = await Promise.race([
                    generateContentViaProxy(
                        effectiveProjectId,
                        prompt,
                        'gemini-2.5-flash',
                        { temperature: 0.3 }
                    ),
                    timeoutPromise
                ]);

                const text = extractTextFromResponse(response);

                if (!text) {
                    throw new Error('Respuesta vacía de AI');
                }

                // Parsear la respuesta JSON
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('La respuesta de AI no contiene JSON válido');
                }

                const generatedPalette = JSON.parse(jsonMatch[0]);

                // Validar que tenga todas las propiedades necesarias
                const requiredKeys: (keyof GlobalColors)[] = [
                    'primary', 'secondary', 'accent', 'background', 'surface',
                    'text', 'textMuted', 'heading', 'border', 'success', 'error'
                ];

                for (const key of requiredKeys) {
                    if (!generatedPalette[key] || !/^#[0-9A-Fa-f]{6}$/i.test(generatedPalette[key])) {
                        throw new Error(`Color inválido para: ${key}`);
                    }
                }

                globalColors = {
                    primary: generatedPalette.primary,
                    secondary: generatedPalette.secondary,
                    accent: generatedPalette.accent,
                    background: generatedPalette.background,
                    surface: generatedPalette.surface,
                    text: generatedPalette.text,
                    textMuted: generatedPalette.textMuted,
                    heading: generatedPalette.heading,
                    border: generatedPalette.border,
                    success: generatedPalette.success,
                    error: generatedPalette.error,
                };

                // Usar el nombre generado por AI si existe
                const aiPaletteName = generatedPalette.paletteName || generateSimplePaletteName(parsedColors);

                // Aplicar la paleta con nombre de AI
                await onPaletteGenerated(globalColors, parsedColors, aiPaletteName);

                setSuccess(true);
                setTimeout(() => {
                    setInputUrl('');
                    setParsedColors(null);
                    setSuccess(false);
                }, 2000);

                return; // Salir exitosamente
            } catch (aiError) {
                console.warn('AI generation failed, using fallback:', aiError);
                // Usar fallback si AI falla o timeout
                globalColors = generateFallbackPalette(parsedColors);
            }

            // Aplicar la paleta con fallback - pasar todos los colores originales para acceso rápido
            const fallbackName = generateSimplePaletteName(parsedColors);
            await onPaletteGenerated(globalColors, parsedColors, fallbackName);

            setSuccess(true);
            setTimeout(() => {
                setInputUrl('');
                setParsedColors(null);
                setSuccess(false);
            }, 2000);

        } catch (err) {
            console.error('Error generating palette:', err);
            setError(err instanceof Error ? err.message : 'Error al generar la paleta');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Sparkles size={14} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-editor-text-primary">
                    {t('coolorsImporter.title', 'Importar desde Coolors.co')}
                </span>
            </div>

            {/* Input URL */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary">
                    <Link2 size={16} />
                </div>
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={t('coolorsImporter.placeholder', 'Pega URL de coolors.co o los colores...')}
                    className="w-full bg-editor-bg border border-editor-border rounded-lg pl-10 pr-4 py-3 text-sm text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                    disabled={isLoading}
                />
            </div>

            {/* Preview de colores parseados */}
            {parsedColors && parsedColors.length > 0 && (
                <div className="bg-editor-bg/50 border border-editor-border rounded-lg p-3">
                    <p className="text-xs text-editor-text-secondary mb-2 flex items-center gap-1">
                        <Palette size={12} />
                        {parsedColors.length} {t('coolorsImporter.colorsDetected', 'colores detectados')}:
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                        {parsedColors.map((color, idx) => (
                            <div
                                key={idx}
                                className="group relative"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg shadow-md border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-editor-text-secondary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {color}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{error}</p>
                </div>
            )}

            {/* Success message */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check size={16} className="text-green-400" />
                    <p className="text-xs text-green-400">{t('coolorsImporter.success', '¡Paleta aplicada exitosamente!')}</p>
                </div>
            )}

            {/* Buttons */}
            <div className="space-y-2">
                {/* Apply Directly Button (Fast) */}
                <button
                    onClick={handleApplyDirectly}
                    disabled={!parsedColors || parsedColors.length < 3 || isLoading}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${parsedColors && parsedColors.length >= 3 && !isLoading
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl'
                            : 'bg-editor-border text-editor-text-secondary cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('coolorsImporter.applying', 'Aplicando...')}
                        </>
                    ) : (
                        <>
                            <Zap size={18} />
                            {t('coolorsImporter.applyDirect', 'Aplicar Paleta (Rápido)')}
                        </>
                    )}
                </button>

                {/* Generate with AI Button */}
                <button
                    onClick={handleGeneratePalette}
                    disabled={!parsedColors || parsedColors.length < 3 || isLoading}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${parsedColors && parsedColors.length >= 3 && !isLoading
                            ? 'bg-editor-bg border border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
                            : 'bg-editor-bg border border-editor-border text-editor-text-secondary/50 cursor-not-allowed'
                        }`}
                >
                    <Wand2 size={16} />
                    {t('coolorsImporter.generateAI', 'Optimizar con AI')}
                </button>
            </div>

            {/* Help text */}
            <div className="text-xs text-editor-text-secondary/70 space-y-1">
                <p className="flex items-center gap-1">
                    <span className="text-purple-400">💡</span>
                    {t('coolorsImporter.helpTitle', 'Ejemplos de formato aceptado:')}
                </p>
                <code className="block bg-editor-bg px-2 py-1 rounded text-[10px] break-all">
                    coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51
                </code>
            </div>
        </div>
    );
};

export default CoolorsImporter;

