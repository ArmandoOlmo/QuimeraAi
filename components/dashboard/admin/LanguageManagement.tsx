import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, Plus, Edit2, Trash2, Download, Upload, Save, AlertCircle, ArrowLeft, Menu, X } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';

import { useLanguage } from '../../../contexts/LanguageContext';

interface LanguageManagementProps {
  onBack: () => void;
}

const LanguageManagement: React.FC<LanguageManagementProps> = ({ onBack }) => {
  const { i18n, t } = useTranslation();
  const { languages, updateLanguageConfig } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [editingTranslations, setEditingTranslations] = useState<Record<string, string>>({});
  const [searchKey, setSearchKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cambiar idioma por defecto
  const handleSetDefault = (code: string) => {
    const newConfig = languages.map(lang => ({
      ...lang,
      isDefault: lang.code === code
    }));
    updateLanguageConfig(newConfig);
    setSaveStatus('idle');
  };

  // Activar/desactivar idioma
  const handleToggleEnabled = (code: string) => {
    const lang = languages.find(l => l.code === code);

    // No permitir desactivar el idioma por defecto
    if (lang?.isDefault && lang.enabled) {
      alert(t('superadmin.cannotDisableDefault'));
      return;
    }

    const newConfig = languages.map(lang =>
      lang.code === code ? { ...lang, enabled: !lang.enabled } : lang
    );
    updateLanguageConfig(newConfig);
    setSaveStatus('idle');
  };

  // Guardar configuración (Simulado por ahora ya que updateLanguageConfig guarda directamente)
  // En una implementación real, updateLanguageConfig podría ser solo local y este save persistiría
  // Pero como updateLanguageConfig ya persiste a Firestore, este botón podría ser redundante o para feedback visual
  const handleSave = async () => {
    setSaveStatus('saving');

    try {
      // Como updateLanguageConfig ya guarda en Firestore cada cambio, 
      // aquí solo simulamos un "guardado final" o forzamos una actualización si fuera necesario.
      // Para mantener la UX, podemos simplemente mostrar éxito.
      await new Promise(resolve => setTimeout(resolve, 500));

      // Actualizar idioma actual si es necesario
      const defaultLang = languages.find(l => l.isDefault);
      if (defaultLang && !languages.find(l => l.code === i18n.language)?.enabled) {
        i18n.changeLanguage(defaultLang.code);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving language config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const enabledLanguages = languages.filter(l => l.enabled);
  const availableLanguages = languages.filter(l => !l.enabled);

  // Handle export all translations
  const handleExportAll = async () => {
    try {
      const allTranslations: Record<string, Record<string, unknown>> = {};
      
      for (const lang of enabledLanguages) {
        try {
          // Get translations from i18n resources
          const resources = i18n.getResourceBundle(lang.code, 'translation');
          if (resources) {
            allTranslations[lang.code] = resources;
          }
        } catch (e) {
          console.warn(`Could not load translations for ${lang.code}:`, e);
        }
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(allTranslations, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting translations:', error);
      alert(t('superadmin.exportError', 'Error al exportar traducciones'));
    }
  };

  // Handle import translations
  const handleImportTranslations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);

        // Validate structure
        if (typeof imported !== 'object') {
          throw new Error('Invalid format');
        }

        // Add translations to i18n
        Object.entries(imported).forEach(([langCode, translations]) => {
          if (typeof translations === 'object' && translations !== null) {
            i18n.addResourceBundle(langCode, 'translation', translations, true, true);
          }
        });

        alert(t('superadmin.importSuccess', 'Traducciones importadas correctamente. Los cambios son temporales hasta que se guarden en el servidor.'));
      } catch (error) {
        console.error('Error importing translations:', error);
        alert(t('superadmin.importError', 'Error al importar. Verifica que el archivo tenga el formato correcto.'));
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle edit translations
  const handleEditTranslations = (langCode: string) => {
    try {
      const resources = i18n.getResourceBundle(langCode, 'translation');
      if (resources) {
        // Flatten nested object to dot notation for easier editing
        const flattened = flattenObject(resources);
        setEditingTranslations(flattened);
        setEditingLang(langCode);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error loading translations for editing:', error);
      alert(t('superadmin.loadError', 'Error al cargar traducciones'));
    }
  };

  // Flatten nested object to dot notation
  const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {};
    
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
    
    return result;
  };

  // Unflatten dot notation back to nested object
  const unflattenObject = (obj: Record<string, string>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    
    for (const key in obj) {
      const keys = key.split('.');
      let current: Record<string, unknown> = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = obj[key];
    }
    
    return result;
  };

  // Save edited translations
  const handleSaveTranslations = () => {
    if (!editingLang) return;

    try {
      const unflattened = unflattenObject(editingTranslations);
      i18n.addResourceBundle(editingLang, 'translation', unflattened, true, true);
      setShowEditModal(false);
      setEditingLang(null);
      setEditingTranslations({});
      setSearchKey('');
      alert(t('superadmin.translationsSaved', 'Traducciones actualizadas. Los cambios son temporales hasta que se guarden en el servidor.'));
    } catch (error) {
      console.error('Error saving translations:', error);
      alert(t('superadmin.saveError', 'Error al guardar traducciones'));
    }
  };

  // Filter translations by search
  const filteredTranslations = Object.entries(editingTranslations).filter(([key, value]) => 
    key.toLowerCase().includes(searchKey.toLowerCase()) || 
    value.toLowerCase().includes(searchKey.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-editor-bg text-editor-text-primary">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2 transition-colors"
              title={t('common.openMenu')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Globe className="text-editor-accent w-5 h-5" />
              <div>
                <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.languageManagement')}</h1>
                <p className="text-xs text-editor-text-secondary hidden sm:block">{t('superadmin.configurePlatformLanguages')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('superadmin.backToAdmin')}
            </button>
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <Check size={16} />
                <span>{t('superadmin.savedSuccessfully')}</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span>{t('superadmin.errorSaving')}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveStatus === 'saving' ? t('superadmin.saving') : t('common.save')}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Current Language Selector */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.currentInterfaceLanguage')}</h2>
                  <p className="text-sm text-editor-text-secondary mt-1">
                    {t('superadmin.currentAdminInterface')}
                  </p>
                </div>
                <div className="text-3xl">{languages.find(l => l.code === i18n.language)?.flag}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                {enabledLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`px-4 py-2 transition-colors ${i18n.language === lang.code
                      ? 'text-editor-accent font-semibold'
                      : 'text-editor-text-secondary hover:text-editor-text-primary'
                      }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            </div>

            {/* Enabled Languages */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-editor-text-primary mb-4">
                {t('superadmin.enabledLanguages')} ({enabledLanguages.length})
              </h2>
              <p className="text-sm text-editor-text-secondary mb-6">
                {t('superadmin.languagesAvailableToUsers')}
              </p>

              <div className="space-y-3">
                {enabledLanguages.map(lang => (
                  <div
                    key={lang.code}
                    className="bg-editor-bg border border-editor-border rounded-lg p-4 hover:border-editor-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-3xl">{lang.flag}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-editor-text-primary">
                              {lang.nativeName}
                            </h3>
                            <span className="text-sm text-editor-text-secondary">({lang.name})</span>
                            {lang.isDefault && (
                              <span className="text-xs text-editor-accent font-semibold">
                                {t('superadmin.default')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 bg-editor-border rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-green-500 h-full transition-all"
                                style={{ width: `${lang.completeness}%` }}
                              />
                            </div>
                            <span className="text-sm text-editor-text-secondary">
                              {lang.completeness}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!lang.isDefault && (
                          <button
                            onClick={() => handleSetDefault(lang.code)}
                            className="px-3 py-1.5 text-sm bg-editor-border hover:bg-editor-bg-secondary text-editor-text-secondary rounded-lg transition-colors"
                          >
                            {t('superadmin.setAsDefault')}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleEnabled(lang.code)}
                          disabled={lang.isDefault}
                          className="px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('superadmin.disable')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Languages */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-editor-text-primary mb-4">
                {t('superadmin.availableLanguages')} ({availableLanguages.length})
              </h2>
              <p className="text-sm text-editor-text-secondary mb-6">
                {t('superadmin.enableLanguagesToMakeAvailable')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableLanguages.map(lang => (
                  <div
                    key={lang.code}
                    className="bg-editor-bg border border-editor-border rounded-lg p-4 hover:border-editor-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <h3 className="font-semibold text-editor-text-primary">
                            {lang.nativeName}
                          </h3>
                          <span className="text-sm text-editor-text-secondary">{lang.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleEnabled(lang.code)}
                        className="px-3 py-1.5 text-sm text-editor-accent hover:text-editor-accent-hover transition-colors font-semibold"
                      >
                        {t('superadmin.enable')}
                      </button>
                    </div>
                    {lang.completeness === 0 && (
                      <div className="mt-3 flex items-center gap-2 text-yellow-500 text-xs">
                        <AlertCircle size={14} />
                        <span>{t('superadmin.translationFileNotAvailable')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Translation Management */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-editor-text-primary mb-4">
                {t('superadmin.translationManagement')}
              </h2>
              <p className="text-sm text-editor-text-secondary mb-6">
                {t('superadmin.importExportTranslations')}
              </p>

              <div className="flex flex-wrap gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportTranslations}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors"
                >
                  <Upload size={16} />
                  {t('superadmin.importTranslations')}
                </button>
                <button 
                  onClick={handleExportAll}
                  className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors"
                >
                  <Download size={16} />
                  {t('superadmin.exportAll')}
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      const currentLang = i18n.language;
                      handleEditTranslations(currentLang);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                    {t('superadmin.editTranslations')}
                  </button>
                </div>
              </div>

              {/* Quick edit buttons per language */}
              <div className="mt-4 pt-4 border-t border-editor-border">
                <p className="text-sm text-editor-text-secondary mb-3">{t('superadmin.editByLanguage', 'Editar por idioma:')}</p>
                <div className="flex flex-wrap gap-2">
                  {enabledLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleEditTranslations(lang.code)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-editor-bg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary rounded-lg text-sm transition-colors"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Translation Files Location */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-editor-text-primary mb-4">
                {t('superadmin.translationFiles')}
              </h2>
              <p className="text-sm text-editor-text-secondary mb-4">
                {t('superadmin.translationFilesStored')}
              </p>
              <div className="bg-editor-bg rounded-lg p-4 font-mono text-sm space-y-2">
                {enabledLanguages.map(lang => (
                  <div key={lang.code} className="flex items-center gap-2 text-editor-text-secondary">
                    <span className="text-editor-accent">{lang.flag}</span>
                    <code className="text-editor-text-primary">/locales/{lang.code}/translation.json</code>
                    <span className="ml-auto text-green-500 flex items-center gap-1">
                      <Check size={14} />
                      {t('superadmin.available')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">{t('superadmin.aboutLanguageManagement')}</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>{t('superadmin.usersCanSelectLanguage')}</li>
                    <li>{t('superadmin.defaultLanguageUsed')}</li>
                    <li>{t('superadmin.translationFilesLocation')} <code className="bg-black/20 px-1 rounded">/locales/[code]/</code></li>
                    <li>{t('superadmin.completenessShows')}</li>
                    <li>{t('superadmin.changesApplyImmediately')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Translations Modal */}
      {showEditModal && editingLang && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-editor-panel-bg border border-editor-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-editor-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{languages.find(l => l.code === editingLang)?.flag}</span>
                <h2 className="text-lg font-semibold text-editor-text-primary">
                  {t('superadmin.editingTranslations', 'Editando traducciones')} - {editingLang.toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLang(null);
                  setEditingTranslations({});
                  setSearchKey('');
                }}
                className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-editor-border">
              <input
                type="text"
                placeholder={t('superadmin.searchTranslations', 'Buscar por clave o valor...')}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
              />
              <p className="text-xs text-editor-text-secondary mt-2">
                {t('superadmin.translationsCount', 'Mostrando {{count}} de {{total}} traducciones', {
                  count: filteredTranslations.length,
                  total: Object.keys(editingTranslations).length
                })}
              </p>
            </div>

            {/* Translations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredTranslations.map(([key, value]) => (
                <div key={key} className="bg-editor-bg rounded-lg p-3 border border-editor-border">
                  <label className="block text-xs text-editor-text-secondary mb-1 font-mono">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setEditingTranslations(prev => ({
                      ...prev,
                      [key]: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                  />
                </div>
              ))}
              {filteredTranslations.length === 0 && (
                <div className="text-center py-8 text-editor-text-secondary">
                  {t('superadmin.noTranslationsFound', 'No se encontraron traducciones')}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-editor-border">
              <p className="text-sm text-editor-text-secondary">
                {t('superadmin.changesAreTemporary', 'Los cambios son temporales hasta guardar en el servidor')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingLang(null);
                    setEditingTranslations({});
                    setSearchKey('');
                  }}
                  className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  onClick={handleSaveTranslations}
                  className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors"
                >
                  <Save size={16} />
                  {t('superadmin.applyChanges', 'Aplicar cambios')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageManagement;

