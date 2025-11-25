import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, Plus, Edit2, Trash2, Download, Upload, Save, AlertCircle, ArrowLeft, Menu } from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';

interface LanguageManagementProps {
  onBack: () => void;
}

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  enabled: boolean;
  isDefault: boolean;
  completeness: number; // Porcentaje de traducciones completadas
}

const LanguageManagement: React.FC<LanguageManagementProps> = ({ onBack }) => {
  const { i18n, t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estado de idiomas disponibles
  const [languages, setLanguages] = useState<LanguageConfig[]>([
    { 
      code: 'es', 
      name: 'Spanish', 
      nativeName: 'Español',
      flag: '🇪🇸', 
      enabled: true, 
      isDefault: true,
      completeness: 100 
    },
    { 
      code: 'en', 
      name: 'English', 
      nativeName: 'English',
      flag: '🇺🇸', 
      enabled: true, 
      isDefault: false,
      completeness: 100 
    },
    { 
      code: 'fr', 
      name: 'French', 
      nativeName: 'Français',
      flag: '🇫🇷', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
    { 
      code: 'de', 
      name: 'German', 
      nativeName: 'Deutsch',
      flag: '🇩🇪', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
    { 
      code: 'pt', 
      name: 'Portuguese', 
      nativeName: 'Português',
      flag: '🇵🇹', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
    { 
      code: 'it', 
      name: 'Italian', 
      nativeName: 'Italiano',
      flag: '🇮🇹', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
    { 
      code: 'ja', 
      name: 'Japanese', 
      nativeName: '日本語',
      flag: '🇯🇵', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
    { 
      code: 'zh', 
      name: 'Chinese', 
      nativeName: '中文',
      flag: '🇨🇳', 
      enabled: false, 
      isDefault: false,
      completeness: 0 
    },
  ]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Cambiar idioma por defecto
  const handleSetDefault = (code: string) => {
    setLanguages(prev => prev.map(lang => ({
      ...lang,
      isDefault: lang.code === code
    })));
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

    setLanguages(prev => prev.map(lang => 
      lang.code === code ? { ...lang, enabled: !lang.enabled } : lang
    ));
    setSaveStatus('idle');
  };

  // Guardar configuración
  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // Aquí guardarías la configuración en Firebase/Backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular guardado
      
      // Actualizar idioma actual si es necesario
      const defaultLang = languages.find(l => l.isDefault);
      if (defaultLang) {
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

  return (
    <div className="flex h-screen bg-editor-bg text-editor-text-primary">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden mr-2 transition-colors"
              title={t('common.openMenu')}
            >
              <Menu className="w-4 h-4" />
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
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-500 text-sm mr-2">
              <Check size={16} />
              <span>{t('superadmin.savedSuccessfully')}</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-sm mr-2">
              <AlertCircle size={16} />
              <span>{t('superadmin.errorSaving')}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' ? t('superadmin.saving') : t('common.save')}
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('superadmin.backToAdmin')}
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
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-editor-accent text-white'
                      : 'bg-editor-border text-editor-text-secondary hover:bg-editor-bg-secondary'
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
                            <span className="px-2 py-0.5 bg-editor-accent text-white text-xs rounded-full">
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
                      className="px-3 py-1.5 text-sm bg-editor-accent hover:bg-editor-accent-hover text-white rounded-lg transition-colors"
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
              <button className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors">
                <Upload size={16} />
                {t('superadmin.importTranslations')}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors">
                <Download size={16} />
                {t('superadmin.exportAll')}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-editor-border hover:bg-editor-bg-secondary text-editor-text-primary rounded-lg transition-colors">
                <Edit2 size={16} />
                {t('superadmin.editTranslations')}
              </button>
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
    </div>
  );
};

export default LanguageManagement;

