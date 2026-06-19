import React from 'react';
import { Palette, RefreshCw, Settings, SlidersHorizontal } from 'lucide-react';
import type { StorefrontThemeSettings } from '../../../../types/ecommerce';
import type { StorefrontThemePresetId } from '../../../../types/storefrontTheme';
import type {
    SelectedStorefrontNode,
    StorefrontEditorBlock,
    StorefrontEditorColorScheme,
    StorefrontEditorSection,
    StorefrontInspectorControl,
} from '../../../../types/storefrontEditor';
import { storefrontBlockRegistry, storefrontSectionRegistry } from '../../../../utils/storefrontRenderer';
import { STOREFRONT_THEME_PRESETS } from '../../../../utils/storefrontTheme';

interface StorefrontEditorInspectorProps {
    selectedNode: SelectedStorefrontNode;
    selectedSection?: StorefrontEditorSection;
    selectedBlock?: StorefrontEditorBlock;
    templateState: 'draft' | 'published';
    colorSchemes: StorefrontEditorColorScheme[];
    activeColorScheme: string;
    selectedPresetId: StorefrontThemePresetId;
    themeSettings: StorefrontThemeSettings;
    onTemplateStateChange: (state: 'draft' | 'published') => void;
    onSectionSettingChange: (sectionId: string, key: string, value: unknown) => void;
    onBlockSettingChange: (sectionId: string, blockId: string, key: string, value: unknown) => void;
    onSectionReset: (sectionId: string) => void;
    onThemePresetChange: (presetId: StorefrontThemePresetId) => void;
    onThemeSchemeChange: (schemeId: string) => void;
}

const controlClass = 'mt-1 w-full rounded-md border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

const toInputValue = (value: unknown): string => {
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === 'object' && item !== null && 'text' in item) return String((item as any).text || '');
            return String(item);
        }).join('\n');
    }
    if (value === undefined || value === null) return '';
    return String(value);
};

const coerceControlValue = (control: StorefrontInspectorControl, raw: string | boolean): unknown => {
    if (control.type === 'toggle') return Boolean(raw);
    if (control.type === 'number' || control.type === 'range') {
        if (raw === '') return undefined;
        const numeric = Number(raw);
        if (Number.isNaN(numeric)) return undefined;
        const min = typeof control.min === 'number' ? control.min : numeric;
        const max = typeof control.max === 'number' ? control.max : numeric;
        return Math.min(max, Math.max(min, numeric));
    }
    if (control.key === 'messages' && typeof raw === 'string') {
        return raw
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(text => ({ text }));
    }
    return raw;
};

