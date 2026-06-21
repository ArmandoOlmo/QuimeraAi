/**
 * Portal Language Settings
 * Configure default language and translation options for white-label portal
 */

import React, { useState } from 'react';
import { doc, updateDoc } from '@/utils/compatData';
import { db } from '@/utils/compatData';
import { useTenant } from '@/contexts/tenant/TenantContext';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Languages,
  Sparkles,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  formatLanguageName,
  usePortalTranslation,
} from '@/hooks/usePortalTranslation';

// ============================================================================
// TYPES
// ============================================================================

interface PortalLanguageSettingsProps {
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PortalLanguageSettings({
  className = '',
}: PortalLanguageSettingsProps) {
  const { currentTenant } = useTenant();
  const { t } = usePortalTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    (currentTenant?.settings?.portalLanguage as SupportedLanguage) || 'es'
  );
  const [autoTranslate, setAutoTranslate] = useState(
    currentTenant?.settings?.autoTranslateContent || false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const tenantRef = doc(db, 'tenants', currentTenant.id);

      await updateDoc(tenantRef, {
        'settings.portalLanguage': selectedLanguage,
        'settings.autoTranslateContent': autoTranslate,
        updatedAt: new Date(),
      });

      setSuccessMessage(t('portalLanguageSettings.successMessage'));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating language settings:', err);
      setError(t('portalLanguageSettings.errorMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedLanguage !== currentTenant?.settings?.portalLanguage ||
    autoTranslate !== currentTenant?.settings?.autoTranslateContent;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-q-text flex items-center gap-2">
          <Globe className="h-5 w-5 text-q-accent" />
          {t('portalLanguageSettings.title')}
        </h3>
        <p className="text-sm text-q-text-muted mt-1">
          {t('portalLanguageSettings.description')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-q-success/10 border border-q-success/25 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-q-success mt-0.5" />
          <div>
            <h4 className="font-semibold text-q-success">{t('portalLanguageSettings.saved')}</h4>
            <p className="text-sm text-q-success">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-q-error/10 border border-q-error/25 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-q-error mt-0.5" />
          <div>
            <h4 className="font-semibold text-q-error">{t('portalLanguageSettings.error')}</h4>
            <p className="text-sm text-q-error">{error}</p>
          </div>
        </div>
      )}

      {/* Language Selection */}
      <div className="bg-q-surface border border-q-border rounded-lg p-6">
        <label className="block text-sm font-medium text-q-text mb-4">
          {t('portalLanguageSettings.defaultLanguageLabel')}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;

            return (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`relative flex items-start gap-4 p-4 border-2 rounded-lg transition-all ${
                  isSelected
                    ? 'border-q-accent/25 bg-q-accent/10'
                    : 'border-q-border hover:border-q-border bg-q-surface'
                }`}
              >
                {/* Radio Circle */}
                <div className="mt-1">
                  {isSelected ? (
                    <div className="h-5 w-5 rounded-full bg-q-accent flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-q-surface" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-q-border" />
                  )}
                </div>

                {/* Flag */}
                <div className="text-3xl">{lang.flag}</div>

                {/* Language Info */}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-q-text">
                    {lang.nativeName}
                  </div>
                  <div className="text-sm text-q-text-muted">{lang.name}</div>
                </div>

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-q-accent" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto-Translate Option */}
      <div className="bg-q-surface border border-q-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          {/* Toggle */}
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-q-accent/35 focus:ring-offset-2 ${
              autoTranslate ? 'bg-q-accent' : 'bg-q-border'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-q-surface shadow ring-0 transition duration-200 ease-in-out ${
                autoTranslate ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Description */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Languages className="h-5 w-5 text-q-accent" />
              <h4 className="font-semibold text-q-text">
                {t('portalLanguageSettings.autoTranslateTitle')}
              </h4>
              <span className="px-2 py-0.5 bg-q-accent/10 text-q-accent text-xs font-semibold rounded">
                {t('portalLanguageSettings.autoTranslateBadge')}
              </span>
            </div>
            <p className="text-sm text-q-text-muted mb-3">
              {t('portalLanguageSettings.autoTranslateDescription')}
            </p>

            {/* Feature List */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-q-text">
                <Sparkles className="h-4 w-4 text-q-accent" />
                <span>{t('portalLanguageSettings.autoTranslateFeature1')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-q-text">
                <Sparkles className="h-4 w-4 text-q-accent" />
                <span>{t('portalLanguageSettings.autoTranslateFeature2')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-q-text">
                <Sparkles className="h-4 w-4 text-q-accent" />
                <span>{t('portalLanguageSettings.autoTranslateFeature3')}</span>
              </div>
            </div>

            {/* Warning */}
            {autoTranslate && (
              <div className="mt-4 p-3 bg-q-accent/10 border border-q-accent/25 rounded text-sm text-q-accent">
                <strong>{t('portalLanguageSettings.autoTranslateWarning')}</strong> {t('portalLanguageSettings.autoTranslateWarningText')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Language Preview */}
      <div className="bg-gradient-to-br from-q-accent to-q-accent border border-q-accent/25 rounded-lg p-6">
        <h4 className="font-semibold text-q-text mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-q-accent" />
          {t('portalLanguageSettings.previewTitle')}
        </h4>

        <div className="bg-q-surface rounded-lg p-6 border border-q-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-q-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-q-border rounded-full" />
                <div>
                  <div className="font-semibold text-q-text">
                    {currentTenant?.name || 'Tu Empresa'}
                  </div>
                  <div className="text-sm text-q-text-muted">
                    {formatLanguageName(selectedLanguage, 'native')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SUPPORTED_LANGUAGES.find(
                  (l) => l.code === selectedLanguage
                )?.flag}</span>
              </div>
            </div>

            <div className="text-sm text-q-text-muted">
              {t('portalLanguageSettings.previewDescription')}{' '}
              <strong>{formatLanguageName(selectedLanguage, 'native')}</strong>{' '}
              {t('portalLanguageSettings.previewDescriptionDefault')}
              {autoTranslate && ' ' + t('portalLanguageSettings.previewDescriptionWithTranslate')}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end gap-3 pt-4 border-t border-q-border">
          <button
            onClick={() => {
              setSelectedLanguage(
                (currentTenant?.settings?.portalLanguage as SupportedLanguage) ||
                  'es'
              );
              setAutoTranslate(
                currentTenant?.settings?.autoTranslateContent || false
              );
            }}
            className="px-6 py-2 border border-q-border text-q-text rounded-lg hover:bg-q-surface-overlay font-semibold"
            disabled={isSaving}
          >
            {t('portalLanguageSettings.cancelButton')}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent font-semibold disabled:opacity-50 flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('portalLanguageSettings.saving')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {t('portalLanguageSettings.saveButton')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
