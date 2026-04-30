const fs = require('fs');

const path = 'components/controls/landing/LandingQuimeraControls.tsx';
let content = fs.readFileSync(path, 'utf8');

// The replacement template based on SKILL.md
const getStyleTab = (hasCards, hasIcons) => `
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    ${hasCards ? `
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        ${hasIcons ? `
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        ` : ''}
                    </div>
                    ` : ''}
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;
`;

// Replace all instances of `return withQuimeraTabs(content, deps, { hasCards: true/false, hasIcons: true/false });`
content = content.replace(
    /return\s+withQuimeraTabs\(\s*content\s*,\s*deps\s*,\s*\{\s*hasCards:\s*(true|false)\s*,\s*hasIcons:\s*(true|false)\s*\}\s*\);/g,
    (match, hasCards, hasIcons) => {
        return getStyleTab(hasCards === 'true', hasIcons === 'true');
    }
);

// We also need to remove `withQuimeraTabs` itself and `renderQuimeraStyleTab`
// But we'll do that manually later if needed.

fs.writeFileSync(path, content, 'utf8');
console.log('Replacements completed.');
