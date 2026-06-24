import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/utils';
import { Button, BuilderControl, ColorPickerField, Select, Slider, Toggle } from '../components';
import {
  createGradientBackground,
  getGradientPreset,
  gradientPresets,
  type GradientPresetConfig,
  type GradientPresetId,
} from './gradientPresets';

export interface BackgroundControlValue {
  presetId: GradientPresetId;
  config: GradientPresetConfig;
}

export interface BackgroundControlsProps {
  value: BackgroundControlValue;
  onChange: (value: BackgroundControlValue) => void;
  className?: string;
}

export function createDefaultBackgroundControlValue(presetId: GradientPresetId = 'softAurora'): BackgroundControlValue {
  const preset = getGradientPreset(presetId);
  return {
    presetId,
    config: { ...preset.defaultConfig },
  };
}

export function BackgroundPreview({ value, className }: { value: BackgroundControlValue; className?: string }) {
  return (
    <div
      className={cn('h-24 overflow-hidden rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface-overlay', className)}
      style={createGradientBackground(value.presetId, value.config)}
      aria-hidden="true"
    />
  );
}

export function BackgroundControls({ value, onChange, className }: BackgroundControlsProps) {
  const updateConfig = (patch: Partial<GradientPresetConfig>) => {
    onChange({
      ...value,
      config: { ...value.config, ...patch },
    });
  };

  const setPreset = (presetId: string) => {
    const nextPreset = getGradientPreset(presetId as GradientPresetId);
    onChange({
      presetId: nextPreset.id,
      config: { ...nextPreset.defaultConfig },
    });
  };

  const reset = () => {
    const preset = getGradientPreset(value.presetId);
    onChange({ presetId: value.presetId, config: { ...preset.defaultConfig } });
  };

  return (
    <BuilderControl
      kind="gradient"
      label="Background"
      description="Reusable gradient controls for website, landing, storefront, hero, banner, and AI-generated sections."
      className={className}
    >
      <div className="space-y-4">
        <BackgroundPreview value={value} />
        <Toggle
          checked={value.config.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
          label="Enable background"
          description="Turns the gradient layer on or off."
        />
        <Select
          label="Preset"
          value={value.presetId}
          onChange={(event) => setPreset(event.target.value)}
          options={gradientPresets.map((preset) => ({ value: preset.id, label: preset.name }))}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ColorPickerField label="Primary" value={value.config.primaryColor} onChange={(primaryColor) => updateConfig({ primaryColor })} />
          <ColorPickerField label="Secondary" value={value.config.secondaryColor} onChange={(secondaryColor) => updateConfig({ secondaryColor })} />
          <ColorPickerField label="Accent" value={value.config.accentColor} onChange={(accentColor) => updateConfig({ accentColor })} />
        </div>
        <Slider label="Intensity" value={value.config.intensity} onValueChange={(intensity) => updateConfig({ intensity })} min={0} max={100} step={1} suffix="%" />
        <Slider label="Opacity" value={value.config.opacity} onValueChange={(opacity) => updateConfig({ opacity })} min={0} max={100} step={1} suffix="%" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Slider label="Focus X" value={value.config.focusX} onValueChange={(focusX) => updateConfig({ focusX })} min={0} max={100} step={1} suffix="%" />
          <Slider label="Focus Y" value={value.config.focusY} onValueChange={(focusY) => updateConfig({ focusY })} min={0} max={100} step={1} suffix="%" />
        </div>
        <Slider label="Blur" value={value.config.blur} onValueChange={(blur) => updateConfig({ blur })} min={0} max={64} step={1} suffix="px" />
        <Button variant="secondary" size="sm" onClick={reset} leftIcon={<RotateCcw />}>
          Reset to default
        </Button>
      </div>
    </BuilderControl>
  );
}

export function GradientControls(props: BackgroundControlsProps) {
  return <BackgroundControls {...props} />;
}
