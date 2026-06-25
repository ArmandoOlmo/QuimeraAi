import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RealtyModuleFlags } from '../../../types/realty';

interface RealtyModuleSettingsPanelProps {
    flags: RealtyModuleFlags;
    isSaving: boolean;
    onUpdateFlags: (nextFlags: Partial<RealtyModuleFlags>, enabled?: boolean) => void | Promise<void>;
}

const ToggleRow = ({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void | Promise<void>; disabled?: boolean }) => (
    <div className="flex items-center justify-between rounded-lg border border-q-border bg-q-bg p-4">
        <span className="min-w-0 pr-4 text-sm font-medium text-q-text">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            data-state={checked ? 'checked' : 'unchecked'}
            disabled={disabled}
            onClick={(event) => {
                event.stopPropagation();
                if (disabled) return;
                void Promise.resolve(onChange(!checked)).catch(() => undefined);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            draggable={false}
            className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay/80'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} quimera-editor-switch relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-q-accent/40 focus:ring-offset-2 focus:ring-offset-q-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'quimera-editor-switch-knob-on translate-x-5' : 'quimera-editor-switch-knob-off translate-x-0'} quimera-editor-switch-knob pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-q-surface shadow-sm ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const RealtyModuleSettingsPanel: React.FC<RealtyModuleSettingsPanelProps> = ({ flags, isSaving, onUpdateFlags }) => {
    const { t } = useTranslation();

    return (
        <div className="max-w-2xl rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
            <h3 className="font-bold text-q-text">{t('realty.settings.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-q-text-secondary">{t('realty.settings.description')}</p>
            <div className="mt-6 space-y-4">
                <ToggleRow
                    disabled={isSaving}
                    label={t('realty.settings.moduleEnabled')}
                    checked={flags.real_estate_enabled}
                    onChange={value => onUpdateFlags({ real_estate_enabled: value }, value)}
                />
                <ToggleRow
                    disabled={isSaving}
                    label={t('realty.settings.aiEnabled')}
                    checked={flags.real_estate_ai_enabled}
                    onChange={value => onUpdateFlags({ real_estate_ai_enabled: value })}
                />
                <ToggleRow
                    disabled={isSaving}
                    label={t('realty.settings.publicDirectoryEnabled')}
                    checked={flags.real_estate_public_directory_enabled}
                    onChange={value => onUpdateFlags({ real_estate_public_directory_enabled: value })}
                />
            </div>
            <div className="mt-6 rounded-lg border border-q-border bg-q-bg p-4 text-sm text-q-text-secondary">
                <p className="font-medium text-q-text">{t('realty.settings.publicPath')}</p>
                <p className="mt-1">/listados</p>
            </div>
        </div>
    );
};

export default RealtyModuleSettingsPanel;
