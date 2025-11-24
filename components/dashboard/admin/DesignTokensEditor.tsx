import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { DesignTokens } from '../../../types';
import { Palette, Type, Maximize2, Cloud, Sparkles, Monitor, Save, RotateCcw, Check, AlertCircle, Wand2 } from 'lucide-react';
import { applyTokensToFullProject } from '../../../utils/designTokenApplier';

const DesignTokensEditor: React.FC = () => {
  const { designTokens, updateDesignTokens, projects, currentProject, updateProject } = useEditor();
  
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(localTokens) !== JSON.stringify(designTokens);
    setHasChanges(changed);
  }, [localTokens, designTokens]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDesignTokens(localTokens);
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving design tokens:', error);
      alert('Error al guardar los tokens. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Resetear todos los cambios?')) {
      setLocalTokens(designTokens);
    }
  };

  const handleApplyToAllComponents = async () => {
    if (!currentProject) {
      alert('Por favor selecciona un proyecto primero.');
      return;
    }

    if (!window.confirm(
      `¿Aplicar Design Tokens a todos los componentes del proyecto "${currentProject.name}"?\n\nEsto actualizará los estilos de todos los componentes para usar los tokens globales.`
    )) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedProject = applyTokensToFullProject(currentProject, localTokens);
      await updateProject(updatedProject);
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
            {currentProject && (
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
            {hasChanges && (
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
              disabled={isSaving || !hasChanges}
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
        {hasChanges && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-medium">Unsaved Changes</p>
              <p className="text-amber-700 text-sm mt-1">
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
                    value={localTokens.colors.primary.main}
                    onChange={(v) => updateColor('primary', 'main', v)}
                  />
                  <ColorInput
                    label="Light"
                    value={localTokens.colors.primary.light}
                    onChange={(v) => updateColor('primary', 'light', v)}
                  />
                  <ColorInput
                    label="Dark"
                    value={localTokens.colors.primary.dark}
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
                    value={localTokens.colors.secondary.main}
                    onChange={(v) => updateColor('secondary', 'main', v)}
                  />
                  <ColorInput
                    label="Light"
                    value={localTokens.colors.secondary.light}
                    onChange={(v) => updateColor('secondary', 'light', v)}
                  />
                  <ColorInput
                    label="Dark"
                    value={localTokens.colors.secondary.dark}
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
                      value={localTokens.colors.success.main}
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
                      value={localTokens.colors.warning.main}
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
                      value={localTokens.colors.error.main}
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
                      value={localTokens.colors.info.main}
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
        </div>
      </div>
    </div>
  );
};

export default DesignTokensEditor;

