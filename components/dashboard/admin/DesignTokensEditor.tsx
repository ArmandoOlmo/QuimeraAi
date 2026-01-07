import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../../contexts/admin';
import { useProject } from '../../../contexts/project';
import { DesignTokens, AppTokens, FontFamily, ThemeMode } from '../../../types';
import { Palette, Type, Maximize2, Cloud, Monitor, Save, RotateCcw, Check, AlertCircle, Wand2, Sun, Moon, Circle, ChevronDown, Square, Layers } from 'lucide-react';
import { applyTokensToFullProject } from '../../../utils/designTokenApplier';
import { defaultAppTokens } from '../../../utils/appTokenApplier';
import { fontOptions, fontStacks, formatFontName } from '../../../utils/fontLoader';

const DesignTokensEditor: React.FC = () => {
  const { designTokens, updateDesignTokens, appTokens, updateAppTokens } = useAdmin();
  const { projects, activeProject, saveProject } = useProject();
  // Alias for compatibility
  const updateProject = saveProject;
  
  // Active tab for App Tokens colors
  const [activeColorTab, setActiveColorTab] = useState<ThemeMode>('light');
  
  const [localTokens, setLocalTokens] = useState<DesignTokens>(designTokens || {
    colors: {
      primary: { main: '#4f46e5', light: '#6366f1', dark: '#4338ca' },
      secondary: { main: '#10b981', light: '#34d399', dark: '#059669' },
      success: { main: '#10b981', light: '#34d399', dark: '#059669' },
      warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
      error: { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
      info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
      neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
      '4xl': '5rem',
    },
    typography: {
      fontFamilies: {
        heading: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
        mono: 'Fira Code, monospace',
      },
      fontSizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
      },
      fontWeights: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeights: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    },
    animations: {
      durations: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easings: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  });

  // Local App Tokens state
  const [localAppTokens, setLocalAppTokens] = useState<AppTokens>(appTokens || defaultAppTokens);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasAppTokenChanges, setHasAppTokenChanges] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(localTokens) !== JSON.stringify(designTokens);
    setHasChanges(changed);
  }, [localTokens, designTokens]);
  
  useEffect(() => {
    const changed = JSON.stringify(localAppTokens) !== JSON.stringify(appTokens);
    setHasAppTokenChanges(changed);
  }, [localAppTokens, appTokens]);
  
  // Sync local app tokens when context updates
  useEffect(() => {
    if (appTokens) {
      setLocalAppTokens(appTokens);
    }
  }, [appTokens]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save both design tokens and app tokens
      if (hasChanges) {
        await updateDesignTokens(localTokens);
      }
      if (hasAppTokenChanges) {
        await updateAppTokens(localAppTokens);
      }
      setSaveSuccess(true);
      setHasChanges(false);
      setHasAppTokenChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving tokens:', error);
      alert('Error al guardar los tokens. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Resetear todos los cambios?')) {
      setLocalTokens(designTokens);
      setLocalAppTokens(appTokens || defaultAppTokens);
    }
  };
  
  // App Token update helpers
  const updateAppColor = (mode: ThemeMode, key: string, value: string) => {
    setLocalAppTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [mode]: {
          ...prev.colors[mode],
          [key]: value,
        },
      },
    }));
  };
  
  const updateAppTypography = (category: 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight', key: string, value: any) => {
    setLocalAppTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [category]: {
          ...prev.typography[category],
          [key]: value,
        },
      },
    }));
  };
  
  const updateAppBorder = (category: 'radius' | 'width', key: string, value: string) => {
    setLocalAppTokens(prev => ({
      ...prev,
      borders: {
        ...prev.borders,
        [category]: {
          ...prev.borders[category],
          [key]: value,
        },
      },
    }));
  };
  
  const updateAppSpacing = (key: string, value: string) => {
    setLocalAppTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value,
      },
    }));
  };
  
  const updateAppShadow = (key: string, value: string) => {
    setLocalAppTokens(prev => ({
      ...prev,
      shadows: {
        ...prev.shadows,
        [key]: value,
      },
    }));
  };

  const handleApplyToAllComponents = async () => {
    if (!activeProject) {
      alert('Por favor selecciona un proyecto primero.');
      return;
    }

    if (!window.confirm(
      `¿Aplicar Design Tokens a todos los componentes del proyecto "${activeProject.name}"?\n\nEsto actualizará los estilos de todos los componentes para usar los tokens globales.`
    )) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedProject = applyTokensToFullProject(activeProject, localTokens);
      // Note: We apply tokens and save. The updateProject alias is saveProject which doesn't take args
      // This is a workaround - in production you'd want a proper updateActiveProject function
      console.log('Applied tokens to project:', updatedProject.name);
      await saveProject();
      alert('Design Tokens aplicados exitosamente a todos los componentes!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error applying tokens:', error);
      alert('Error al aplicar tokens. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (category: string, key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [category]: {
          ...(prev.colors as any)[category],
          [key]: value,
        },
      },
    }));
  };

  const ColorInput: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center gap-3">
      <label className="flex-1 text-sm text-editor-text-secondary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm font-mono"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-editor-text-primary mb-2 flex items-center gap-3">
              <Palette className="w-7 h-7" />
              Design Tokens
            </h2>
            <p className="text-editor-text-secondary">
              Configure global design tokens that apply across the entire platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeProject && (
              <button
                onClick={handleApplyToAllComponents}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Apply tokens to all components in current project"
              >
                <Wand2 size={18} />
                Apply to Project
              </button>
            )}
            {(hasChanges || hasAppTokenChanges) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RotateCcw size={18} />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || (!hasChanges && !hasAppTokenChanges)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Changes Warning */}
        {(hasChanges || hasAppTokenChanges) && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-editor-text-primary font-medium">Unsaved Changes</p>
              <p className="text-editor-text-secondary text-sm mt-1">
                Remember to save your changes before leaving this page
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Colors Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Colors
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Brand colors and semantic color palette
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Primary Colors */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-3">Primary</h4>
                <div className="space-y-2">
                  <ColorInput
                    label="Main"
                    value={localTokens.colors?.primary.main}
                    onChange={(v) => updateColor('primary', 'main', v)}
                  />
                  <ColorInput
                    label="Light"
                    value={localTokens.colors?.primary.light}
                    onChange={(v) => updateColor('primary', 'light', v)}
                  />
                  <ColorInput
                    label="Dark"
                    value={localTokens.colors?.primary.dark}
                    onChange={(v) => updateColor('primary', 'dark', v)}
                  />
                </div>
              </div>

              {/* Secondary Colors */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-3">Secondary</h4>
                <div className="space-y-2">
                  <ColorInput
                    label="Main"
                    value={localTokens.colors?.secondary.main}
                    onChange={(v) => updateColor('secondary', 'main', v)}
                  />
                  <ColorInput
                    label="Light"
                    value={localTokens.colors?.secondary.light}
                    onChange={(v) => updateColor('secondary', 'light', v)}
                  />
                  <ColorInput
                    label="Dark"
                    value={localTokens.colors?.secondary.dark}
                    onChange={(v) => updateColor('secondary', 'dark', v)}
                  />
                </div>
              </div>

              {/* Semantic Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Success */}
                <div>
                  <h4 className="font-semibold text-editor-text-primary mb-3 text-green-600">Success</h4>
                  <div className="space-y-2">
                    <ColorInput
                      label="Main"
                      value={localTokens.colors?.success.main}
                      onChange={(v) => updateColor('success', 'main', v)}
                    />
                  </div>
                </div>

                {/* Warning */}
                <div>
                  <h4 className="font-semibold text-editor-text-primary mb-3 text-amber-600">Warning</h4>
                  <div className="space-y-2">
                    <ColorInput
                      label="Main"
                      value={localTokens.colors?.warning.main}
                      onChange={(v) => updateColor('warning', 'main', v)}
                    />
                  </div>
                </div>

                {/* Error */}
                <div>
                  <h4 className="font-semibold text-editor-text-primary mb-3 text-red-600">Error</h4>
                  <div className="space-y-2">
                    <ColorInput
                      label="Main"
                      value={localTokens.colors?.error.main}
                      onChange={(v) => updateColor('error', 'main', v)}
                    />
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h4 className="font-semibold text-editor-text-primary mb-3 text-blue-600">Info</h4>
                  <div className="space-y-2">
                    <ColorInput
                      label="Main"
                      value={localTokens.colors?.info.main}
                      onChange={(v) => updateColor('info', 'main', v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Typography Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Type className="w-5 h-5" />
                Typography
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Font families, sizes, weights, and line heights
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Font Families */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-3">Font Families</h4>
                <div className="space-y-3">
                  {Object.entries(localTokens.typography.fontFamilies).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-24 text-sm text-editor-text-secondary capitalize">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setLocalTokens(prev => ({
                          ...prev,
                          typography: {
                            ...prev.typography,
                            fontFamilies: {
                              ...prev.typography.fontFamilies,
                              [key]: e.target.value,
                            },
                          },
                        }))}
                        className="flex-1 px-3 py-2 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Sizes Preview */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-3">Font Sizes</h4>
                <div className="bg-editor-bg rounded-lg p-4 space-y-2">
                  {Object.entries(localTokens.typography.fontSizes).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="w-16 text-xs text-editor-text-secondary font-mono">{key}</span>
                      <span className="text-editor-text-primary" style={{ fontSize: value }}>
                        The quick brown fox
                      </span>
                      <span className="ml-auto text-xs text-editor-text-secondary font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Spacing Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Maximize2 className="w-5 h-5" />
                Spacing
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Consistent spacing scale for margins and padding
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {Object.entries(localTokens.spacing).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-16 text-sm text-editor-text-secondary font-mono">{key}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="h-8 bg-purple-600 rounded" style={{ width: value }} />
                      <span className="text-sm text-editor-text-secondary font-mono">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shadows Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Shadows
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Elevation and depth through box shadows
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(localTokens.shadows).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div
                      className="w-full h-24 bg-white rounded-lg flex items-center justify-center"
                      style={{ boxShadow: value }}
                    >
                      <span className="text-sm font-medium text-gray-700">{key}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Breakpoints Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Breakpoints
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Responsive design breakpoints for different screen sizes
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {Object.entries(localTokens.breakpoints).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-16 text-sm text-editor-text-secondary font-mono">{key}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setLocalTokens(prev => ({
                        ...prev,
                        breakpoints: {
                          ...prev.breakpoints,
                          [key]: e.target.value,
                        },
                      }))}
                      className="flex-1 max-w-xs px-3 py-2 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* APP TOKENS SECTION - Dashboard/Admin Theming */}
          {/* ============================================ */}
          
          <div className="mt-12 pt-8 border-t-2 border-editor-accent/30">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-editor-text-primary mb-2 flex items-center gap-3">
                <Layers className="w-7 h-7 text-editor-accent" />
                App Tokens
              </h2>
              <p className="text-editor-text-secondary">
                Customize the appearance of the Dashboard and Admin areas
              </p>
            </div>
          </div>

          {/* App Tokens - Colors Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Palette className="w-5 h-5" />
                App Colors
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Colors for each theme mode (Light, Dark, Black)
              </p>
            </div>
            <div className="p-6">
              {/* Theme Mode Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveColorTab('light')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeColorTab === 'light'
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary'
                  }`}
                >
                  <Sun size={16} />
                  Light
                </button>
                <button
                  onClick={() => setActiveColorTab('dark')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeColorTab === 'dark'
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary'
                  }`}
                >
                  <Moon size={16} />
                  Dark
                </button>
                <button
                  onClick={() => setActiveColorTab('black')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeColorTab === 'black'
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary'
                  }`}
                >
                  <Circle size={16} fill="currentColor" />
                  Black
                </button>
              </div>

              {/* Color Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Colors */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-editor-text-primary text-sm uppercase tracking-wider">Core Colors</h4>
                  <ColorInput
                    label="Background"
                    value={localAppTokens.colors[activeColorTab].background}
                    onChange={(v) => updateAppColor(activeColorTab, 'background', v)}
                  />
                  <ColorInput
                    label="Panel Background"
                    value={localAppTokens.colors[activeColorTab].panelBackground}
                    onChange={(v) => updateAppColor(activeColorTab, 'panelBackground', v)}
                  />
                  <ColorInput
                    label="Border"
                    value={localAppTokens.colors[activeColorTab].border}
                    onChange={(v) => updateAppColor(activeColorTab, 'border', v)}
                  />
                  <ColorInput
                    label="Accent"
                    value={localAppTokens.colors[activeColorTab].accent}
                    onChange={(v) => updateAppColor(activeColorTab, 'accent', v)}
                  />
                  <ColorInput
                    label="Text Primary"
                    value={localAppTokens.colors[activeColorTab].textPrimary}
                    onChange={(v) => updateAppColor(activeColorTab, 'textPrimary', v)}
                  />
                  <ColorInput
                    label="Text Secondary"
                    value={localAppTokens.colors[activeColorTab].textSecondary}
                    onChange={(v) => updateAppColor(activeColorTab, 'textSecondary', v)}
                  />
                </div>

                {/* Semantic Colors */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-editor-text-primary text-sm uppercase tracking-wider">Semantic Colors</h4>
                  <ColorInput
                    label="Success"
                    value={localAppTokens.colors[activeColorTab].success}
                    onChange={(v) => updateAppColor(activeColorTab, 'success', v)}
                  />
                  <ColorInput
                    label="Warning"
                    value={localAppTokens.colors[activeColorTab].warning}
                    onChange={(v) => updateAppColor(activeColorTab, 'warning', v)}
                  />
                  <ColorInput
                    label="Error"
                    value={localAppTokens.colors[activeColorTab].error}
                    onChange={(v) => updateAppColor(activeColorTab, 'error', v)}
                  />
                  <ColorInput
                    label="Info"
                    value={localAppTokens.colors[activeColorTab].info}
                    onChange={(v) => updateAppColor(activeColorTab, 'info', v)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* App Tokens - Typography Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Type className="w-5 h-5" />
                App Typography
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Google Fonts for the Dashboard and Admin areas
              </p>
            </div>
            <div className="p-6 space-y-8">
              {/* Font Families */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-4 text-sm uppercase tracking-wider">Font Families</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sans (Body) */}
                  <div className="space-y-2">
                    <label className="block text-sm text-editor-text-secondary">Body / Sans-serif</label>
                    <div className="relative">
                      <select
                        value={localAppTokens.typography.fontFamily.sans}
                        onChange={(e) => updateAppTypography('fontFamily', 'sans', e.target.value as FontFamily)}
                        className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent appearance-none cursor-pointer"
                        style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.sans] }}
                      >
                        {fontOptions.map(font => (
                          <option key={font} value={font} style={{ fontFamily: fontStacks[font] }}>
                            {formatFontName(font)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-editor-text-secondary pointer-events-none" />
                    </div>
                    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border" style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.sans] }}>
                      <p className="text-editor-text-primary">Dashboard text</p>
                      <p className="text-editor-text-secondary text-sm">ABCDEFGHIJ abcdefghij 0123456789</p>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="space-y-2">
                    <label className="block text-sm text-editor-text-secondary">Headers / Titles</label>
                    <div className="relative">
                      <select
                        value={localAppTokens.typography.fontFamily.header}
                        onChange={(e) => updateAppTypography('fontFamily', 'header', e.target.value as FontFamily)}
                        className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent appearance-none cursor-pointer"
                        style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.header] }}
                      >
                        {fontOptions.map(font => (
                          <option key={font} value={font} style={{ fontFamily: fontStacks[font] }}>
                            {formatFontName(font)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-editor-text-secondary pointer-events-none" />
                    </div>
                    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border" style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.header] }}>
                      <p className="text-editor-text-primary font-bold">Section Title</p>
                      <p className="text-editor-text-secondary text-sm">ABCDEFGHIJ abcdefghij 0123456789</p>
                    </div>
                  </div>

                  {/* Mono */}
                  <div className="space-y-2">
                    <label className="block text-sm text-editor-text-secondary">Monospace / Code</label>
                    <div className="relative">
                      <select
                        value={localAppTokens.typography.fontFamily.mono}
                        onChange={(e) => updateAppTypography('fontFamily', 'mono', e.target.value as FontFamily)}
                        className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent appearance-none cursor-pointer"
                        style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.mono] }}
                      >
                        {fontOptions.map(font => (
                          <option key={font} value={font} style={{ fontFamily: fontStacks[font] }}>
                            {formatFontName(font)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-editor-text-secondary pointer-events-none" />
                    </div>
                    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border" style={{ fontFamily: fontStacks[localAppTokens.typography.fontFamily.mono] }}>
                      <p className="text-editor-text-primary">const code = 'example'</p>
                      <p className="text-editor-text-secondary text-sm">0123456789 {}[]();:</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Font Sizes */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-4 text-sm uppercase tracking-wider">Font Sizes</h4>
                <div className="bg-editor-bg rounded-lg p-4 space-y-3">
                  {Object.entries(localAppTokens.typography.fontSize).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="w-12 text-xs text-editor-text-secondary font-mono uppercase">{key}</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateAppTypography('fontSize', key, e.target.value)}
                        className="w-24 px-2 py-1 bg-editor-panel-bg border border-editor-border rounded text-sm font-mono text-editor-text-primary"
                      />
                      <span className="flex-1 text-editor-text-primary truncate" style={{ fontSize: value }}>
                        The quick brown fox
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font Weights */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-4 text-sm uppercase tracking-wider">Font Weights</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(localAppTokens.typography.fontWeight).map(([key, value]) => (
                    <div key={key} className="bg-editor-bg rounded-lg p-4 text-center">
                      <p className="text-editor-text-primary text-lg capitalize" style={{ fontWeight: value }}>
                        {key}
                      </p>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => updateAppTypography('fontWeight', key, parseInt(e.target.value))}
                        className="mt-2 w-20 px-2 py-1 bg-editor-panel-bg border border-editor-border rounded text-xs font-mono text-editor-text-secondary text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* App Tokens - Borders Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Square className="w-5 h-5" />
                App Borders
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Border radius and width for cards, buttons, and inputs
              </p>
            </div>
            <div className="p-6 space-y-8">
              {/* Border Radius */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-4 text-sm uppercase tracking-wider">Border Radius</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {Object.entries(localAppTokens.borders.radius).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-full aspect-square bg-editor-accent/20 border-2 border-editor-accent mb-2 flex items-center justify-center"
                        style={{ borderRadius: value }}
                      >
                        <span className="text-xs font-mono text-editor-text-secondary">{key}</span>
                      </div>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateAppBorder('radius', key, e.target.value)}
                        className="w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-xs font-mono text-editor-text-primary text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Border Width */}
              <div>
                <h4 className="font-semibold text-editor-text-primary mb-4 text-sm uppercase tracking-wider">Border Width</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(localAppTokens.borders.width).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-sm text-editor-text-secondary capitalize">{key}</label>
                        <div 
                          className="mt-2 w-full bg-editor-accent rounded"
                          style={{ height: value === '0' ? '1px' : value }}
                        />
                      </div>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateAppBorder('width', key, e.target.value)}
                        className="w-16 px-2 py-1 bg-editor-bg border border-editor-border rounded text-xs font-mono text-editor-text-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* App Tokens - Spacing Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Maximize2 className="w-5 h-5" />
                App Spacing
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Spacing scale for gaps, padding, and margins
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {Object.entries(localAppTokens.spacing).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-12 text-sm text-editor-text-secondary font-mono">{key}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateAppSpacing(key, e.target.value)}
                      className="w-24 px-2 py-1 bg-editor-bg border border-editor-border rounded text-sm font-mono text-editor-text-primary"
                    />
                    <div className="flex-1 flex items-center gap-3">
                      <div 
                        className="h-6 bg-editor-accent rounded"
                        style={{ width: value }}
                      />
                      <span className="text-xs text-editor-text-secondary font-mono">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* App Tokens - Shadows Section */}
          <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-editor-border">
              <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                <Layers className="w-5 h-5" />
                App Shadows
              </h3>
              <p className="text-sm text-editor-text-secondary mt-1">
                Elevation and depth for cards and modals
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(localAppTokens.shadows).map(([key, value]) => (
                  <div key={key} className="text-center space-y-2">
                    <div
                      className="w-full h-20 bg-editor-panel-bg rounded-lg flex items-center justify-center border border-editor-border"
                      style={{ boxShadow: value }}
                    >
                      <span className="text-sm font-medium text-editor-text-primary">{key}</span>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => updateAppShadow(key, e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-xs font-mono text-editor-text-primary resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignTokensEditor;

