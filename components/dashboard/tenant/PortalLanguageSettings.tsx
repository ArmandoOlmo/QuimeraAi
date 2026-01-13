/**
 * Portal Language Settings
 * Configure default language and translation options for white-label portal
 */

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          {t('portalLanguageSettings.title')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('portalLanguageSettings.description')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">{t('portalLanguageSettings.saved')}</h4>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">{t('portalLanguageSettings.error')}</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Language Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Radio Circle */}
                <div className="mt-1">
                  {isSelected ? (
                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>

                {/* Flag */}
                <div className="text-3xl">{lang.flag}</div>

                {/* Language Info */}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">
                    {lang.nativeName}
                  </div>
                  <div className="text-sm text-gray-600">{lang.name}</div>
                </div>

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto-Translate Option */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          {/* Toggle */}
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              autoTranslate ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoTranslate ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          {/* Description */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Languages className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">
                {t('portalLanguageSettings.autoTranslateTitle')}
              </h4>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                {t('portalLanguageSettings.autoTranslateBadge')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {t('portalLanguageSettings.autoTranslateDescription')}
            </p>

            {/* Feature List */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>{t('portalLanguageSettings.autoTranslateFeature1')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>{t('portalLanguageSettings.autoTranslateFeature2')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>{t('portalLanguageSettings.autoTranslateFeature3')}</span>
              </div>
            </div>

            {/* Warning */}
            {autoTranslate && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>{t('portalLanguageSettings.autoTranslateWarning')}</strong> {t('portalLanguageSettings.autoTranslateWarningText')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Language Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          {t('portalLanguageSettings.previewTitle')}
        </h4>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div>
                  <div className="font-semibold text-gray-900">
                    {currentTenant?.name || 'Tu Empresa'}
                  </div>
                  <div className="text-sm text-gray-600">
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

            <div className="text-sm text-gray-600">
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
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            disabled={isSaving}
          >
            {t('portalLanguageSettings.cancelButton')}
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center gap-2"
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