const renderControl = (
    control: StorefrontInspectorControl,
    settings: Record<string, unknown>,
    onChange: (key: string, value: unknown) => void,
) => {
    const value = settings[control.key];

    if (control.type === 'toggle') {
        const checked = value !== false;
        return (
            <label key={control.key} className="flex items-center justify-between gap-3 rounded-md border border-q-border bg-q-bg/40 px-3 py-2">
                <span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-q-text-muted">{control.label}</span>
                    {control.helperText && <span className="block text-xs text-q-text-muted">{control.helperText}</span>}
                </span>
                <button
                    type="button"
                    onClick={() => onChange(control.key, !checked)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
                    aria-pressed={checked}
                >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </label>
        );
    }

    if (control.type === 'select' || control.type === 'layout' || control.type === 'alignment' || control.type === 'productSource' || control.type === 'collection' || control.type === 'buttonStyle') {
        return (
            <label key={control.key} className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{control.label}</span>
                <select
                    value={toInputValue(value)}
                    onChange={event => onChange(control.key, event.target.value)}
                    className={controlClass}
                >
                    {(control.options || []).map(option => (
                        <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    if (control.type === 'textarea') {
        return (
            <label key={control.key} className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{control.label}</span>
                <textarea
                    value={toInputValue(value)}
                    onChange={event => onChange(control.key, coerceControlValue(control, event.target.value))}
                    rows={3}
                    className={controlClass}
                    placeholder={control.placeholder}
                />
            </label>
        );
    }

    if (control.type === 'range') {
        const numericValue = Number(value ?? control.min ?? 0);
        return (
            <label key={control.key} className="block">
                <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-q-text-muted">
                    <span>{control.label}</span>
                    <span>{numericValue}</span>
                </span>
                <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step || 1}
                    value={numericValue}
                    onChange={event => onChange(control.key, coerceControlValue(control, event.target.value))}
                    className="mt-2 w-full accent-primary"
                />
            </label>
        );
    }

    if (control.type === 'colorScheme') {
        return null;
    }

    return (
        <label key={control.key} className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-q-text-muted">{control.label}</span>
            <input
                type={control.type === 'number' ? 'number' : 'text'}
                min={control.min}
                max={control.max}
                step={control.step}
                value={toInputValue(value)}
                onChange={event => onChange(control.key, coerceControlValue(control, event.target.value))}
                className={controlClass}
                placeholder={control.placeholder}
            />
        </label>
    );
};

const ColorSchemeCards: React.FC<{
    schemes: StorefrontEditorColorScheme[];
    activeColorScheme: string;
    onChange: (schemeId: string) => void;
}> = ({ schemes, activeColorScheme, onChange }) => (
    <div className="grid gap-2">
        {schemes.map(scheme => (
            <button
                key={scheme.id}
                type="button"
                onClick={() => onChange(scheme.id)}
                className={`rounded-md border p-3 text-left transition-colors ${
                    activeColorScheme === scheme.id
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-q-border bg-q-bg/40 hover:bg-secondary/60'
                }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-foreground">{scheme.name}</p>
                        <p className="text-xs text-q-text-muted">Aa preview</p>
                    </div>
                    <div className="flex gap-1">
                        {[scheme.background, scheme.foreground, scheme.primary, scheme.accent].map((color, index) => (
                            <span
                                key={`${scheme.id}-${index}`}
                                className="h-5 w-5 rounded-full border border-q-border"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </button>
        ))}
    </div>
);

const StorefrontEditorInspector: React.FC<StorefrontEditorInspectorProps> = ({
    selectedNode,
    selectedSection,
    selectedBlock,
    templateState,
    colorSchemes,
    activeColorScheme,
    selectedPresetId,
    themeSettings,
    onTemplateStateChange,
    onSectionSettingChange,
    onBlockSettingChange,
    onSectionReset,
    onThemePresetChange,
    onThemeSchemeChange,
}) => {
    const sectionRegistryItem = selectedSection ? storefrontSectionRegistry[selectedSection.kind] : undefined;
    const blockRegistryItem = selectedBlock ? storefrontBlockRegistry[selectedBlock.kind] : undefined;

    const headerLabel = selectedNode.nodeType === 'theme'
        ? 'Tema'
        : selectedNode.nodeType === 'template'
            ? 'Template'
            : selectedNode.nodeType === 'block'
                ? selectedBlock?.label || 'Bloque'
                : selectedSection?.label || 'Sección';

    const Icon = selectedNode.nodeType === 'theme' ? Palette : selectedNode.nodeType === 'template' ? Settings : SlidersHorizontal;

    return (
        <aside className="flex w-[340px] flex-shrink-0 flex-col overflow-hidden border-l border-q-border bg-q-bg xl:w-[380px]">
            <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-q-border px-4">
                <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground">
                    <Icon size={15} className="text-primary" />
                    <span className="truncate">Editar: {headerLabel}</span>
                </h3>
                {selectedSection && selectedNode.nodeType === 'section' && (
                    <button
                        type="button"
                        onClick={() => onSectionReset(selectedSection.id)}
                        className="rounded p-1.5 text-q-text-muted hover:bg-secondary/70 hover:text-foreground"
                        aria-label="Restablecer"
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {selectedNode.nodeType === 'template' && (
                    <div className="space-y-4">
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <p className="text-sm font-bold text-foreground">Estado de plantilla</p>
                            <p className="mt-1 text-xs text-q-text-muted">Guardar trabaja sobre draft. Publicar copia draft a público.</p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {(['draft', 'published'] as const).map(state => (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={() => onTemplateStateChange(state)}
                                        className={`rounded-md px-3 py-2 text-sm font-bold ${
                                            templateState === state
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary/60 text-q-text-muted hover:text-foreground'
                                        }`}
                                    >
                                        {state === 'draft' ? 'Borrador' : 'Publicado'}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {selectedNode.nodeType === 'theme' && (
                    <div className="space-y-4">
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <p className="text-sm font-bold text-foreground">Presets de tema</p>
                            <p className="mt-1 text-xs text-q-text-muted">Aplica estilo visual al draft del storefront.</p>
                            <div className="mt-4 grid gap-2">
                                {(Object.keys(STOREFRONT_THEME_PRESETS) as StorefrontThemePresetId[]).map(presetId => {
                                    const preset = STOREFRONT_THEME_PRESETS[presetId];
                                    return (
                                        <button
                                            key={presetId}
                                            type="button"
                                            onClick={() => onThemePresetChange(presetId)}
                                            className={`rounded-md border p-3 text-left transition-colors ${
                                                selectedPresetId === presetId
                                                    ? 'border-sky-400 bg-sky-500/10'
                                                    : 'border-q-border bg-q-bg/40 hover:bg-secondary/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{preset.label}</p>
                                                    <p className="line-clamp-2 text-xs text-q-text-muted">{preset.description}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[preset.theme.primaryColor, preset.theme.accentColor, preset.theme.backgroundColor].map((color, index) => (
                                                        <span
                                                            key={`${presetId}-${index}`}
                                                            className="h-5 w-5 rounded-full border border-q-border"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <p className="text-sm font-bold text-foreground">Color schemes</p>
                            <p className="mt-1 text-xs text-q-text-muted">Las secciones usan schemes reutilizables, no colores sueltos.</p>
                            <div className="mt-4">
                                <ColorSchemeCards
                                    schemes={colorSchemes}
                                    activeColorScheme={activeColorScheme}
                                    onChange={onThemeSchemeChange}
                                />
                            </div>
                        </section>
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <p className="text-sm font-bold text-foreground">Theme tokens</p>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[themeSettings.primaryColor, themeSettings.secondaryColor, themeSettings.accentColor].map((color, index) => (
                                    <span
                                        key={`${color}-${index}`}
                                        className="h-10 rounded-md border border-q-border"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {selectedNode.nodeType === 'section' && selectedSection && sectionRegistryItem && (
                    <div className="space-y-4">
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <div className="mb-4">
                                <p className="text-sm font-bold text-foreground">{selectedSection.label}</p>
                                <p className="mt-1 text-xs text-q-text-muted">Controles de presentación. No edita productos ni inventario.</p>
                            </div>
                            <div className="space-y-3">
                                <ColorSchemeCards
                                    schemes={colorSchemes}
                                    activeColorScheme={String(selectedSection.settings.colorScheme || activeColorScheme)}
                                    onChange={(schemeId) => onSectionSettingChange(selectedSection.id, 'colorScheme', schemeId)}
                                />
                                {(sectionRegistryItem.inspectorSchema || []).map(control => renderControl(
                                    control,
                                    selectedSection.settings,
                                    (key, value) => onSectionSettingChange(selectedSection.id, key, value),
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {selectedNode.nodeType === 'block' && selectedSection && selectedBlock && blockRegistryItem && (
                    <div className="space-y-4">
                        <section className="rounded-md border border-q-border bg-q-surface p-4">
                            <div className="mb-4">
                                <p className="text-sm font-bold text-foreground">{selectedBlock.label}</p>
                                <p className="mt-1 text-xs text-q-text-muted">Bloque dentro de {selectedSection.label}.</p>
                            </div>
                            <div className="space-y-3">
                                {blockRegistryItem.inspectorSchema.map(control => renderControl(
                                    control,
                                    selectedBlock.settings,
                                    (key, value) => onBlockSettingChange(selectedSection.id, selectedBlock.id, key, value),
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default StorefrontEditorInspector;
