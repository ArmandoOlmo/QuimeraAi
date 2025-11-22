
import React, { useState } from 'react';
import { Breakpoint, ResponsiveStyles, ResponsiveValue } from '../../../types';
import { Smartphone, Tablet, Monitor, Maximize } from 'lucide-react';

interface ResponsiveConfigEditorProps {
    componentId: string;
    currentStyles: ResponsiveStyles;
    onUpdate: (styles: ResponsiveStyles) => void;
}

const breakpoints: { value: Breakpoint; label: string; icon: React.ReactNode }[] = [
    { value: 'base', label: 'Base', icon: <Smartphone size={16} /> },
    { value: 'sm', label: 'SM (640px)', icon: <Smartphone size={16} /> },
    { value: 'md', label: 'MD (768px)', icon: <Tablet size={16} /> },
    { value: 'lg', label: 'LG (1024px)', icon: <Monitor size={16} /> },
    { value: 'xl', label: 'XL (1280px)', icon: <Monitor size={16} /> },
    { value: '2xl', label: '2XL (1536px)', icon: <Maximize size={16} /> },
];

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ResponsiveConfigEditor: React.FC<ResponsiveConfigEditorProps> = ({ componentId, currentStyles, onUpdate }) => {
    const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('base');

    const handleStyleChange = <K extends keyof ResponsiveStyles>(
        property: K,
        breakpoint: Breakpoint,
        value: string
    ) => {
        const updatedStyles = { ...currentStyles };
        
        if (!updatedStyles[property]) {
            updatedStyles[property] = {} as ResponsiveValue<any>;
        }
        
        (updatedStyles[property] as ResponsiveValue<any>)[breakpoint] = value;
        
        onUpdate(updatedStyles);
    };

    const getValueForBreakpoint = <K extends keyof ResponsiveStyles>(
        property: K,
        breakpoint: Breakpoint
    ): string => {
        const responsiveValue = currentStyles[property] as ResponsiveValue<any> | undefined;
        return responsiveValue?.[breakpoint] || '';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-editor-text-primary">Responsive Configuration</h4>
                <p className="text-xs text-editor-text-secondary">Configure styles per breakpoint</p>
            </div>

            {/* Breakpoint Tabs */}
            <div className="border border-editor-border rounded-lg overflow-hidden">
                <div className="flex bg-editor-bg">
                    {breakpoints.map(({ value, label, icon }) => (
                        <button
                            key={value}
                            onClick={() => setActiveBreakpoint(value)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                                activeBreakpoint === value
                                    ? 'bg-editor-accent text-editor-bg'
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            {icon}
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Style Controls for Active Breakpoint */}
            <div className="space-y-4 border border-editor-border rounded-lg p-4 bg-editor-panel-bg">
                <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-semibold text-editor-text-primary">
                        Styles for {breakpoints.find(b => b.value === activeBreakpoint)?.label}
                    </h5>
                    <span className="text-xs text-editor-text-secondary">
                        {activeBreakpoint === 'base' ? 'Default styles' : 'Overrides for this breakpoint'}
                    </span>
                </div>

                {/* Spacing */}
                <div>
                    <Label>Spacing</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('spacing', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('spacing', activeBreakpoint, e.target.value)}
                        placeholder="e.g., 16px, 1rem, 20px"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">General spacing value (e.g., 16px, 1rem)</p>
                </div>

                {/* Font Size */}
                <div>
                    <Label>Font Size</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('fontSize', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('fontSize', activeBreakpoint, e.target.value)}
                        placeholder="e.g., 14px, 1rem, 18px"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">Font size (e.g., 14px, 1rem)</p>
                </div>

                {/* Display */}
                <div>
                    <Label>Display</Label>
                    <select
                        value={getValueForBreakpoint('display', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('display', activeBreakpoint, e.target.value)}
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                        <option value="">Inherit</option>
                        <option value="block">Block</option>
                        <option value="flex">Flex</option>
                        <option value="grid">Grid</option>
                        <option value="none">None (Hide)</option>
                    </select>
                    <p className="text-xs text-editor-text-secondary mt-1">CSS display property</p>
                </div>

                {/* Width */}
                <div>
                    <Label>Width</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('width', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('width', activeBreakpoint, e.target.value)}
                        placeholder="e.g., 100%, 50vw, 500px"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">Width (e.g., 100%, 50vw, 500px)</p>
                </div>

                {/* Height */}
                <div>
                    <Label>Height</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('height', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('height', activeBreakpoint, e.target.value)}
                        placeholder="e.g., auto, 300px, 50vh"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">Height (e.g., auto, 300px, 50vh)</p>
                </div>

                {/* Padding */}
                <div>
                    <Label>Padding</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('padding', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('padding', activeBreakpoint, e.target.value)}
                        placeholder="e.g., 16px, 1rem 2rem, 10px 20px 10px 20px"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">Padding (e.g., 16px, 1rem 2rem)</p>
                </div>

                {/* Margin */}
                <div>
                    <Label>Margin</Label>
                    <input
                        type="text"
                        value={getValueForBreakpoint('margin', activeBreakpoint)}
                        onChange={(e) => handleStyleChange('margin', activeBreakpoint, e.target.value)}
                        placeholder="e.g., 0 auto, 1rem, 10px 20px"
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">Margin (e.g., 0 auto, 1rem)</p>
                </div>

                <div className="pt-4 border-t border-editor-border">
                    <p className="text-xs text-editor-text-secondary italic">
                        💡 Tip: Leave empty to inherit from smaller breakpoints. Base styles apply to all sizes unless overridden.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResponsiveConfigEditor;

