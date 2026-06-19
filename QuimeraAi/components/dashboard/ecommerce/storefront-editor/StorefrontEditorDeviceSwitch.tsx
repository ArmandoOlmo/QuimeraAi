import React from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

export type StorefrontEditorPreviewMode = 'desktop' | 'tablet' | 'mobile';

interface StorefrontEditorDeviceSwitchProps {
    value: StorefrontEditorPreviewMode;
    onChange: (mode: StorefrontEditorPreviewMode) => void;
}

const options: Array<{ mode: StorefrontEditorPreviewMode; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { mode: 'desktop', label: 'Escritorio', icon: Monitor },
    { mode: 'tablet', label: 'Tablet', icon: Tablet },
    { mode: 'mobile', label: 'Móvil', icon: Smartphone },
];

const StorefrontEditorDeviceSwitch: React.FC<StorefrontEditorDeviceSwitchProps> = ({ value, onChange }) => (
    <div className="flex items-center gap-1 rounded-md border border-q-border bg-q-surface p-1">
        {options.map(({ mode, label, icon: Icon }) => (
            <button
                key={mode}
                type="button"
                onClick={() => onChange(mode)}
                className={`flex h-8 items-center gap-2 rounded px-3 text-xs font-semibold transition-colors ${
                    value === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'text-q-text-muted hover:bg-secondary/70 hover:text-foreground'
                }`}
            >
                <Icon size={15} />
                <span className="hidden lg:inline">{label}</span>
            </button>
        ))}
    </div>
);

export default StorefrontEditorDeviceSwitch;
