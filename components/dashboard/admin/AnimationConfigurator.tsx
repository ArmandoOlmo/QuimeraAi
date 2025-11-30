
import React, { useState, useEffect } from 'react';
import { AnimationConfig, AdvancedAnimationType, AnimationEasing, AnimationTrigger } from '../../../types';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface AnimationConfiguratorProps {
    componentId: string;
    currentConfig?: AnimationConfig;
    onUpdate: (config: AnimationConfig) => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const animationTypes: { value: AdvancedAnimationType; label: string; description: string }[] = [
    { value: 'fade', label: 'Fade', description: 'Opacity transition' },
    { value: 'slide', label: 'Slide', description: 'Position movement' },
    { value: 'scale', label: 'Scale', description: 'Size transformation' },
    { value: 'rotate', label: 'Rotate', description: 'Rotation effect' },
    { value: 'bounce', label: 'Bounce', description: 'Spring animation' },
    { value: 'custom', label: 'Custom', description: 'Custom keyframes' }
];

const easingOptions: { value: AnimationEasing; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'easeIn', label: 'Ease In' },
    { value: 'easeOut', label: 'Ease Out' },
    { value: 'easeInOut', label: 'Ease In Out' },
    { value: 'spring', label: 'Spring' }
];

const triggerOptions: { value: AnimationTrigger; label: string }[] = [
    { value: 'onLoad', label: 'On Load' },
    { value: 'onScroll', label: 'On Scroll' },
    { value: 'onClick', label: 'On Click' },
    { value: 'onHover', label: 'On Hover' }
];

