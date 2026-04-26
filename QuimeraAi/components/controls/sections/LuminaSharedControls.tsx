import React from 'react';
import { ToggleControl } from '../../ui/EditorControlPrimitives';
import ColorControl from '../../ui/ColorControl';

// We import AIFormControl logic conceptually to wrap inputs nicely.
// Here we'll just build a small standalone section of controls.

interface LuminaAnimationConfig {
    enabled?: boolean;
    colors?: {
        bg?: string;
        primary?: string;
        accent?: string;
    };
    pulseSpeed?: number;
    interactionStrength?: number;
}

export const renderLuminaAnimationControls = (
    data: any,
    onChange: (key: string, value: any) => void
) => {
    const config: LuminaAnimationConfig = data.luminaAnimation || { enabled: true };

    const updateAnimation = (key: string, value: any) => {
        onChange('luminaAnimation', {
            ...config,
            [key]: value
        });
    };

    const updateColor = (key: string, value: string) => {
        onChange('luminaAnimation', {
            ...config,
            colors: {
                ...(config.colors || {}),
                [key]: value
            }
        });
    };

    return (
        <div className="space-y-4 border-t border-gray-800 pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-200 flex items-center justify-between">
                WebGL Animation
                <ToggleControl
                    label=""
                    checked={config.enabled ?? false}
                    onChange={(checked) => updateAnimation('enabled', checked)}
                />
            </h4>

            {config.enabled && (
                <div className="space-y-4 pt-2">
                    <ColorControl
                        label="Background Color"
                        value={config.colors?.bg || '#022C22'}
                        onChange={(val) => updateColor('bg', val)}
                        paletteColors={[]}
                    />
                    <ColorControl
                        label="Primary Color (Dots)"
                        value={config.colors?.primary || '#064E3B'}
                        onChange={(val) => updateColor('primary', val)}
                        paletteColors={[]}
                    />
                    <ColorControl
                        label="Accent Color (Interaction)"
                        value={config.colors?.accent || '#10B981'}
                        onChange={(val) => updateColor('accent', val)}
                        paletteColors={[]}
                    />
                    
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-xs font-medium text-gray-400">Pulse Speed</label>
                            <span className="text-xs text-gray-500">{config.pulseSpeed ?? 0.5}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={config.pulseSpeed ?? 0.5}
                            onChange={(e) => updateAnimation('pulseSpeed', parseFloat(e.target.value))}
                            className="w-full accent-green-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-xs font-medium text-gray-400">Interaction Radius</label>
                            <span className="text-xs text-gray-500">{config.interactionStrength ?? 2.0}</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="5.0"
                            step="0.1"
                            value={config.interactionStrength ?? 2.0}
                            onChange={(e) => updateAnimation('interactionStrength', parseFloat(e.target.value))}
                            className="w-full accent-green-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
