import React from 'react';
import { useTranslation } from 'react-i18next';

interface DynamicPassthroughControlsProps {
    allowedParameters?: string[];
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    negativePrompt?: string;
    onNegativePromptChange?: (value: string) => void;
}

const PASSTHROUGH_LABELS: Record<string, string> = {
    negativePrompt: 'mediaGeneration.negativePrompt',
    personGeneration: 'mediaGeneration.personGeneration',
    enhancePrompt: 'mediaGeneration.enhancePrompt',
    conditioningScale: 'mediaGeneration.conditioningScale',
};

const PERSON_GENERATION_OPTIONS = [
    { value: 'allow', label: 'Allow' },
    { value: 'dont_allow', label: "Don't allow" },
    { value: 'allow_adult', label: 'Allow adult' },
];

const DynamicPassthroughControls: React.FC<DynamicPassthroughControlsProps> = ({
    allowedParameters = [],
    values,
    onChange,
    negativePrompt = '',
    onNegativePromptChange,
}) => {
    const { t } = useTranslation();

    const showNegative = allowedParameters.includes('negativePrompt') || onNegativePromptChange;

    if (!showNegative && allowedParameters.length === 0) return null;

    return (
        <div className="space-y-4 pt-2 border-t border-dashed border-q-border/70">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide">
                {t('mediaGeneration.advancedControls', { defaultValue: 'Advanced controls' })}
            </label>

            {showNegative && onNegativePromptChange && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-q-text-secondary uppercase">
                        {t('mediaGeneration.negativePrompt', { defaultValue: 'Negative prompt' })}
                    </label>
                    <textarea
                        value={negativePrompt}
                        onChange={(e) => onNegativePromptChange(e.target.value)}
                        className="w-full bg-q-bg border border-q-border text-q-text text-xs rounded-lg p-3 resize-none min-h-[72px]"
                        placeholder={t('mediaGeneration.negativePromptPlaceholder', { defaultValue: 'What to exclude...' })}
                    />
                </div>
            )}

            {allowedParameters.includes('personGeneration') && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-q-text-secondary uppercase">
                        {t('mediaGeneration.personGeneration', { defaultValue: 'Person generation' })}
                    </label>
                    <select
                        value={String(values.personGeneration || 'allow_adult')}
                        onChange={(e) => onChange('personGeneration', e.target.value)}
                        className="w-full bg-q-bg border border-q-border rounded-lg py-2 px-3 text-xs"
                    >
                        {PERSON_GENERATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            )}

            {allowedParameters.includes('enhancePrompt') && (
                <label className="flex items-center gap-2 text-xs text-q-text cursor-pointer">
                    <input
                        type="checkbox"
                        checked={Boolean(values.enhancePrompt)}
                        onChange={(e) => onChange('enhancePrompt', e.target.checked)}
                        className="rounded border-q-border"
                    />
                    {t('mediaGeneration.enhancePrompt', { defaultValue: 'Enhance prompt' })}
                </label>
            )}

            {allowedParameters.includes('conditioningScale') && (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-q-text-secondary uppercase">
                        {t('mediaGeneration.conditioningScale', { defaultValue: 'Conditioning scale' })}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={Number(values.conditioningScale ?? 0.5)}
                        onChange={(e) => onChange('conditioningScale', parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
            )}

            {allowedParameters
                .filter(p => !['negativePrompt', 'personGeneration', 'enhancePrompt', 'conditioningScale', 'aspectRatio'].includes(p))
                .map(param => (
                    <div key={param} className="space-y-2">
                        <label className="text-[10px] font-bold text-q-text-secondary uppercase">
                            {t(PASSTHROUGH_LABELS[param] || `mediaGeneration.${param}`, { defaultValue: param })}
                        </label>
                        <input
                            type="text"
                            value={String(values[param] ?? '')}
                            onChange={(e) => onChange(param, e.target.value)}
                            className="w-full bg-q-bg border border-q-border rounded-lg py-2 px-3 text-xs"
                        />
                    </div>
                ))}
        </div>
    );
};

export default DynamicPassthroughControls;