const AnimationConfigurator: React.FC<AnimationConfiguratorProps> = ({ componentId, currentConfig, onUpdate }) => {
    const [type, setType] = useState<AdvancedAnimationType>(currentConfig?.type || 'fade');
    const [duration, setDuration] = useState(currentConfig?.duration || 500);
    const [delay, setDelay] = useState(currentConfig?.delay || 0);
    const [easing, setEasing] = useState<AnimationEasing>(currentConfig?.easing || 'easeOut');
    const [trigger, setTrigger] = useState<AnimationTrigger>(currentConfig?.trigger || 'onLoad');
    const [repeat, setRepeat] = useState(currentConfig?.repeat || 1);
    const [direction, setDirection] = useState<'normal' | 'reverse' | 'alternate'>(currentConfig?.direction || 'normal');
    const [customKeyframes, setCustomKeyframes] = useState(currentConfig?.customKeyframes || '');
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);

    const handleSave = () => {
        const config: AnimationConfig = {
            type,
            duration,
            delay,
            easing,
            trigger,
            repeat,
            direction,
            ...(type === 'custom' && customKeyframes ? { customKeyframes } : {})
        };
        onUpdate(config);
    };

    const playAnimation = () => {
        setAnimationKey(prev => prev + 1);
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), duration + delay);
    };

    const resetAnimation = () => {
        setAnimationKey(prev => prev + 1);
        setIsPlaying(false);
    };

    // Generate animation CSS
    const getAnimationStyle = (): React.CSSProperties => {
        const easingMap: Record<AnimationEasing, string> = {
            linear: 'linear',
            easeIn: 'ease-in',
            easeOut: 'ease-out',
            easeInOut: 'ease-in-out',
            spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        };

        const animationName = type === 'custom' ? 'customAnimation' : type;
        
        return {
            animation: isPlaying 
                ? `${animationName} ${duration}ms ${easingMap[easing]} ${delay}ms ${repeat === -1 ? 'infinite' : repeat} ${direction}`
                : 'none'
        };
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-editor-text-primary">Animation Configuration</h4>
                <button
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-editor-accent text-editor-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                    Save Animation
                </button>
            </div>

            {/* Animation Type */}
            <div>
                <Label>Animation Type</Label>
                <div className="grid grid-cols-2 gap-2">
                    {animationTypes.map((anim) => (
                        <button
                            key={anim.value}
                            onClick={() => setType(anim.value)}
                            className={`p-3 rounded-md border-2 transition-colors text-left ${
                                type === anim.value
                                    ? 'border-editor-accent bg-editor-accent/10'
                                    : 'border-editor-border hover:border-editor-accent/50'
                            }`}
                        >
                            <div className="font-semibold text-sm text-editor-text-primary">{anim.label}</div>
                            <div className="text-xs text-editor-text-secondary mt-0.5">{anim.description}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Duration */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <Label>Duration</Label>
                    <span className="text-sm text-editor-text-secondary">{duration}ms</span>
                </div>
                <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
                <div className="flex justify-between text-xs text-editor-text-secondary mt-1">
                    <span>100ms</span>
                    <span>5000ms</span>
                </div>
            </div>

            {/* Delay */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <Label>Delay</Label>
                    <span className="text-sm text-editor-text-secondary">{delay}ms</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
                <div className="flex justify-between text-xs text-editor-text-secondary mt-1">
                    <span>0ms</span>
                    <span>2000ms</span>
                </div>
            </div>

            {/* Easing */}
            <div>
                <Label>Easing Function</Label>
                <select
                    value={easing}
                    onChange={(e) => setEasing(e.target.value as AnimationEasing)}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                >
                    {easingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Trigger */}
            <div>
                <Label>Trigger</Label>
                <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value as AnimationTrigger)}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                >
                    {triggerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Repeat */}
            <div>
                <Label>Repeat Count</Label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="1"
                        value={repeat === -1 ? '' : repeat}
                        onChange={(e) => setRepeat(e.target.value === '' ? -1 : Number(e.target.value))}
                        placeholder="Infinite"
                        className="flex-1 px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                    <button
                        onClick={() => setRepeat(-1)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            repeat === -1
                                ? 'bg-editor-accent text-editor-bg'
                                : 'bg-editor-border text-editor-text-primary hover:bg-editor-accent hover:text-editor-bg'
                        }`}
                    >
                        Infinite
                    </button>
                </div>
            </div>

            {/* Direction */}
            <div>
                <Label>Direction</Label>
                <div className="flex gap-2">
                    {(['normal', 'reverse', 'alternate'] as const).map((dir) => (
                        <button
                            key={dir}
                            onClick={() => setDirection(dir)}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                direction === dir
                                    ? 'bg-editor-accent text-editor-bg'
                                    : 'bg-editor-border text-editor-text-primary hover:bg-editor-accent hover:text-editor-bg'
                            }`}
                        >
                            {dir.charAt(0).toUpperCase() + dir.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Keyframes (only for custom type) */}
            {type === 'custom' && (
                <div>
                    <Label>Custom Keyframes (CSS)</Label>
                    <textarea
                        value={customKeyframes}
                        onChange={(e) => setCustomKeyframes(e.target.value)}
                        placeholder="0% { transform: translateX(0); }&#10;100% { transform: translateX(100px); }"
                        rows={4}
                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-md text-editor-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    />
                </div>
            )}

            {/* Preview */}
            <div>
                <Label>Preview</Label>
                <div className="bg-editor-bg border border-editor-border rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px]">
                    <div
                        key={animationKey}
                        style={getAnimationStyle()}
                        className="w-20 h-20 bg-editor-accent rounded-lg flex items-center justify-center"
                    >
                        <span className="text-editor-bg font-bold">Preview</span>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={playAnimation}
                            disabled={isPlaying}
                            className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-editor-bg rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <Play size={16} />
                            Play
                        </button>
                        <button
                            onClick={resetAnimation}
                            className="flex items-center gap-2 px-4 py-2 bg-editor-border text-editor-text-primary rounded-md hover:bg-editor-accent hover:text-editor-bg transition-colors"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide {
                    from { transform: translateX(-50px); }
                    to { transform: translateX(0); }
                }
                @keyframes scale {
                    from { transform: scale(0.5); }
                    to { transform: scale(1); }
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-30px); }
                }
                ${type === 'custom' && customKeyframes ? `@keyframes customAnimation { ${customKeyframes} }` : ''}
            `}</style>
        </div>
    );
};

export default AnimationConfigurator;

