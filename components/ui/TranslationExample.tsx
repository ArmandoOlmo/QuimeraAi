import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Upload, Mail, User } from 'lucide-react';

/**
 * Componente de Ejemplo - Demostración de i18next
 * 
 * Este componente muestra cómo usar traducciones en diferentes contextos:
 * - Títulos y textos
 * - Botones
 * - Placeholders de inputs
 * - Mensajes de estado
 * - Traducciones con variables
 */

const TranslationExample: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simular guardado
    if (name && email) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const projectCount = 5;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-editor-bg-secondary rounded-xl border border-editor-border">
      {/* Header con idioma actual */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-editor-text-primary">
            {t('common.example', 'Translation Example')}
          </h1>
          <p className="text-sm text-editor-text-secondary mt-1">
            {t('language.changeLanguage')}: <strong>{i18n.language.toUpperCase()}</strong>
          </p>
        </div>
      </div>

      {/* Sección de Profile */}
      <div className="bg-editor-bg p-4 rounded-lg mb-4">
        <h2 className="text-xl font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          {t('dashboard.profile')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Nombre */}
          <div>
            <label className="block text-sm font-medium text-editor-text-secondary mb-2">
              {t('auth.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.fullName')}
              className="w-full px-3 py-2 bg-editor-bg-secondary border border-editor-border rounded-lg text-editor-text-primary focus:ring-2 focus:ring-editor-accent outline-none"
            />
          </div>

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-editor-text-secondary mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterEmail')}
              className="w-full px-3 py-2 bg-editor-bg-secondary border border-editor-border rounded-lg text-editor-text-primary focus:ring-2 focus:ring-editor-accent outline-none"
            />
          </div>

          {/* Mensajes de Estado */}
          {saveStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg">
              {t('messages.saveSuccess')}
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
              {t('messages.saveError')}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent-hover transition-colors"
            >
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setName('');
                setEmail('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-editor-bg-secondary border border-editor-border text-editor-text-secondary rounded-lg hover:text-editor-text-primary hover:bg-editor-border transition-colors"
            >
              <X className="w-4 h-4" />
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>

      {/* Sección de Stats - Ejemplo con variables */}
      <div className="bg-editor-bg p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold text-editor-text-primary mb-3">
          {t('dashboard.overview')}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-editor-bg-secondary p-3 rounded-lg">
            <p className="text-sm text-editor-text-secondary mb-1">
              {t('dashboard.projects')}
            </p>
            <p className="text-2xl font-bold text-editor-accent">
              {projectCount}
            </p>
          </div>
          
          <div className="bg-editor-bg-secondary p-3 rounded-lg">
            <p className="text-sm text-editor-text-secondary mb-1">
              {t('cms.published')}
            </p>
            <p className="text-2xl font-bold text-green-500">
              3
            </p>
          </div>
        </div>
      </div>

      {/* Sección de Acciones */}
      <div className="bg-editor-bg p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-editor-text-primary mb-3">
          {t('dashboard.quickActions')}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-editor-bg-secondary border border-editor-border rounded-lg hover:bg-editor-border transition-colors text-left">
            <Upload className="w-5 h-5 text-editor-accent" />
            <div>
              <p className="text-sm font-medium text-editor-text-primary">
                {t('common.upload')}
              </p>
              <p className="text-xs text-editor-text-secondary">
                {t('dashboard.assets')}
              </p>
            </div>
          </button>

          <button className="flex items-center gap-2 px-4 py-3 bg-editor-bg-secondary border border-editor-border rounded-lg hover:bg-editor-border transition-colors text-left">
            <User className="w-5 h-5 text-editor-accent" />
            <div>
              <p className="text-sm font-medium text-editor-text-primary">
                {t('dashboard.team')}
              </p>
              <p className="text-xs text-editor-text-secondary">
                {t('dashboard.members')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Info sobre traducciones */}
      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-400">
          💡 <strong>Tip:</strong> {i18n.language === 'es' 
            ? 'Cambia el idioma usando el selector en el header para ver las traducciones en acción.'
            : 'Switch the language using the selector in the header to see the translations in action.'}
        </p>
      </div>
    </div>
  );
};

export default TranslationExample;

